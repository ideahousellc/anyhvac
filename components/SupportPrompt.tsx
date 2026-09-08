"use client";

import { Modal } from "@/components/Modal";

import styles from "./SupportPrompt.module.css";

export function SupportPrompt({
  open,
  onClose,
  onSupport,
}: {
  open: boolean;
  onClose: () => void;
  onSupport: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="support-prompt-title"
      descriptionId="support-prompt-description"
    >
      <h2 id="support-prompt-title">Glad AnyHVAC could help! ☕</h2>
      <p id="support-prompt-description" className={styles.description}>
        AnyHVAC is built to provide useful HVAC tools free to everyone. If this
        tool saved you some time, consider supporting its development and
        helping us build the next one.
      </p>
      <div className={styles.actions}>
        <button className={styles.support} type="button" onClick={onSupport}>
          Support AnyHVAC
        </button>
        <button className={styles.later} type="button" onClick={onClose}>
          Maybe Later
        </button>
      </div>
      <p className={styles.note}>
        This is a one-time message. We won&apos;t ask again automatically.
      </p>
    </Modal>
  );
}
