# pi-reset

Pi extensions providing `/reset` and an agent-callable `reset` tool, plus an agent-callable `quit` tool. `/quit` is already built into Pi; the `quit` tool requests the same graceful shutdown for agent or orchestrator use.

`/reset` starts a fresh session while preserving the provider, model, thinking level, and session name. The previous session is retained.

After publishing, install it with:

```sh
pi install npm:pi-reset
```

Run `/reset` or ask the agent to use the `reset` tool. Run `/quit` or ask the agent to use the `quit` tool to exit gracefully.

For local testing:

```sh
pi -e .
```
