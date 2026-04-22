# cb CLI (Agent Bus)

The `cb` command provides terminal access to the MetaBot Agent Bus API.

## Installation

Installed automatically by the MetaBot installer to `~/.local/bin/cb`.

## Commands

### Bot Management

```bash
cb bots                             # list all bots (local + peer)
cb bot <name>                       # get bot details
```

### Agent Talk

```bash
cb talk <bot> <chatId> <prompt>     # talk to a bot
cb talk alice/bot <chatId> <prompt> # talk to a specific peer's bot
```

The bot name supports [qualified names](../features/peers.md#qualified-names) (`peerName/botName`) for cross-instance routing.

### Peers

```bash
cb peers                            # list peers and status
```

### Scheduling

```bash
cb schedule list                                              # list all tasks
cb schedule cron <bot> <chatId> '<cron>' <prompt>            # create recurring task
cb schedule add <bot> <chatId> <delayMs> <prompt>            # create one-time task
cb schedule pause <id>                                        # pause a task
cb schedule resume <id>                                       # resume a task
cb schedule cancel <id>                                       # cancel a task
```

### Stats & Health

```bash
cb stats                            # cost & usage statistics
cb health                           # health check
```

### Voice

```bash
cb voice "Hello world"              # generate MP3, print file path
cb voice "Hello" --play             # generate and play audio
cb voice "Hello" -o greeting.mp3    # save to specific file
echo "Long text" | cb voice         # read from stdin
cb voice "Hello" --provider doubao  # use specific TTS provider
cb voice "Hello" --voice nova       # use specific voice
```

| Flag | Description |
|------|-------------|
| `--play` | Play audio after generating (macOS: afplay, Linux: mpv/ffplay/play) |
| `-o FILE` | Save to specific file (default: `/tmp/cb-voice-<timestamp>.mp3`) |
| `--provider NAME` | TTS provider: `doubao`, `openai`, or `elevenlabs` |
| `--voice ID` | Voice/speaker ID (provider-specific) |

### Management

```bash
cb update                           # pull + rebuild + restart
cb help                             # show help
```

## Remote Access

By default, `cb` connects to `http://localhost:9100`. For internet-reachable deployments, point it at your HTTPS reverse proxy. If you use a private network such as Tailscale or WireGuard, you can use that private address instead.

```bash
# Generate a secret once: openssl rand -hex 32
# In ~/.metabot/.env or ~/metabot/.env
METABOT_URL=http://your-server:9100
API_SECRET=your-secret
```
