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

Commands read extension, package, and skill lists from
`~/.pi/agent/settings.json` (user-level) and `.pi/settings.json`
(project-level, if it exists). Project settings take priority
over user settings when both define the same item.

Changes are saved to `settings.json`. A `-` prefix marks
a disabled item:

```jsonc
{
  "extensions": ["npm:pi-subagents", "-git:github.com/user/repo"],
  "packages": ["https://github.com/org/pkg"],
  "skills": ["/path/to/skill", "-/path/to/disabled"]
}
```

After saving, run `/reload` in pi to apply the changes.

### /tools — runtime (no reload needed)

Tools can be toggled on or off instantly — changes take effect
immediately. Tool state is preserved across sessions and tree
navigation. New tools (installed after the last save) are
enabled by default.

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
