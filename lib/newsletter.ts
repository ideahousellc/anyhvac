export const NEWSLETTER_LAST_PROMPT_KEY =
  "anyhvac-newsletter-last-prompt-date";
export const NEWSLETTER_SUBSCRIBED_KEY = "anyhvac-newsletter-subscribed";

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function markNewsletterSubscribed() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NEWSLETTER_SUBSCRIBED_KEY, "true");
}

// TODO: Call markNewsletterSubscribed only when beehiiv exposes a documented
// browser completion event or AnyHVAC processes subscriptions through a backend.
