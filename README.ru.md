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
| `/tools` | Вкл/выкл runtime-инструменты (все зарегистрированные) | **Мгновенно**, без reload |

**Горячие клавиши:** `Ctrl+Shift+E` → `/extensions`, `Ctrl+Shift+T` → `/tools`, `Ctrl+Shift+S` → `/skills`

---

## Установка

```bash
# Вариант 1: глобально (рекомендуется)
pi install https://github.com/intulint/pi-extension-manager

# Вариант 2: скачать копию и установить
git clone https://github.com/intulint/pi-extension-manager
pi install ./pi-extension-manager
```

После установки — `/reload` в pi.

---

## Как это работает

### /extensions и /skills — постоянное хранение (settings.json)

Команды читают списки расширений, пакетов и скиллов из
`~/.pi/agent/settings.json` (уровень пользователя) и `.pi/settings.json`
(уровень проекта, если есть). Настройки проекта имеют приоритет
над пользовательскими при совпадении элементов.

Изменения сохраняются в `settings.json`. Префикс `-` отмечает
отключённый элемент:

```jsonc
{
  "extensions": ["npm:pi-subagents", "-git:github.com/user/repo"],
  "packages": ["https://github.com/org/pkg"],
  "skills": ["/path/to/skill", "-/path/to/disabled"]
}
```

После сохранения выполните `/reload` в pi для применения изменений.

### /tools — runtime (без перезагрузки)

Инструменты переключаются мгновенно — изменения вступают в силу сразу.
Состояние сохраняется между сессиями и при навигации по дереву.
Новые инструменты (установленные после последнего сохранения)
включаются по умолчанию.

---

## Зависимости

| Пакет | Версия | Тип |
|-------|--------|-----|
| `@earendil-works/pi-coding-agent` | ^0.79.0 | peer |
| `@earendil-works/pi-tui` | * | peer |
| `typebox` | * | peer |

Все зависимости уже есть в pi — устанавливать ничего не нужно.

---

## License

MIT
