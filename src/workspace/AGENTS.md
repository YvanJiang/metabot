# MetaBot Workspace

This workspace is managed by **MetaBot** — an AI assistant accessible via Feishu/Telegram that runs Codex with full tool access.

## Available Skills

### /metaskill — AI Agent Team Generator
Create AI agent teams, individual agents, or custom skills for any project.

```
/metaskill ios app          → generates full .codex/ agent team
/metaskill a security agent → creates a single agent
/metaskill a deploy skill   → creates a custom slash command
```

### /metamemory — Shared Knowledge Store
Read and write persistent memory documents across sessions. Use the `mm` shell shortcut for quick operations:

```bash
mm search <query>       # Search documents
mm get <doc_id>         # Get document by ID
mm list [folder_id]     # List documents
mm folders              # Browse folder tree
```

For full API (create with tags, update, delete), use the `/metamemory` skill.

### /codexbot — Agent Bus, Scheduling & Bot Management
Use the `cb` shell shortcut for quick operations:

```bash
cb bots                                    # List all bots
cb task <botName> <chatId> <prompt>        # Delegate task
cb schedule list                           # List scheduled tasks
cb schedule add <bot> <chatId> <sec> <prompt>  # Schedule a task
cb health                                  # Health check
```

For full API (create bots, update tasks, sendCards), use the `/codexbot` skill.

### Feishu / Lark CLI (Feishu bots only)

`lark-cli` is the official Feishu CLI tool with 200+ commands covering 11 business domains. It is pre-installed and configured for Feishu bots.

```bash
lark-cli docs +create --title "..." --markdown "..."    # Create document
lark-cli docs +fetch --doc "<url>"                       # Read document
lark-cli im +messages-send --chat-id oc_xxx --text "Hi"  # Send message
lark-cli calendar +agenda --as user                      # View calendar
lark-cli base records list ...                           # Query bitable
```

19 AI Agent Skills are installed (lark-doc, lark-im, lark-calendar, lark-sheets, lark-base, lark-task, lark-drive, lark-mail, lark-wiki, etc.) providing structured guidance for each domain.

## Guidelines

- **Search before creating** — always check if a file or document already exists before creating new ones.
- **Use metamemory** — when you discover important knowledge, project patterns, or user preferences, save them to memory so future sessions can benefit.
- **Output files** — when generating files the user needs (images, PDFs, reports), copy them to the outputs directory provided in the system prompt so they get sent to the chat automatically.
- **Be concise in chat** — responses appear as Feishu/Telegram cards with limited space. Keep answers focused and use markdown formatting.
