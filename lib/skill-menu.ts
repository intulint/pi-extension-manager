/**
 * /skills — меню управления скиллами.
 *
 * Делегирует общую TUI-логику в registerSettingsMenu().
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildSkillList, saveSkillList } from "./settings.js";
import { registerSettingsMenu } from "./settings-menu.js";

export function registerSkillMenu(pi: ExtensionAPI): void {
  registerSettingsMenu(pi, {
    commandName: "skills",
    description: "Enable/disable skills (requires /reload)",
    headerTitle: "Skill Manager",
    emptyMessage: "No skills configured",
    changedLabel: "skill(s) toggled",
    buildItems: () => buildSkillList(),
    saveItems: (items) => saveSkillList(items),
  });
}
