# pi-extension-manager

Интерактивное расширение для **pi-coding-agent** — подменю для управления расширениями, пакетами, скиллами и инструментами.

## Возможности

### 📦 `/extensions` — расширения и пакеты

Комбинированное меню для управления расширениями и пакетами.

- Показывает все расширения из ключа `extensions` и пакеты из ключа `packages` в `settings.json`
- Каждый элемент помечен типом: `[Extension]` или `[Package]`
- Состояние записывается в `settings.json` (с префиксом `-` для отключённых)
- Требуется `/reload` для применения

### 🛠️ `/skills` — управление скиллами

Отдельное меню для управления скиллами.

- Показывает все скиллы из ключа `skills` в `settings.json`
- Состояние записывается в `settings.json`
- Требуется `/reload` для применения

### 🔧 `/tools` — управление инструментами

Список всех доступных инструментов (тулзов). Переключение в реальном времени без перезагрузки.

- Мгновенное применение через `pi.setActiveTools()`
- Состояние сохраняется между сессиями
- Работает только в TUI-режиме

## Установка

### Глобально (для всех проектов)

```bash
mkdir -p ~/.pi/agent/extensions/pi-extension-manager
cp index.ts ~/.pi/agent/extensions/pi-extension-manager/
cp -r lib ~/.pi/agent/extensions/pi-extension-manager/
```

Или через симлинк для разработки:

```bash
ln -sf "$(pwd)" ~/.pi/agent/extensions/pi-extension-manager
```

### Для одного проекта

```bash
mkdir -p .pi/extensions/pi-extension-manager
cp index.ts .pi/extensions/pi-extension-manager/
cp -r lib .pi/extensions/pi-extension-manager/
```

### Через `pi install` (из npm-пакета в будущем)

```bash
pi install npm:pi-extension-manager
```

## Использование

После установки перезагрузи pi (`/reload` или `Ctrl+R`) и используй:

| Команда | Действие |
|---------|----------|
| `/extensions` | Открыть менеджер расширений и пакетов |
| `/skills` | Открыть менеджер скиллов |
| `/tools` | Открыть менеджер инструментов |

### Горячие клавиши

| Клавиши | Действие |
|---------|----------|
| `Ctrl+Shift+E` | Открыть менеджер расширений и пакетов |
| `Ctrl+Shift+T` | Открыть менеджер инструментов |
| `Ctrl+Shift+S` | Открыть менеджер скиллов |

## Интерфейс

### Меню расширений и пакетов

```
Extension & Package Manager
───────────────────────────
 1. ✅  pi-extension-toolkit    [Extension]
 2. ❌  pi-mcp-adapter          [Extension]
 3. ✅  pi-subagents            [Package]
 4. ✅  pi-local-model          [Package]
...
```

### Меню скиллов

```
Skill Manager
─────────────────
 1. ✅  create-skill
 2. ✅  local-llm-config
 3. ✅  workspace-catalog
...
```

### Меню инструментов

```
Tool Manager
Active: 5/12 tools
─────────────────
 1. ✅  read
 2. ✅  bash
 3. ❌  edit
...
```

## Структура

```
pi-extension-manager/
├── index.ts              ← точка входа (расширение для pi)
├── lib/
│   ├── settings.ts       ← чтение/запись settings.json
│   ├── extension-menu.ts ← /extensions
│   ├── skill-menu.ts     ← /skills
│   ├── tool-menu.ts      ← /tools
│   └── shortcuts.ts      ← горячие клавиши
├── ARCHITECTURE.md
├── README.md
└── DEVELOPMENT.md
```

## Зависимости

- `@earendil-works/pi-coding-agent` (peer)
- `@earendil-works/pi-tui` (peer)
- `typebox` (peer)

Все зависимости уже доступны в pi, устанавливать ничего дополнительно не нужно.

## License

MIT
