# OpenCode Subagents Sidebar

An OpenCode 1.17.15+ TUI-only plugin that adds a **Subagents** section to the
sidebar footer. It shows pending and running task subagents for the current
parent session (or when viewing one of its child sessions).

Each subagent uses a compact two-line card: status and role with its model,
then its newest meaningful activity with elapsed runtime. Completed tasks are
hidden.

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
