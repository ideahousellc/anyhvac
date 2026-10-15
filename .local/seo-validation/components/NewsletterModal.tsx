"use client";

import { BeehiivSubscribeEmbed } from "@/components/BeehiivSubscribeEmbed";
import { Modal } from "@/components/Modal";
import type { NewsletterSource } from "@/lib/growth/browser";
import { newsletterFormForSource } from "@/lib/growth/newsletter-source";

export function NewsletterModal({
  open,
  onClose,
  source = "other",
}: {
  open: boolean;
  onClose: () => void;
  source?: NewsletterSource;
}) {
  const form = newsletterFormForSource(source, process.env.NEXT_PUBLIC_BEEHIIV_DUCT_REFERENCE_FORM_ID);
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="newsletter-modal-title"
      descriptionId="newsletter-modal-description"
    >
      <h2 id="newsletter-modal-title">
        Get new free HVAC tools in your inbox.
      </h2>
      <p id="newsletter-modal-description">
        New calculators, practical HVAC references, and AnyHVAC updates. No
        spam.
      </p>
      <BeehiivSubscribeEmbed key={form.formId} formId={form.formId} dedicatedFormConfigured={form.dedicatedFormConfigured} />
    </Modal>
  );
}
