# OpenCode Subagents Sidebar

An OpenCode 1.17.15+ TUI-only plugin that adds a **Subagents** section to the
sidebar footer. It shows pending and running task subagents for the current
parent session (or when viewing one of its child sessions).

Each subagent uses a compact two-line card: its role with model and raw
effort/reasoning variant, then its assigned task description with a
right-aligned elapsed runtime. Click anywhere on a card to open a non-modal,
live popover attached to that card (left first, then right, with above/below
fallbacks on narrow terminals). It shows status, foreground/background mode,
child session ID, model details, and the newest visible assistant reply as a
single truncated line. When the public TUI state has not populated the child
transcript yet, the plugin hydrates it without overriding newer live state. It
waits for the child session or assistant reply when that information is not
available yet. Opening another card replaces the popover; navigating away,
opening a host dialog, or closing the popover dismisses it. The popup's **Open
Session** action is available once the child session exists (unless it is
already open); **Close** dismisses the popover.
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
