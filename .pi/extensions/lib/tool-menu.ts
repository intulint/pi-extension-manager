/**
 * /tools — меню управления инструментами (runtime, без перезагрузки).
 */

import type { ExtensionAPI, ExtensionContext, ToolInfo } from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { Container, SettingsList } from "@earendil-works/pi-tui";

export function registerToolMenu(pi: ExtensionAPI): void {
  let allTools: ToolInfo[] = [];
  let enabledTools: Set<string> = new Set();

  // ── Restore state from session history ───────────────────────────────────

  interface ToolsState {
    enabledTools: string[];
    allToolsSnapshot: string[];
  }

  function restoreState(ctx: ExtensionContext) {
    allTools = pi.getAllTools();
    const allNames = allTools.map((t) => t.name);

    // Find the LAST saved state from session history
    const branch = ctx.sessionManager.getBranch();
    let savedState: ToolsState | undefined;
    for (const entry of branch) {
      if (entry.type === "custom" && entry.customType === "ext-manager-tools") {
        const data = entry.data as ToolsState | undefined;
        if (data?.enabledTools) {
          savedState = data;
        }
      }
    }

    if (savedState) {
      const savedSet = new Set(savedState.enabledTools.filter((t) => allNames.includes(t)));
      const oldTools = savedState.allToolsSnapshot
        ? new Set(savedState.allToolsSnapshot)
        : new Set<string>();

      // MERGE: start from all current tools, apply saved preferences
      enabledTools = new Set<string>();
      for (const name of allNames) {
        if (savedSet.has(name)) {
          // Tool was enabled in saved state → enable
          enabledTools.add(name);
        } else if (oldTools.has(name)) {
          // Tool existed when saved, but was disabled by user → keep disabled
          // (don't add to enabledTools)
        } else {
          // NEW tool (didn't exist when state was saved) → enable by default
          enabledTools.add(name);
        }
      }

      pi.setActiveTools(Array.from(enabledTools));
    } else {
      // No saved state — sync with currently active tools
      enabledTools = new Set(pi.getActiveTools());
    }
  }

  function persistTools() {
    const allToolsSnapshot = allTools.map((t) => t.name);
    pi.appendEntry<ToolsState>("ext-manager-tools", {
      enabledTools: Array.from(enabledTools),
      allToolsSnapshot,
    });
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

      ctx.ui.custom((tui, theme, _kb, done) => {
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
          Math.min(settingItems.length + 2, 20),
          getSettingsListTheme(),
          (id, newValue) => {
            if (newValue === "enabled") enabledTools.add(id);
            else enabledTools.delete(id);

            pi.setActiveTools(Array.from(enabledTools));
            persistTools();

            const setting = settingItems.find((s) => s.id === id);
            if (setting) setting.currentValue = newValue;
          },
          () => done(undefined),
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
