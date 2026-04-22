---
name: codexbot
description: "MetaBot HTTP API for agent collaboration: talk to other bots, schedule tasks, manage bots and peers. Use when the user wants to delegate work to another bot, schedule tasks, create/remove bots, or check peer status."
---

## MetaBot API

MetaBot exposes an HTTP API for agent-to-agent collaboration, task scheduling, and bot management.

Your bot name and chat ID are provided in the system prompt (look for "You are running as bot ... in chat ..."). Use those values for `botName` and `chatId` in the commands below.

### Quick Commands (cb shortcut)

The `cb` shell function is pre-installed and handles auth automatically. **Prefer `cb` over raw curl:**

```bash
# Bots
cb bots                                    # List all bots (local + peer)
cb bot <name>                              # Get bot details

# Agent Talk (cross-instance auto-routing)
cb talk <botName> <chatId> <prompt>        # Talk to a bot
cb talk alice/backend-bot <chatId> <prompt> # Talk to a specific peer's bot

# Peers
cb peers                                   # List peers and their status

# Scheduling (one-time)
cb schedule list                           # List all scheduled tasks
cb schedule add <bot> <chatId> <sec> <prompt>  # Schedule a one-time future task
cb schedule cancel <id>                    # Cancel a scheduled task

# Scheduling (recurring / cron)
cb schedule cron <bot> <chatId> '<cronExpr>' <prompt>  # Create recurring task
cb schedule pause <id>                     # Pause a recurring task
cb schedule resume <id>                    # Resume a paused recurring task

# Voice Call (RTC — real-time Doubao AI)
cb voice call <bot> <chatId> [prompt]      # Start voice call, wait for transcript
cb voice transcript <sessionId>            # Get call transcript
cb voice list                              # List active voice sessions
cb voice config                            # Check RTC configuration

# Skill Hub (cross-bot skill sharing)
cb skills                                  # List all shared skills (local + peer)
cb skills search <query>                   # Search skills by keyword
cb skills get <name>                       # Get skill details
cb skills publish <botName> <skillName>    # Publish a bot's skill to the hub
cb skills install <skillName> <botName>    # Install a skill to a bot
cb skills remove <name>                    # Unpublish a skill

# Monitoring
cb stats                                   # Cost & usage stats (per-bot, per-user)
cb metrics                                 # Prometheus metrics

# System
cb health                                  # Health check
```

### Cross-Instance Agent Talk

When you talk to a bot that isn't on the local instance, MetaBot automatically routes the request to the peer instance that hosts that bot. No special syntax is needed — just use `cb talk <botName> <chatId> <prompt>` as usual.

Use qualified names to target a specific peer: `cb talk <peerName>/<botName> <chatId> <prompt>`.

Use `cb bots` to see all available bots including those on peer instances (they will have `peerName` and `peerUrl` fields indicating which instance hosts them).

### API Reference (for complex operations)

For operations not covered by `cb` (creating bots, updating tasks, sendCards option), use the API directly.
Auth header: `-H "Authorization: Bearer $METABOT_API_SECRET"`
Base URL: !`echo http://localhost:${METABOT_API_PORT:-9100}`

**Talk to a bot (primary endpoint):**
```bash
curl -s -X POST http://localhost:${METABOT_API_PORT:-9100}/api/talk \
  -H "Authorization: Bearer $METABOT_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"botName":"<bot>","chatId":"<chatId>","prompt":"<message>","sendCards":true}'
```
The `botName` field supports qualified names: `"alice/backend-bot"` routes directly to the peer named "alice".

**Create Feishu bot:**
```bash
curl -s -X POST http://localhost:${METABOT_API_PORT:-9100}/api/bots \
  -H "Authorization: Bearer $METABOT_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"platform":"feishu","name":"<name>","feishuAppId":"...","feishuAppSecret":"...","defaultWorkingDirectory":"/path","installSkills":true}'
```

**Create Telegram bot:**
```bash
curl -s -X POST http://localhost:${METABOT_API_PORT:-9100}/api/bots \
  -H "Authorization: Bearer $METABOT_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"platform":"telegram","name":"<name>","telegramBotToken":"...","defaultWorkingDirectory":"/path","installSkills":true}'
```

**Remove bot:**
```bash
curl -s -X DELETE http://localhost:${METABOT_API_PORT:-9100}/api/bots/<name> \
  -H "Authorization: Bearer $METABOT_API_SECRET"
```

**Update scheduled task:**
```bash
curl -s -X PATCH http://localhost:${METABOT_API_PORT:-9100}/api/schedule/<id> \
  -H "Authorization: Bearer $METABOT_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"updated prompt","delaySeconds":7200}'
```

**Create recurring scheduled task (cron):**
```bash
curl -s -X POST http://localhost:${METABOT_API_PORT:-9100}/api/schedule \
  -H "Authorization: Bearer $METABOT_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"botName":"<bot>","chatId":"<chatId>","prompt":"<task>","cronExpr":"0 8 * * 1-5","timezone":"Asia/Shanghai","label":"Daily report"}'
```
Cron format: `minute hour day month weekday` (5 fields). Examples: `0 8 * * *` = daily 8am, `0 8 * * 1-5` = weekdays 8am, `*/30 * * * *` = every 30 min. Default timezone: Asia/Shanghai.

**Pause/resume recurring task:**
```bash
curl -s -X POST http://localhost:${METABOT_API_PORT:-9100}/api/schedule/<id>/pause \
  -H "Authorization: Bearer $METABOT_API_SECRET"
curl -s -X POST http://localhost:${METABOT_API_PORT:-9100}/api/schedule/<id>/resume \
  -H "Authorization: Bearer $METABOT_API_SECRET"
```

**Update recurring task:**
```bash
curl -s -X PATCH http://localhost:${METABOT_API_PORT:-9100}/api/schedule/<id> \
  -H "Authorization: Bearer $METABOT_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"cronExpr":"0 9 * * *","prompt":"Updated prompt","timezone":"Asia/Shanghai"}'
```

**List peers:**
```bash
curl -s http://localhost:${METABOT_API_PORT:-9100}/api/peers \
  -H "Authorization: Bearer $METABOT_API_SECRET"
```

When asked to create a bot:
1. Ask user for platform + credentials + project name + working directory
2. POST /api/bots with installSkills:true
3. Report success — new bot activates within ~3 seconds via PM2 file-watch
