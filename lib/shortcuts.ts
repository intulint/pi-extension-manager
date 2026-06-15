/**
 * Горячие клавиши для менеджера.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function registerShortcuts(pi: ExtensionAPI): void {
  pi.registerShortcut("ctrl+shift+e", {
    description: "Open extension manager",
    handler: () => {
      pi.sendUserMessage("/extensions", { deliverAs: "followUp" });
    },
  });

  pi.registerShortcut("ctrl+shift+t", {
    description: "Open tool manager",
    handler: () => {
      pi.sendUserMessage("/tools", { deliverAs: "followUp" });
    },
  });

  pi.registerShortcut("ctrl+shift+s", {
    description: "Open skill manager",
    handler: () => {
      pi.sendUserMessage("/skills", { deliverAs: "followUp" });
    },
  });
}
