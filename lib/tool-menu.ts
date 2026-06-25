/**
 * /tools — меню управления инструментами (runtime, без перезагрузки).
 *
 * Состояние хранится в двух местах:
 * 1. Сессия (appendEntry) — для /tree-навигации в рамках одной сессии
 * 2. Глобальный файл ~/.pi/agent/tools-config.json — между сессиями
 *
 * Приоритет восстановления: сессия > глобальный конфиг > все включены
 */

import fs from "node:fs";
import path from "node:path";
import type { ExtensionAPI, ExtensionContext, ToolInfo } from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { Container, SettingsList } from "@earendil-works/pi-tui";
import { DEFAULT_MAX_VISIBLE } from "./settings.js";

// ── Global config ────────────────────────────────────────────────────────────

const GLOBAL_TOOLS_CONFIG_PATH = path.join(
  process.env.HOME || "/",
  ".pi",
  "agent",
  "tools-config.json",
);

interface GlobalToolsConfig {
  enabledTools: string[];
}

function loadGlobalToolsConfig(): string[] | undefined {
  try {
    if (!fs.existsSync(GLOBAL_TOOLS_CONFIG_PATH)) return undefined;
    const data = JSON.parse(fs.readFileSync(GLOBAL_TOOLS_CONFIG_PATH, "utf-8")) as GlobalToolsConfig;
    return data.enabledTools;
  } catch {
    return undefined;
  }
}

function saveGlobalToolsConfig(enabled: string[]): void {
  try {
    fs.writeFileSync(
      GLOBAL_TOOLS_CONFIG_PATH,
      JSON.stringify({ enabledTools: enabled } as GlobalToolsConfig, null, 2) + "\n",
    );
  } catch {
    // Silently fail — state is still in session memory
  }
}

// ── Extension ────────────────────────────────────────────────────────────────

export function registerToolMenu(pi: ExtensionAPI): void {
  let allTools: ToolInfo[] = [];
  let enabledTools: Set<string> = new Set();

  // ── State types ──────────────────────────────────────────────────────────

  interface ToolsState {
    enabledTools: string[];
    allToolsSnapshot: string[];
  }

  // ── Merge saved set into enabledTools ────────────────────────────────────

  function applyMerged(savedState: ToolsState) {
    const allNames = allTools.map((t) => t.name);
    const savedSet = new Set(savedState.enabledTools.filter((t) => allNames.includes(t)));
    const oldTools = savedState.allToolsSnapshot
      ? new Set(savedState.allToolsSnapshot)
      : new Set<string>();

    enabledTools = new Set<string>();
    for (const name of allNames) {
      if (savedSet.has(name)) {
        enabledTools.add(name);
      } else if (oldTools.has(name)) {
        // Was disabled by user → keep disabled
      } else {
        // NEW tool (didn't exist when state was saved) → enable by default
        enabledTools.add(name);
      }
    }

    pi.setActiveTools(Array.from(enabledTools));
  }

  // ── Restore state ────────────────────────────────────────────────────────

  function restoreState(ctx: ExtensionContext) {
    allTools = pi.getAllTools();
    const allNames = allTools.map((t) => t.name);

    // 1. Try session entries first (for current session / tree navigation).
    // Use getBranch() — NOT getEntries() — to keep tool state isolated per branch.
    const allEntries = ctx.sessionManager.getBranch();
    let savedState: ToolsState | undefined;
    for (const entry of allEntries) {
      if (entry.type === "custom" && entry.customType === "ext-manager-tools") {
        const data = entry.data as ToolsState | undefined;
        if (data?.enabledTools) {
          savedState = data;
        }
      }
    }

    if (savedState) {
      applyMerged(savedState);
      return;
    }

    // 2. Fallback to global config (cross-session persistence)
    const globalEnabled = loadGlobalToolsConfig();
    if (globalEnabled) {
      const validTools = globalEnabled.filter((t) => allNames.includes(t));
      enabledTools = new Set(validTools);
      pi.setActiveTools(Array.from(enabledTools));
      return;
    }

    // 3. No saved state at all — sync with current defaults
    enabledTools = new Set(pi.getActiveTools());
  }

  // ── Persist: session (appendEntry) + global config ──────────────────────

  function persistTools() {
    const enabled = Array.from(enabledTools);
    const allToolsSnapshot = allTools.map((t) => t.name);

    // Save to session for tree navigation
    pi.appendEntry<ToolsState>("ext-manager-tools", {
      enabledTools: enabled,
      allToolsSnapshot,
    });

    // Save to global config for cross-session persistence
    saveGlobalToolsConfig(enabled);
  }

  // ── Session events ───────────────────────────────────────────────────────

  pi.on("session_start", (_event, ctx) => restoreState(ctx));
  pi.on("session_tree", (_event, ctx) => restoreState(ctx));

  // ── Command ──────────────────────────────────────────────────────────────

  pi.registerCommand("tools", {
    description: "Enable/disable tools at runtime",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/tools requires TUI mode", "error");
        return;
      }

      allTools = pi.getAllTools();
      // Refresh enabledTools from current active tools (not stale module-level value)
      enabledTools = new Set(pi.getActiveTools());
      if (allTools.length === 0) {
        ctx.ui.notify("No tools registered", "warning");
        return;
      }

      const settingItems = allTools.map((tool) => ({
        id: tool.name,
        label: tool.name,
        description: tool.description || "",
        currentValue: enabledTools.has(tool.name) ? "enabled" : "disabled",
        values: ["enabled", "disabled"],
      }));

      await ctx.ui.custom((tui, theme, _kb, done) => {
        const container = new Container();
        container.addChild(
          new (class {
            render(_w: number) {
              return [
                theme.fg("accent", theme.bold("Tool Manager")),
                `Active: ${enabledTools.size}/${allTools.length} tools`,
                "",
              ];
            }
            invalidate() {}
          })(),
        );

        const settingsList = new SettingsList(
          settingItems,
          DEFAULT_MAX_VISIBLE,
          getSettingsListTheme(),
          (id, newValue) => {
            if (newValue === "enabled") enabledTools.add(id);
            else enabledTools.delete(id);

            pi.setActiveTools(Array.from(enabledTools));
            // Persist every toggle so state survives crashes and cross-session
            persistTools();

            const setting = settingItems.find((s) => s.id === id);
            if (setting) setting.currentValue = newValue;

            // Force re-render to show updated count
            tui.requestRender();
          },
          () => {
            // Extra persist on close for safety
            persistTools();
            done(undefined);
          },
        );

        container.addChild(settingsList);

        return {
          render(w: number) {
            return container.render(w);
          },
          invalidate() {
            container.invalidate();
          },
          handleInput(data: string) {
            settingsList.handleInput?.(data);
            tui.requestRender();
          },
        };
      });
    },
  });
}
