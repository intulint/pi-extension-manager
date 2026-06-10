/**
 * Settings helpers — чтение/запись settings.json и сбор данных.
 */

import fs from "node:fs";
import path from "node:path";

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

export interface SettingsPaths {
  user: string;
  project: string;
}

// ── File I/O ─────────────────────────────────────────────────────────────────

export function readSettingsFile(file: string): Record<string, unknown> {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

export function writeSettingsFile(file: string, data: Record<string, unknown>): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

// ── Paths ────────────────────────────────────────────────────────────────────

export function getSettingsPaths(): SettingsPaths {
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
  return item.replace(/^-/, "");
}

function labelFromSource(src: string): string {
  const cleaned = src
    .replace(/^npm:/, "")
    .replace(/^git:/, "")
    .replace(/^https?:\/\//, "");
  return cleaned.split("/").pop() || cleaned;
}

function getActiveSettings(): { settings: Record<string, unknown>; hasProject: boolean } {
  const paths = getSettingsPaths();
  const projSettings = readSettingsFile(paths.project);
  const hasProject = fs.existsSync(paths.project);
  return { settings: hasProject ? projSettings : readSettingsFile(paths.user), hasProject };
}

// ── Build lists ──────────────────────────────────────────────────────────────

/**
 * Собирает расширения (extensions) и пакеты (packages) в один список.
 */
export function buildExtPackageList(): ExtPackageItem[] {
  const { settings } = getActiveSettings();

  const extensions = (settings["extensions"] as string[]) || [];
  const packages = (settings["packages"] as string[]) || [];

  const result: ExtPackageItem[] = [];

  for (const ext of extensions) {
    const base = getBase(ext);
    result.push({
      raw: base,
      enabled: !isDisabled(ext),
      displayName: labelFromSource(base),
      type: "extension",
    });
  }

  for (const pkg of packages) {
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
 * Собирает скиллы из ключа skills.
 */
export function buildSkillList(): SkillItem[] {
  const { settings } = getActiveSettings();
  const skills = (settings["skills"] as string[]) || [];

  return skills.map((skillPath) => ({
    raw: skillPath,
    enabled: true,
    displayName: path.basename(skillPath),
  }));
}

// ── Save ─────────────────────────────────────────────────────────────────────

/**
 * Сохраняет список расширений/пакетов в settings.json.
 * Отключённые помечаются префиксом "-".
 */
export function saveExtPackageList(items: ExtPackageItem[]): void {
  const paths = getSettingsPaths();
  const { hasProject } = getActiveSettings();

  const target = hasProject ? paths.project : paths.user;
  const file = hasProject ? readSettingsFile(paths.project) : readSettingsFile(paths.user);

  const extOutput: string[] = [];
  const pkgOutput: string[] = [];

  for (const item of items) {
    const entry = item.enabled ? item.raw : `-${item.raw}`;
    if (item.type === "extension") extOutput.push(entry);
    else pkgOutput.push(entry);
  }

  (file as any)["extensions"] = extOutput;
  (file as any)["packages"] = pkgOutput;

  writeSettingsFile(target, file);
}

/**
 * Сохраняет список скиллов в settings.json.
 */
export function saveSkillList(items: SkillItem[]): void {
  const paths = getSettingsPaths();
  const { hasProject } = getActiveSettings();

  const target = hasProject ? paths.project : paths.user;
  const file = hasProject ? readSettingsFile(paths.project) : readSettingsFile(paths.user);

  const skillOutput: string[] = items.map((item) => (item.enabled ? item.raw : `-${item.raw}`));

  (file as any)["skills"] = skillOutput;

  writeSettingsFile(target, file);
}
