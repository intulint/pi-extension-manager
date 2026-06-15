/**
 * Shared TUI builder for persistent settings commands (/extensions, /skills).
 * Устраняет дублирование между extension-menu.ts и skill-menu.ts.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { Container, SettingsList } from "@earendil-works/pi-tui";
import { DEFAULT_MAX_VISIBLE, type BaseSettingsItem } from "./settings.js";

// ── Options ──────────────────────────────────────────────────────────────────

export interface SettingsMenuOptions<T extends BaseSettingsItem> {
  /** Имя команды (например "extensions", "skills") */
  commandName: string;
  /** Описание команды для регистрации */
  description: string;
  /** Заголовок в TUI */
  headerTitle: string;
  /** Сообщение для пустого списка */
  emptyMessage: string;
  /** Текст "n <что> toggled" (например "item(s)", "skill(s)") */
  changedLabel: string;
  /** Функция сборки элементов */
  buildItems: () => T[];
  /** Функция сохранения элементов */
  saveItems: (items: T[]) => void;
}

// ── Generic registrar ────────────────────────────────────────────────────────

export function registerSettingsMenu<T extends BaseSettingsItem>(
  pi: ExtensionAPI,
  opts: SettingsMenuOptions<T>,
): void {
  pi.registerCommand(opts.commandName, {
    description: opts.description,
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify(`/${opts.commandName} requires TUI mode`, "error");
        return;
      }

      const items = opts.buildItems();
      if (items.length === 0) {
        ctx.ui.notify(opts.emptyMessage, "warning");
        return;
      }

      const settingItems = items.map((item) => ({
        id: item.raw,
        label: item.displayName,
        description: item.description,
        currentValue: item.enabled ? "enabled" : "disabled",
        values: ["enabled", "disabled"],
      }));

      for (const item of items) {
        item._localEnabled = item.enabled;
      }

      await ctx.ui.custom((tui, theme, _kb, done) => {
        const container = new Container();
        container.addChild(
          new (class {
            render(_w: number) {
              return [theme.fg("accent", theme.bold(opts.headerTitle)), ""];
            }
            invalidate() {}
          })(),
        );

        const settingsList = new SettingsList(
          settingItems,
          DEFAULT_MAX_VISIBLE,
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
        (i) => i._localEnabled !== undefined && i._localEnabled !== i.enabled,
      ).length;

      if (toggled > 0) {
        opts.saveItems(items);
        ctx.ui.notify(`${toggled} ${opts.changedLabel}. Run /reload to apply.`, "info");
      } else {
        ctx.ui.notify("No changes made", "warning");
      }
    },
  });
}
