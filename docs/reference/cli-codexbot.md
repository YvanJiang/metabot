# codexbot CLI

The `codexbot` command manages the MetaBot service lifecycle.

## Installation

Installed automatically by the MetaBot installer to `~/.local/bin/codexbot`.

## Commands

```bash
codexbot update                      # pull latest code, rebuild, restart
codexbot start                       # start with PM2
codexbot stop                        # stop
codexbot restart                     # restart
codexbot logs                        # view live logs
codexbot status                      # PM2 process status
```

## Update

`codexbot update` is the recommended way to update MetaBot. It performs:

1. `git pull` — fetch latest code
2. `npm install && npm run build` — rebuild
3. `pm2 restart` — restart the service

All in one command.
