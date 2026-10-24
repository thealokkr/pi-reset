import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import quitExtension from "./quit.ts";
import resetExtension from "./reset.ts";

/** Registers the reset and quit capabilities through one Pi extension entrypoint. */
export default function piResetExtension(pi: ExtensionAPI) {
	resetExtension(pi);
	quitExtension(pi);
}
