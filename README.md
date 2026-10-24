# pi-reset

Pi extension providing `/reset` and an agent-callable `reset` tool. It starts a fresh session while preserving the provider, model, thinking level, and session name. The previous session is retained.

After publishing, install it with:

```sh
pi install npm:pi-reset
```

Run `/reset` or ask the agent to use the `reset` tool.

For local testing:

```sh
pi -e .
```
