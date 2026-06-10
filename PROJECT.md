# pi-extension-manager — Проектный файл

## Описание

Интерактивное расширение для **pi-coding-agent** — подменю для управления
расширениями, пакетами, скиллами и инструментами.

## Текущая структура

```
pi-extension-manager/
├── README.md
└── .pi/
    └── extensions/
        ├── index.ts              ← точка входа (экспортирует default function)
        └── lib/                  ← helpers (не сканируются pi)
            ├── settings.ts       ← I/O settings.json + build/save функции
            ├── extension-menu.ts ← /extensions
            ├── skill-menu.ts     ← /skills
            ├── tool-menu.ts      ← /tools
            └── shortcuts.ts      ← горячие клавиши
```

## Текущий статус

- [x] Базовая структура проекта
- [x] Три команды: `/extensions`, `/skills`, `/tools`
- [x] Горячие клавиши: Ctrl+Shift+E/S/T
- [x] Модульная структура (index.ts + lib/)
- [ ] **Баг: /extensions и /skills не сохраняют изменения** ← КРИТИЧНО
- [ ] **Баг: /tools работает, но возможно тоже с проблемой**
- [ ] Документация README обновлена

---

## КРИТИЧЕСКИЕ БАГИ

### Баг 1: Toggle callback не срабатывает (extensions / skills)

**Симптом:** Окна открываются, элементы отображаются, но переключение
не сохраняет изменения. После `/reload` всё как было.

**Диагноз:** `ctx.ui.custom((tui, theme, _kb, done) => ...)` возвращает управление
ДО того как `done()` вызывается. Save-логика выполняется сразу после `ctx.ui.custom()`,
когда `items._localEnabled` ещё не установлен.

**Механизм ошибки:**

```typescript
// В extension-menu.ts и skill-menu.ts:
ctx.ui.custom((tui, theme, _kb, done) => {
  // ...
  const settingsList = new SettingsList(
    settingItems,
    Math.min(settingItems.length + 2, 20),
    getSettingsListTheme(),
    (id, newValue) => {
      // ← Этот колбэк МЕНЯЕТ items, но НЕ вызывает done()
      item._localEnabled = enabled;
    },
    () => done(undefined),  // ← done() вызывается ТОЛЬКО при закрытии
  );
  // ...
});

// ← ctx.ui.custom() возвращает СЮДА (до закрытия UI)
// ← Save выполняется с ИСХОДНЫМИ значениями items._localEnabled === undefined
saveExtPackageList(items);
```

**Решение:** Обернуть `ctx.ui.custom()` в Promise, который resolve-ится
только когда `done()` вызовется.

### Баг 2: SettingsList — неправильный порядок параметров onClose

**Симптом:** Возможно, onClose callback вообще не вызывается.

**Диагноз:** В pi-tui `SettingsList` принимает onClose как 5-й параметр
и опции как 6-й. Код передаёт:
```typescript
// 5-й: onClose = () => done(undefined)  ✓
// 6-й: опции = undefined                ✗ (должно быть {})
```

Если pi-tui ожидает объект в 6-м параметре, `undefined` может вызвать
ошибку или игнорирование onClose.

**Решение:** Передавать `{}` как 6-й параметр:
```typescript
new SettingsList(
  settingItems,
  Math.min(settingItems.length + 2, 20),
  getSettingsListTheme(),
  (id, newValue) => { /* onChange */ },
  () => done(undefined),
  {},  // ← пустой объект опций
);
```

### Баг 3: buildExtPackageList читает только user settings

**Симптом:** Если у пользователя есть расширения в project settings,
они не отображаются.

**Диагноз:** `buildExtPackageList()` читает ТОЛЬКО `~/.pi/agent/settings.json`:
```typescript
const userSettings = readSettingsFile(paths.user);
const extensions = (userSettings["extensions"] as string[]) || [];
// ✗ projSettings читается, но НЕ используется
```

**Решение:** Считывать из обоих файлов (user + project) и объединять.

---

## Как работает pi (важно понимать)

### Загрузка расширений

Пи сканирует `.pi/extensions/` директорию:
1. Ищет `index.ts` или `package.json` → если нашёл, использует только их (smart discovery)
2. Если нет → сканирует ВСЕ `.ts`/`.js` файлы

**Следствие:** Все хелперы должны быть в подпапке (`lib/`), иначе pi
попытается загрузить их как расширения и выдаст ошибку.

### Формат settings.json

```jsonc
{
  "extensions": ["путь/к/расширению.ts", "-путь/к/disable.ext"],  // "-" = disabled
  "packages": ["npm:pi-subagents", "-git:github.com/user/repo"],  // "-" = disabled
  "skills": ["/path/to/skill", "-/path/to/disable"]               // "-" = disabled
}
```

Пи использует `-` prefix для отключения через `isEnabledByOverrides()`:
- `-path` → force-exclude exact path (disabled)
- `!pattern` → exclude matching paths (disabled)
- `+path` → force-include exact path (enabled, overrides exclusion)

