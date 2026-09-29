import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NewsletterCTA } from "@/components/NewsletterCTA";
import { NewsletterModal } from "@/components/NewsletterModal";
import { ModalProvider } from "@/components/ModalProvider";
import { suppressNewsletterAutoPrompt } from "@/lib/newsletter";

describe("newsletter experience", () => {
  it("keeps the explicit newsletter action available", () => {
    const values = new Map<string, string>();
    suppressNewsletterAutoPrompt({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    });
    const markup = renderToStaticMarkup(
      <ModalProvider>
        <NewsletterCTA />
      </ModalProvider>,
    );

    expect(markup).toContain("<button");
    expect(markup).toContain("Join the AnyHVAC Newsletter");
  });

  it("renders the explicitly opened signup with its Beehiiv embed host", () => {
    const markup = renderToStaticMarkup(
      <NewsletterModal open onClose={() => undefined} />,
    );

    expect(markup).toContain('aria-label="AnyHVAC newsletter signup form"');
  });

  it("preserves the modal accessibility contract", () => {
    const markup = renderToStaticMarkup(
      <NewsletterModal open onClose={() => undefined} />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-labelledby="newsletter-modal-title"');
    expect(markup).toContain(
      'aria-describedby="newsletter-modal-description"',
    );
    expect(markup).toContain('aria-label="Close dialog"');
  });
});
