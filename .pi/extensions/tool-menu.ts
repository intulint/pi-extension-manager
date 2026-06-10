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

  function restoreState(ctx: ExtensionContext) {
    allTools = pi.getAllTools();
    enabledTools = new Set(pi.getActiveTools());

    const branch = ctx.sessionManager.getBranch();
    for (const entry of branch) {
      if (entry.type === "custom" && entry.customType === "ext-manager-tools") {
        const data = entry.data as { enabledTools: string[] } | undefined;
        if (data?.enabledTools) {
          const allNames = allTools.map((t) => t.name);
          enabledTools = new Set(data.enabledTools.filter((t) => allNames.includes(t)));
          pi.setActiveTools(Array.from(enabledTools));
        }
      }
    }
  }

  function persistTools() {
    pi.appendEntry("ext-manager-tools", { enabledTools: Array.from(enabledTools) });
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
