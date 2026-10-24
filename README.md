# pi-reset

A lightweight Pi extension that provides a `/reset` command along with agent-callable `reset` and `quit` tools for interactive and multi-session workflows.

## Why `pi-reset`?

1. **Clear context without losing your setup:** Pi's built-in `/new` command clears the conversation context, but it also resets your selected model and thinking level back to defaults. `/reset` starts a fresh session (and retains the previous transcript) while preserving your **provider, model, thinking level, and session name**.
2. **Orchestrator-driven session resets:** When one Pi session acts as an orchestrator managing worker sessions, it needs a way to clear a worker's context between tasks. Because `reset` is also registered as an agent-callable tool, an orchestrator can instruct another session to reset itself before starting a new task.
3. **Programmatic session shutdown:** Pi's built-in `/quit` slash command cannot be invoked programmatically by an agent. The `quit` tool gives agents a clean way to shut down gracefully—for example, allowing an orchestrator to tell a planner or worker session to exit once its job is done.

## What's Included

| Feature | Type | Description |
| :--- | :--- | :--- |
| `/reset` | Slash Command | Clears conversation context like `/new`, while keeping provider, model, thinking level, and session name. |
| `reset` | Agent Tool | Agent-callable twin of `/reset`. Waits for the agent to become idle before starting the fresh session. |
| `quit` | Agent Tool | Agent-callable twin of `/quit`. Requests a graceful shutdown once the current turn finishes. |

## Installation

```sh
pi install npm:pi-reset
```

For local development and testing:

```sh
pi -e .
```

## Usage

- **Interactive:** Run `/reset` in the prompt to start fresh without re-selecting your model or thinking level, or `/quit` to exit.
- **Agent / Orchestrator:** Ask the agent to call the `reset` tool before switching to an unrelated task, or the `quit` tool when a session has completed its assigned role.
