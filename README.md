# pi-extension-manager

> Интерактивное TUI-расширение для **pi-coding-agent** — управление расширениями,
> пакетами, скиллами и инструментами прямо из командной строки pi.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Возможности

| Команда | Что делает | Применение |
|---------|-----------|------------|
| `/extensions` | Вкл/выкл расширения и npm/git-пакеты | Требует `/reload` |
| `/skills` | Вкл/выкл скиллы (навыки) | Требует `/reload` |
| `/tools` | Вкл/выкл runtime-инструменты (read, bash, …) | **Мгновенно**, без reload |

**Горячие клавиши:** `Ctrl+Shift+E` → `/extensions`, `Ctrl+Shift+T` → `/tools`, `Ctrl+Shift+S` → `/skills`

---

## Установка

```bash
# Вариант 1: глобально (для всех проектов)
mkdir -p ~/.pi/agent/extensions/pi-extension-manager
cp -r index.ts lib ~/.pi/agent/extensions/pi-extension-manager/

# Вариант 2: симлинк для разработки
ln -sf "$(pwd)" ~/.pi/agent/extensions/pi-extension-manager

# Вариант 3: для одного проекта
mkdir -p .pi/extensions/pi-extension-manager
cp -r index.ts lib .pi/extensions/pi-extension-manager/
```

После установки — `/reload` в pi.

---

## Как это работает

### /extensions и /skills — persistent (settings.json)

```
User: /extensions
  │
  ├─ buildExtPackageList()
  │   ├─ читает ~/.pi/agent/settings.json (user)
  │   ├─ читает .pi/settings.json (project, если есть)
  │   └─ сливает: project поверх user
  │
  ├─ TUI: список с toggle-элементами
  │
  └─ saveExtPackageList(items)
      └─ записывает в settings.json с префиксом '-'
```

Формат `settings.json`:

```jsonc
{
  "extensions": ["npm:pi-subagents", "-git:github.com/user/repo"],
  "packages": ["https://github.com/org/pkg"],
  "skills": ["/path/to/skill", "-/path/to/disabled"]
}
```

**Правила префиксов:**
- `-` перед путём = disabled
- Без префикса = enabled
- При сохранении `getBase()` чистит все ведущие `-`, добавляет один

### /tools — runtime (сессия pi)

```
User: /tools
  │
  ├─ pi.getAllTools()       ← все зарегистрированные инструменты
  ├─ pi.getActiveTools()    ← текущие включённые
  │
  ├─ TUI: список с toggle
  │   └─ toggle → pi.setActiveTools() МГНОВЕННО
  │
  └─ закрытие → persistTools() → pi.appendEntry() в сессию
```

**Восстановление после /reload:** `restoreState()` находит последнюю запись
в истории сессии, применяет merge:
- Инструменты из сохранённого состояния — как было
- **Новые инструменты** (появились после сохранения) — **включаются по умолчанию**

---

## Структура проекта

```
pi-extension-manager/
├── index.ts              ← точка входа (default export)
├── lib/
│   ├── settings.ts       ← I/O settings.json: build/save, user+project merge
│   ├── extension-menu.ts ← команда /extensions
│   ├── skill-menu.ts     ← команда /skills
│   ├── tool-menu.ts      ← команда /tools + session restore
│   └── shortcuts.ts      ← горячие клавиши Ctrl+Shift+E/T/S
├── ARCHITECTURE.md       ← подробная архитектура, диаграммы, потоки
└── package.json          ← метаданные пакета
```

> **Почему `lib/`?** Pi сканирует все `.ts`-файлы в корне расширения.
> Хелперы должны быть в подпапке, иначе pi попытается загрузить их
> как отдельные расширения.

---

## Зависимости

| Пакет | Версия | Тип |
|-------|--------|-----|
| `@earendil-works/pi-coding-agent` | ^0.79.0 | peer |
| `@earendil-works/pi-tui` | * | peer |
| `typebox` | * | peer |

Все зависимости уже есть в pi — устанавливать ничего не нужно.

---



---

## License

MIT
