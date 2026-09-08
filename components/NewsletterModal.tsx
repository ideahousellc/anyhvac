"use client";

import { BeehiivSubscribeEmbed } from "@/components/BeehiivSubscribeEmbed";
import { Modal } from "@/components/Modal";

export function NewsletterModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
      <BeehiivSubscribeEmbed />
    </Modal>
  );
}
