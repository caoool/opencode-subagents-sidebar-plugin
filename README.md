# OpenCode Subagents Sidebar

An OpenCode 1.17.15+ TUI-only plugin that adds a **Subagents** section to the
sidebar footer. It shows pending and running task subagents for the current
parent session (or when viewing one of its child sessions).

Each subagent uses a compact two-line card: its role with model and raw
effort/reasoning variant, then its assigned task description with a
right-aligned elapsed runtime. Cards intentionally do not show status glyphs
or live transcript/activity text. Click anywhere on a card to open a live
details popup with status, foreground/background mode, child session ID, and
model details. The popup's **Open Session** action is available once the child
session exists (unless it is already open); **Close** dismisses the popup.
Completed tasks are hidden unless OpenCode still reports their background child
session as active.

## Install

```sh
opencode plugin opencode-subagents-sidebar-plugin --global
```

Quit and restart OpenCode after installing; plugins are loaded at startup.

For a manual TUI plugin entry, add this package's TUI export to `tui.json`.
The `plugin_enabled` entry is optional; include it to use this plugin without
OpenCode's built-in sidebar context:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin_enabled": { "internal:sidebar-context": false },
  "plugin": ["opencode-subagents-sidebar-plugin"]
}
```

Restart OpenCode after changing `tui.json`.

The source repository is available at
<https://github.com/caoool/opencode-subagents-sidebar-plugin>.

## Development

```sh
npm install
npm run typecheck
npm run build
npm test
npm run check
npm pack --dry-run
```

`dist/` is committed intentionally: OpenCode installs Git packages with
lifecycle scripts disabled.
