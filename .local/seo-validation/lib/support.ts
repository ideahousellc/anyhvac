export const SUPPORT_PROMPT_STORAGE_KEY = "anyhvac-support-prompt-seen";
export const SUCCESSFUL_TOOL_USE_EVENT = "anyhvac:successful-tool-use";

export function markSuccessfulToolUse() {
  if (typeof window === "undefined") return;

  // Defer until the current result update has been committed to the page.
  window.setTimeout(() => {
    window.dispatchEvent(new Event(SUCCESSFUL_TOOL_USE_EVENT));
  }, 0);
}