### Как pi управляет расширенными настройками

- `settingsManager.getExtensionPaths()` → читает `settings.extensions`
- `settingsManager.setExtensionPaths(paths)` → записывает в `settings.extensions`
- `settingsManager.getSkillPaths()` → читает `settings.skills`
- `settingsManager.setSkillPaths(paths)` → записывает в `settings.skills`
- `settingsManager.getPackages()` → читает `settings.packages`
- `settingsManager.setPackages(packages)` → записывает в `settings.packages`

**Важно:** Пи НЕ использует `_disabled` флаги в JSON — только `-` префикс
для строк. Объекты с `_disabled` не используются.

---

## Тест-кейсы для проверки

### /tools (работает)
- [ ] Открыть `/tools`
- [ ] Переключить 1-2 инструмента
- [ ] Убедиться что `Active: X/Y tools` обновляется
- [ ] Закрыть UI
- [ ] Открыть `/tools` снова → состояние сохранилось

### /extensions (не работает)
- [ ] Открыть `/extensions` → отображаются пакеты из settings.json
- [ ] Переключить 1-2 пакета
- [ ] Закрыть UI
- [ ] Проверить `~/.pi/agent/settings.json` → packages обновлены с `-`
- [ ] Выполнить `/reload` → изменения применились

### /skills (не работает)
- [ ] Открыть `/skills` → отображаются скиллы из settings.json
- [ ] Переключить 1-2 скилла
- [ ] Закрыть UI
- [ ] Проверить `~/.pi/agent/settings.json` → skills обновлены с `-`
- [ ] Выполнить `/reload` → изменения применились

---

## Полезные ссылки на документацию

### pi-coding-agent TUI API
- **Документация TUI:** `~/.nvm/versions/node/v24.14.0/lib/node_modules/@earendil-works/pi-coding-agent/docs/tui.md`
- **Исходники pi-tui:** `~/.nvm/versions/node/v24.14.0/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui/`

### Примеры использования SettingsList
- **Пример Tools:** `~/.nvm/versions/node/v24.14.0/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/tools.ts`
- **Пример SelectList:** `~/.nvm/versions/node/v24.14.0/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/preset.ts`

### Исходный код pi (для понимания)
- **SettingsManager:** `~/.nvm/versions/node/v24.14.0/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/settings-manager.js`
  - Методы: `getExtensionPaths`, `setExtensionPaths`, `setPackages`, `setSkillPaths`
- **Package Manager (auto-discovery):** `~/.nvm/versions/node/v24.14.0/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/package-manager.js`
  - Функция `resolveExtensionEntries()` — как pi ищет расширения
  - Функция `isEnabledByOverrides()` — как pi обрабатывает `-`/`!`/`+` префиксы
- **Resource Loader (загрузка расширений):** `~/.nvm/versions/node/v24.14.0/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/resource-loader.js`
  - Функция `getEnabledResources()` — фильтрация включённых ресурсов
  - Функция `loadExtensions()` — загрузка расширений из файлов

### Текущие настройки пользователя
- **settings.json:** `~/.pi/agent/settings.json`
  - packages: 4 пакета (pi-local-model, pi-subagents, pi-llama, pi-websearch)
  - skills: 3 скилла (create-skill, local-llm-config, workspace-catalog)
  - extensions: пустой массив
- **extensions dir:** `~/.pi/agent/extensions/` (пустая)
- **project settings:** `~/.pi/settings.json` не существует

---

## Планы действий

### P0 — Критично (блокирует работу)
1. **[Баг 1]** Починить save логику: обернуть ctx.ui.custom() в Promise
2. **[Баг 2]** Передать `{}` вместо `undefined` в 6-й параметр SettingsList

### P1 — Важно
3. **[Баг 3]** Исправить buildExtPackageList — читать из user + project
4. **[Тест]** Добавить тесты для всех трёх команд

### P2 — Желательно
5. Добавить логирование для отладки (PI_DEBUG=1)
6. Добавить валидацию путей перед сохранением
7. Поддержка объекта `{source: "...", _disabled: true}` для расширений

### P3 — Улучшения
8. Фильтрация/поиск по списку
9. Группировка по типу (extensions vs packages)
10. Экспорт в npm-пакет

---

## Команды

```bash
# Посмотреть текущий стейт
cd /home/test/workspace/pi-projects/pi-extension-manager
git log --oneline
cat ~/.pi/agent/settings.json

# Протестировать /tools
# → команда /tools в pi → переключить инструменты → закрыть → открыть снова
# → должно сохраняться

# Протестировать /extensions
# → команда /extensions в pi → переключить пакет → закрыть
# → проверить ~/.pi/agent/settings.json
# → выполнить /reload → проверить применилось

# Протестировать /skills
# → команда /skills в пи → переключить скилл → закрыть
# → проверить ~/.pi/agent/settings.json
# → выполнить /reload → проверить применилось
```
