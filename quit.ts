/**
 * Agent-callable twin of Pi's built-in `/quit` command.
 *
 * Requests a graceful `ctx.shutdown()` so an orchestrator can finish a worker
 * session. Shutdown is deferred until the agent is idle, allowing this tool
 * result and the final response to complete before Pi exits.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** Registers the `quit` tool; Pi already provides the `/quit` slash command. */
export default function quitExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "quit",
		label: "Quit",
		description:
			"Request a graceful shutdown of this pi process (the agent-callable " +
			"twin of /quit). Use only when a coordinator asks you to finish and " +
			"exit (for example, after marking your feature `passing`). Do not " +
			"schedule further work after calling it.",
		parameters: {},
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			ctx.shutdown();
			return {
				content: [
					{
						type: "text",
						text: "Quit requested. This process exits once the agent is idle.",
					},
				],
				details: { scheduled: true },
				terminate: true,
			};
		},
	});
}
