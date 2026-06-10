/**
 * Extension Manager
 *
 * Интерактивные меню для управления расширениями, пакетами, скиллами и инструментами.
 *
 * Команды:
 *   /extensions  — расширения + пакеты (требует /reload)
 *   /skills      — скиллы (требует /reload)
 *   /tools       — инструменты (runtime, без перезагрузки)
 *
 * Горячие клавиши:
 *   Ctrl+Shift+E  → /extensions
 *   Ctrl+Shift+S  → /skills
 *   Ctrl+Shift+T  → /tools
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { registerExtensionMenu } from "./lib/extension-menu.js";
import { registerSkillMenu } from "./lib/skill-menu.js";
import { registerToolMenu } from "./lib/tool-menu.js";
import { registerShortcuts } from "./lib/shortcuts.js";

export default function (pi: ExtensionAPI) {
  registerExtensionMenu(pi);
  registerSkillMenu(pi);
  registerToolMenu(pi);
  registerShortcuts(pi);
}
