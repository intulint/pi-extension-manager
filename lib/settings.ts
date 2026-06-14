/**
 * Settings helpers — чтение/запись settings.json и сбор данных.
 */

import fs from "node:fs";
import path from "node:path";

// ── Constants ────────────────────────────────────────────────────────────────

/** Default maximum visible items in TUI SettingsList. */
export const DEFAULT_MAX_VISIBLE = 20;

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExtPackageItem {
  raw: string;
  enabled: boolean;
  displayName: string;
  type: "extension" | "package";
  _localEnabled?: boolean;
}

export interface SkillItem {
  raw: string;
  enabled: boolean;
  displayName: string;
  _localEnabled?: boolean;
}

// ── File I/O ─────────────────────────────────────────────────────────────────

export function readSettingsFile(file: string): Record<string, unknown> {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (err) {
    console.error(`[pi-extension-manager] Failed to parse settings file: ${file}`, err);
    return {};
  }
}

export function writeSettingsFile(file: string, data: Record<string, unknown>): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

// ── Paths ────────────────────────────────────────────────────────────────────

export function getSettingsPaths(): { user: string; project: string } {
  return {
    user: path.join(process.env.HOME || "/", ".pi", "agent", "settings.json"),
    project: path.join(process.cwd(), ".pi", "settings.json"),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isDisabled(item: string): boolean {
  return item.startsWith("-");
}

function getBase(item: string): string {
  return item.replace(/^-+/, "");
}

function labelFromSource(src: string): string {
  const cleaned = src
    .replace(/^npm:/, "")
    .replace(/^git:/, "")
    .replace(/^https?:\/\//, "");
  return cleaned.split("/").pop() || cleaned;
}

/**
 * Определяет текущий settings файл (user или project).
 * User settings — всегда доступны. Project — если существует.
 */
function getActiveSettingsFile(): { target: string; hasProject: boolean } {
  const paths = getSettingsPaths();
  const hasProject = fs.existsSync(paths.project);
  return {
    target: hasProject ? paths.project : paths.user,
    hasProject,
  };
}

// ── Build lists ──────────────────────────────────────────────────────────────

/**
 * Собирает расширения (extensions) и пакеты (packages) ИЗ ОБОИХ файлов.
 * Сначала user, потом project. Project значения имеют приоритет.
 */
export function buildExtPackageList(): ExtPackageItem[] {
  const paths = getSettingsPaths();
  const userSettings = readSettingsFile(paths.user);
  const projSettings = readSettingsFile(paths.project);

  const userExts = (userSettings["extensions"] as string[]) || [];
  const userPkgs = (userSettings["packages"] as string[]) || [];
  const projExts = (projSettings["extensions"] as string[]) || [];
  const projPkgs = (projSettings["packages"] as string[]) || [];

  // Project значения имеют приоритет (перезаписывают user)
  const allExts = [...userExts];
  for (const ext of projExts) {
    const base = getBase(ext);
    const idx = allExts.findIndex(e => getBase(e) === base);
    if (idx !== -1) allExts.splice(idx, 1);
    allExts.push(ext);
  }

  const allPkgs = [...userPkgs];
  for (const pkg of projPkgs) {
    const base = getBase(pkg);
    const idx = allPkgs.findIndex(p => getBase(p) === base);
    if (idx !== -1) allPkgs.splice(idx, 1);
    allPkgs.push(pkg);
  }

  const result: ExtPackageItem[] = [];

  for (const ext of allExts) {
    const base = getBase(ext);
    result.push({
      raw: base,
      enabled: !isDisabled(ext),
      displayName: labelFromSource(base),
      type: "extension",
    });
  }

  for (const pkg of allPkgs) {
    const base = getBase(pkg);
    result.push({
      raw: base,
      enabled: !isDisabled(pkg),
      displayName: labelFromSource(base),
      type: "package",
    });
  }

  return result;
}

/**
 * Собирает скиллы ИЗ ОБОИХ файлов (user + project).
 */
export function buildSkillList(): SkillItem[] {
  const paths = getSettingsPaths();
  const userSettings = readSettingsFile(paths.user);
  const projSettings = readSettingsFile(paths.project);
  const userSkills = (userSettings["skills"] as string[]) || [];
  const projSkills = (projSettings["skills"] as string[]) || [];

  // Project скиллы имеют приоритет (перезаписывают user)
  const allSkills = [...userSkills];
  for (const skill of projSkills) {
    const base = getBase(skill);
    const idx = allSkills.findIndex(s => getBase(s) === base);
    if (idx !== -1) allSkills.splice(idx, 1);
    allSkills.push(skill);
  }

  return allSkills.map((skillPath) => ({
    raw: getBase(skillPath),
    enabled: !isDisabled(skillPath),
    displayName: path.basename(getBase(skillPath)),
  }));
}

// ── Save ─────────────────────────────────────────────────────────────────────

/**
 * Сохраняет список расширений/пакетов.
 * Обновляет ТОЛЬКО extensions и packages ключи, остальное нетронутым.
 */
export function saveExtPackageList(items: ExtPackageItem[]): void {
  if (items.length === 0) return;

  const { target } = getActiveSettingsFile();
  const file = readSettingsFile(target);

  const extOutput: string[] = [];
  const pkgOutput: string[] = [];

  for (const item of items) {
    // Приоритет: _localEnabled (из UI), иначе enabled
    const enabled = item._localEnabled ?? item.enabled;
    const cleanRaw = getBase(item.raw);
    const entry = enabled ? cleanRaw : `-${cleanRaw}`;
    if (item.type === "extension") extOutput.push(entry);
    else pkgOutput.push(entry);
  }

  (file as Record<string, string[]>)["extensions"] = extOutput;
  (file as Record<string, string[]>)["packages"] = pkgOutput;

  writeSettingsFile(target, file);
}

/**
 * Сохраняет список скиллов.
 * Обновляет ТОЛЬКО skills ключ, остальное нетронутым.
 */
export function saveSkillList(items: SkillItem[]): void {
  if (items.length === 0) return;

  const { target } = getActiveSettingsFile();
  const file = readSettingsFile(target);

  const skillOutput: string[] = items.map((item) => {
    const enabled = item._localEnabled ?? item.enabled;
    const cleanRaw = getBase(item.raw);
    return enabled ? cleanRaw : `-${cleanRaw}`;
  });

  (file as Record<string, string[]>)["skills"] = skillOutput;

  writeSettingsFile(target, file);
}
