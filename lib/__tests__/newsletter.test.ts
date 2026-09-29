import { describe, expect, it } from "vitest";

import {
  markNewsletterSubscribed,
  NEWSLETTER_AUTO_PROMPT_SUPPRESSED_KEY,
  NEWSLETTER_LAST_PROMPT_KEY,
  NEWSLETTER_SUBSCRIBED_KEY,
  shouldAutoPromptNewsletter,
  suppressNewsletterAutoPrompt,
} from "@/lib/newsletter";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const writes: Array<[string, string]> = [];

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      writes.push([key, value]);
      values.set(key, value);
    },
    values,
    writes,
  };
}

describe("newsletter browser state", () => {
  it("allows one automatic prompt and then suppresses future automatic prompts", () => {
    const storage = createStorage();

    expect(shouldAutoPromptNewsletter(storage)).toBe(true);
    suppressNewsletterAutoPrompt(storage);
    expect(shouldAutoPromptNewsletter(storage)).toBe(false);
    expect(storage.writes).toEqual([
      [NEWSLETTER_AUTO_PROMPT_SUPPRESSED_KEY, "true"],
    ]);
  });

  it("does not treat automatic-prompt suppression as a subscription", () => {
    const storage = createStorage();

    suppressNewsletterAutoPrompt(storage);

    expect(storage.values.get(NEWSLETTER_SUBSCRIBED_KEY)).toBeUndefined();
  });

  it("does not automatically prompt a known subscriber", () => {
    const storage = createStorage({ [NEWSLETTER_SUBSCRIBED_KEY]: "true" });

    expect(shouldAutoPromptNewsletter(storage)).toBe(false);
  });

  it("honors the legacy prompt record so existing visitors are not prompted again", () => {
    const storage = createStorage({
      [NEWSLETTER_LAST_PROMPT_KEY]: "2026-09-28",
    });

    expect(shouldAutoPromptNewsletter(storage)).toBe(false);
  });

  it("marks subscribed only through the dedicated confirmed-subscription function", () => {
    const storage = createStorage();

    markNewsletterSubscribed(storage);

    expect(storage.writes).toEqual([[NEWSLETTER_SUBSCRIBED_KEY, "true"]]);
  });

  it("persists only boolean state and never newsletter form contents", () => {
    const storage = createStorage();

    suppressNewsletterAutoPrompt(storage);
    markNewsletterSubscribed(storage);

    expect(storage.writes).toEqual([
      [NEWSLETTER_AUTO_PROMPT_SUPPRESSED_KEY, "true"],
      [NEWSLETTER_SUBSCRIBED_KEY, "true"],
    ]);
  });
});
