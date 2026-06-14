# pi-extension-manager

<div align="center">

**[🇬🇧 English](README.md) · [🇷🇺 Русский](README.ru.md)**

</div>

---

> Interactive TUI extension for **pi-coding-agent** — manage extensions,
> packages, skills, and tools directly from the pi command line.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Features

| Command | What it does | Usage |
|---------|-----------|------------|
| `/extensions` | Toggle extensions and npm/git packages | Requires `/reload` |
| `/skills` | Toggle skills | Requires `/reload` |
| `/tools` | Toggle runtime tools (all registered) | **Instant**, no reload |

**Hotkeys:** `Ctrl+Shift+E` → `/extensions`, `Ctrl+Shift+T` → `/tools`, `Ctrl+Shift+S` → `/skills`

---

## Installation

```bash
# Option 1: Global (recommended)
pi install https://github.com/intulint/pi-extension-manager

# Option 2: Download a copy and install
git clone https://github.com/intulint/pi-extension-manager
pi install ./pi-extension-manager
```

After installation, run `/reload` in pi.

---

## How it works

### /extensions and /skills — persistent (settings.json)

```
User: /extensions
  │
  ├─ buildExtPackageList()
  │   ├─ reads ~/.pi/agent/settings.json (user)
  │   ├─ reads .pi/settings.json (project, if exists)
  │   └─ merges: project over user
  │
  ├─ TUI: list with toggle elements
  │
  └─ saveExtPackageList(items)
      └─ writes to settings.json with '-' prefix
```

`settings.json` format:

```jsonc
{
  "extensions": ["npm:pi-subagents", "-git:github.com/user/repo"],
  "packages": ["https://github.com/org/pkg"],
  "skills": ["/path/to/skill", "-/path/to/disabled"]
}
```

**Prefix rules:**
- `-` before the path = disabled
- No prefix = enabled
- When saving, `getBase()` cleans all leading `-`, adds one.

### /tools — runtime (pi session)

```
User: /tools
  │
  ├─ pi.getAllTools()       ← all registered tools
  ├─ pi.getActiveTools()    ← currently enabled
  │
  ├─ TUI: list with toggle
  │   └─ toggle → pi.setActiveTools() INSTANTLY
  │
  └─ on close → persistTools() → pi.appendEntry() to session
```

**Recovery after `/reload`:** `restoreState()` finds the last entry
in the session history, applies merge:
- Tools from the saved state — as they were
- **New tools** (appeared after saving) — **enabled by default**

---

## Project Structure

```
pi-extension-manager/
├── index.ts              ← entry point (default export)
├── lib/
│   ├── settings.ts       ← I/O settings.json: build/save, user+project merge
│   ├── settings-menu.ts  ← common TUI-builder for /extensions and /skills
│   ├── extension-menu.ts ← /extensions command (delegates to settings-menu.ts)
│   ├── skill-menu.ts     ← /skills command (delegates to settings-menu.ts)
│   ├── tool-menu.ts      ← /tools command + session restore
│   └── shortcuts.ts      ← hotkeys Ctrl+Shift+E/T/S
├── ARCHITECTURE.md       ← detailed architecture, data flows, notes
└── package.json          ← package metadata
```

> **Why `lib/`?** Pi scans all `.ts` files in the extension root.
> Helpers must be in a subdirectory, otherwise pi will try to load them
> as separate extensions.

---

## Dependencies

| Package | Version | Type |
|-------|--------|-----|
| `@earendil-works/pi-coding-agent` | ^0.79.0 | peer |
| `@earendil-works/pi-tui` | * | peer |
| `typebox` | * | peer |

All dependencies are already present in pi — no need to install anything.

---

## License

MIT
