/**
 * /reset — Clear conversation context like /new (fresh file, zeroed stats)
 * while keeping provider, model, thinking level, and session display name.
 *
 * Mechanism: `ctx.newSession()` creates a brand-new session file, so the
 * active LLM context AND `getSessionStats()`/`/tree`/export all start clean.
 * Settings survive via a two-step handoff because pi resolves the new
 * runtime's model BEFORE `setup()` runs (empty session => default model):
 *  1. `setup()` seeds the new file with `model_change`/`thinking_level_change`/
 *     `session_info` (for future resumes) plus a one-shot `reset-restore`
 *     custom marker carrying plain provider/modelId/thinking/name data.
 *  2. The `session_start` handler in the NEW extension instance sees the
 *     marker and re-applies it with the live `pi.setModel()` /
 *     `pi.setThinkingLevel()` / `pi.setSessionName()`, then records
 *     `reset-applied` so later resumes or user model switches are not
 *     clobbered.
 *
 * Only plain JSON data crosses the replacement boundary — captured old
 * `pi`/`ctx` objects are stale after replacement and must not be used
 * inside `withSession` (see pi docs: session replacement footguns).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const RESTORE_TYPE = "reset-restore";
const APPLIED_TYPE = "reset-applied";

interface ResetRestoreData {
	id: string;
	provider?: string;
	modelId?: string;
	thinking?: string;
	name?: string;
}

function getCustomEntries(entries: Array<any>, customType: string): Array<any> {
	return entries.filter((e) => e?.type === "custom" && (e as any).customType === customType);
}

export default function resetExtension(pi: ExtensionAPI) {

	// Runs in the NEW instance after replacement (and on every normal startup).
	// No-op unless a pending one-shot restore marker exists.
	pi.on("session_start", async (_event, ctx) => {
		let entries: Array<any>;
		try {
			entries = ctx.sessionManager.getEntries() as Array<any>;
		} catch {
			return;
		}
		const restores = getCustomEntries(entries, RESTORE_TYPE) as Array<{
			data?: ResetRestoreData;
		}>;
		if (restores.length === 0) return;
		const latest = restores[restores.length - 1];
		const data = latest?.data;
		if (!data?.id) return;

		const applied = getCustomEntries(entries, APPLIED_TYPE) as Array<{
			data?: { id?: string };
		}>;
		if (applied.some((e) => e?.data?.id === data.id)) return;

		// Only auto-restore into a fresh (empty) session. If the session already
		// has conversation messages, the user is working — never clobber it.
		const hasMessages = entries.some((e) => e?.type === "message");
		if (hasMessages) {
			pi.appendEntry(APPLIED_TYPE, { id: data.id });
			return;
		}

		try {
			if (data.provider && data.modelId) {
				const current = ctx.model;
				if (!current || current.provider !== data.provider || current.id !== data.modelId) {
					const target = ctx.modelRegistry.find(data.provider, data.modelId);
					if (target) {
						await pi.setModel(target);
					} else {
						ctx.ui.notify(
							`Reset: model ${data.provider}/${data.modelId} not found, kept default`,
							"warning",
						);
					}
				}
			}
			// setModel() recomputes thinking from settings, so restore thinking AFTER.
			if (data.thinking) {
				try {
					pi.setThinkingLevel(data.thinking as never);
				} catch {
					// Unsupported level for this model — keep pi's clamped default.
				}
			}
			if (data.name) {
				pi.setSessionName(data.name);
			}
		} catch (error) {
			ctx.ui.notify(
				`Reset: could not restore settings (${error instanceof Error ? error.message : String(error)})`,
				"warning",
			);
		} finally {
			pi.appendEntry(APPLIED_TYPE, { id: data.id });
		}
	});

	pi.registerCommand("reset", {
		description: "Clear conversation context like /new, keep provider/model/thinking and the session name",
		handler: async (_args, ctx) => {
			// Extension commands dispatch immediately, even with deliverAs: "followUp".
			// Wait here (not in tool execute) so reset never aborts its own tool turn.
			await ctx.waitForIdle();

			// Snapshot plain data only — old runtime objects go stale after replacement.
			const provider = ctx.model?.provider;
			const modelId = ctx.model?.id;
			let thinking: string;
			try {
				thinking = pi.getThinkingLevel();
			} catch {
				thinking = ctx.thinkingLevel ?? "off";
			}
			const name = pi.getSessionName() ?? ctx.sessionManager.getSessionName() ?? undefined;
			const parentSession = ctx.sessionManager.getSessionFile();
			const resetId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
			const restoreData: ResetRestoreData = {
				id: resetId,
				provider,
				modelId,
				thinking,
				name,
			};

			const result = await ctx.newSession({
				parentSession,
				setup: async (sm) => {
					if (provider && modelId) sm.appendModelChange(provider, modelId);
					if (thinking) sm.appendThinkingLevelChange(thinking as never);
					if (name) sm.appendSessionInfo(name);
					(sm as unknown as { appendCustomEntry: (t: string, d: unknown) => void }).appendCustomEntry(
						RESTORE_TYPE,
						restoreData,
					);
				},
				withSession: async (replacementCtx) => {
					// Model/thinking/name restore happens in session_start above.
					replacementCtx.ui.setEditorText("");
					replacementCtx.ui.notify(
						"Context cleared. Provider, model, thinking, and session name are unchanged.",
						"info",
					);
				},
			});

			if (result.cancelled) {
				ctx.ui.notify("Reset cancelled", "info");
			}
		},
	});

	// Agent-callable twin of the /reset command (same name, separate registry).
	// Tool ctx cannot call newSession() (by design: it lives on
	// ExtensionCommandContext only). Dispatch /reset without awaiting it; the
	// command waits for idle while this tool returns. terminate skips the extra
	// LLM response when reset is the only tool in the batch. If there are sibling
	// tools or queued messages, waitForIdle also waits for those to settle.
	pi.registerTool({
		name: "reset",
		label: "Reset",
		description:
			"Start a fresh session (the tool twin of the /reset command — same " +
			"reset, agent-callable), discarding the current conversation while " +
			"keeping provider, model, thinking level, and session name. Calling this " +
			"tool requests /reset; the command waits until the agent is idle before " +
			"starting a fresh session. Use when " +
			"a coordinator session asks you to reset, or before switching to an " +
			"unrelated task. Do not schedule further work in this session.",
		parameters: {},
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			if (ctx.mode === "print") {
				return {
					content: [
						{
							type: "text",
							text: "The reset tool is unavailable in print mode (-p): the process exits when the prompt completes.",
						},
					],
					isError: true,
					details: {},
				};
			}
			pi.sendUserMessage("/reset", { deliverAs: "followUp", expandPromptTemplates: true });
			return {
				content: [
					{
						type: "text",
						text: "Reset requested: a fresh session starts after the agent becomes idle. Do not schedule further work in this session.",
					},
				],
				details: { scheduled: true },
				terminate: true,
			};
		},
	});

}
