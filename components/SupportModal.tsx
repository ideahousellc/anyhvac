"use client";

import { Modal } from "@/components/Modal";
import { StripeSupportButton } from "@/components/StripeSupportButton";

export function SupportModal({
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
      titleId="support-modal-title"
      descriptionId="support-modal-description"
    >
      <h2 id="support-modal-title">Support AnyHVAC</h2>
      <p id="support-modal-description">
        AnyHVAC is free to use. If the tools save you time, you can optionally
        support future development and help us build the next tool.
      </p>
      <StripeSupportButton />
    </Modal>
  );
}
