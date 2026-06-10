/**
 * /extensions — меню управления расширениями и пакетами.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { Container, SettingsList } from "@earendil-works/pi-tui";
import { buildExtPackageList, saveExtPackageList, type ExtPackageItem } from "./settings.js";

export function registerExtensionMenu(pi: ExtensionAPI): void {
  pi.registerCommand("extensions", {
    description: "Enable/disable extensions and packages (requires /reload)",
    handler: async (_args, ctx) => {
      const items = buildExtPackageList();
      if (items.length === 0) {
        ctx.ui.notify("No extensions or packages configured", "warning");
        return;
      }

      const settingItems = items.map((item) => ({
        id: item.raw,
        label: item.displayName,
        description: item.type === "extension" ? "Extension" : "Package",
        currentValue: item.enabled ? "enabled" : "disabled",
        values: ["enabled", "disabled"],
      }));

      // Local state for the session
      for (const item of items) {
        item._localEnabled = item.enabled;
      }

      ctx.ui.custom((tui, theme, _kb, done) => {
        const container = new Container();
        container.addChild(
          new (class {
            render(_w: number) {
              return [theme.fg("accent", theme.bold("Extension & Package Manager")), ""];
            }
            invalidate() {}
          })(),
        );

        const settingsList = new SettingsList(
          settingItems,
          Math.min(settingItems.length + 2, 20),
          getSettingsListTheme(),
          (id, newValue) => {
            const enabled = newValue === "enabled";

            const setting = settingItems.find((s) => s.id === id);
            if (setting) setting.currentValue = newValue;

            for (const item of items) {
              if (item.raw === id) {
                item._localEnabled = enabled;
                break;
              }
            }
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

      // Save changes after UI closes
      const toggled = items.filter(
        (i) => i._localEnabled !== undefined && i._localEnabled !== i.enabled
      ).length;

      saveExtPackageList(items);

      ctx.ui.notify(
        toggled > 0 ? `${toggled} item(s) toggled. Run /reload to apply.` : "No changes made",
        toggled > 0 ? "info" : "warning",
      );
    },
  });
}
