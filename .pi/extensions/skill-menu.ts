/**
 * /skills — меню управления скиллами.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { Container, SettingsList } from "@earendil-works/pi-tui";
import { buildSkillList, saveSkillList, type SkillItem } from "./settings.js";

export function registerSkillMenu(pi: ExtensionAPI): void {
  pi.registerCommand("skills", {
    description: "Enable/disable skills (requires /reload)",
    handler: async (_args, ctx) => {
      const items = buildSkillList();
      if (items.length === 0) {
        ctx.ui.notify("No skills configured", "warning");
        return;
      }

      const settingItems = items.map((item) => ({
        id: item.raw,
        label: item.displayName,
        description: item.raw,
        currentValue: item.enabled ? "enabled" : "disabled",
        values: ["enabled", "disabled"],
      }));

      for (const item of items) {
        item._localEnabled = item.enabled;
      }

      ctx.ui.custom((tui, theme, _kb, done) => {
        const container = new Container();
        container.addChild(
          new (class {
            render(_w: number) {
              return [theme.fg("accent", theme.bold("Skill Manager")), ""];
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

      const toggled = items.filter(
        (i) => i._localEnabled !== undefined && i._localEnabled !== i.enabled
      ).length;

      saveSkillList(items);

      ctx.ui.notify(
        toggled > 0 ? `${toggled} skill(s) toggled. Run /reload to apply.` : "No changes made",
        toggled > 0 ? "info" : "warning",
      );
    },
  });
}
