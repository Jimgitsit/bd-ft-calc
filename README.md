# bd-ft-calc

A dead-simple **board foot cost calculator** for lumber, with a saved history.

**Live:** https://jimmcgowen.com/bd-ft-calc/

## What it does

Enter a board's **thickness**, **width**, and **length** (feet or inches),
a **quantity**, and a **price per board foot**. It shows the total board
footage and cost, live as you type. Hit **Save to history** to keep a running
list (stored locally in your browser).

Board feet are computed the standard way:

```
board feet (per board) = thickness(in) × width(in) × length(in) / 144
total board feet        = per board × quantity
cost                    = total board feet × price per board foot
```

## Stack

Single self-contained `public/index.html` (no build step, no framework) —
plain HTML/CSS/JS with `localStorage` for history. Served by a tiny Bun static
server.

## Run locally

```sh
bun run start        # serves public/ on http://localhost:58002
```

Regenerate the home-screen icon (`public/apple-touch-icon.png`):

```sh
bun run icon
```

## Deploy

Runs on this box behind nginx at `jimmcgowen.com/bd-ft-calc/` (Bun on port
`58002`; a trailing-slash `proxy_pass` strips the path prefix).

Kept always-up by launchd (`KeepAlive` → auto-restart on crash). A user
LaunchAgent is installed (`com.jim.bd-ft-calc`); a root-LaunchDaemon variant for
boot-without-login is also provided. See [`deploy/README.md`](deploy/README.md).
Restart after a code change:

```sh
launchctl kickstart -k gui/$(id -u)/com.jim.bd-ft-calc
```
