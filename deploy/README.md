# Keeping bd-ft-calc always up

Two launchd options. Both keep the Bun server (`server.ts`, port **58002**)
alive with `KeepAlive` (auto-restart on crash) and `RunAtLoad`. Only run **one**
at a time — they'd fight over port 58002.

Backend nginx route is already live at `jimmcgowen.com/bd-ft-calc/`.

## Option A — user LaunchAgent (installed, no sudo)

Starts on **login** and restarts on crash. Does **not** start at boot before
someone logs in (this box has no auto-login), so a bare reboot leaves it down
until the next GUI login.

```sh
cp deploy/com.jim.bd-ft-calc.agent.plist ~/Library/LaunchAgents/com.jim.bd-ft-calc.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.jim.bd-ft-calc.plist
launchctl kickstart -k gui/$(id -u)/com.jim.bd-ft-calc      # restart after a code change
launchctl print gui/$(id -u)/com.jim.bd-ft-calc | grep -E 'state|pid'
```

Uninstall: `launchctl bootout gui/$(id -u)/com.jim.bd-ft-calc`

## Option B — root LaunchDaemon (survives reboot without login)

Same pattern burpee uses. Starts at **boot**, independent of login — the
strongest "always up." Requires sudo (a password). **First bootout the user
agent** (Option A) so they don't collide on port 58002:

```sh
launchctl bootout gui/$(id -u)/com.jim.bd-ft-calc 2>/dev/null   # drop the user agent if present
sudo cp deploy/com.jim.bd-ft-calc.daemon.plist /Library/LaunchDaemons/com.jim.bd-ft-calc.plist
sudo chown root:wheel /Library/LaunchDaemons/com.jim.bd-ft-calc.plist
sudo launchctl bootstrap system /Library/LaunchDaemons/com.jim.bd-ft-calc.plist
sudo launchctl print system/com.jim.bd-ft-calc | grep -E 'state|pid'
```

Restart after a code change: `sudo launchctl kickstart -k system/com.jim.bd-ft-calc`
Uninstall: `sudo launchctl bootout system/com.jim.bd-ft-calc`
