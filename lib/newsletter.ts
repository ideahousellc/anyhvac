export const NEWSLETTER_LAST_PROMPT_KEY =
  "anyhvac-newsletter-last-prompt-date";
export const NEWSLETTER_AUTO_PROMPT_SUPPRESSED_KEY =
  "anyhvac-newsletter-auto-prompt-suppressed";
export const NEWSLETTER_SUBSCRIBED_KEY = "anyhvac-newsletter-subscribed";

type NewsletterStorage = Pick<Storage, "getItem" | "setItem">;

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shouldAutoPromptNewsletter(storage: NewsletterStorage) {
  return (
    storage.getItem(NEWSLETTER_SUBSCRIBED_KEY) !== "true" &&
    storage.getItem(NEWSLETTER_AUTO_PROMPT_SUPPRESSED_KEY) !== "true" &&
    // Treat any prompt recorded by the previous daily-frequency behavior as
    // already shown so an existing visitor is not prompted again after deploy.
    storage.getItem(NEWSLETTER_LAST_PROMPT_KEY) === null
  );
}

export function suppressNewsletterAutoPrompt(storage: NewsletterStorage) {
  storage.setItem(NEWSLETTER_AUTO_PROMPT_SUPPRESSED_KEY, "true");
}

export function markNewsletterSubscribed(storage?: NewsletterStorage) {
  const target =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  target?.setItem(NEWSLETTER_SUBSCRIBED_KEY, "true");
}

// TODO: Call markNewsletterSubscribed only when beehiiv exposes a documented
// browser completion event or AnyHVAC processes subscriptions through a backend.
