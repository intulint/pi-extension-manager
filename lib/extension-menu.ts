/**
 * /extensions — меню управления расширениями и пакетами.
 *
 * Делегирует общую TUI-логику в registerSettingsMenu().
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildExtPackageList, saveExtPackageList } from "./settings.js";
import { registerSettingsMenu } from "./settings-menu.js";

export function registerExtensionMenu(pi: ExtensionAPI): void {
  registerSettingsMenu(pi, {
    commandName: "extensions",
    description: "Enable/disable extensions and packages (requires /reload)",
    headerTitle: "Extension & Package Manager",
    emptyMessage: "No extensions or packages configured",
    changedLabel: "item(s) toggled",
    buildItems: () => buildExtPackageList(),
    saveItems: (items) => saveExtPackageList(items),
  });
}
