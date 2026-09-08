"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import {
  CONTACT_REASONS,
  type ContactReason,
  validateContactSubmission,
} from "@/lib/contact";

import styles from "./ContactModal.module.css";

const INITIAL_FORM = {
  reason: "General Feedback" as ContactReason,
  name: "",
  email: "",
  message: "",
};

export function ContactModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [messageTouched, setMessageTouched] = useState(false);
  const errors = validateContactSubmission(form);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="contact-modal-title"
      descriptionId="contact-modal-description"
      className={styles.dialog}
    >
      <h2 id="contact-modal-title">Contact AnyHVAC</h2>
      <p id="contact-modal-description">
        Share a calculation issue, tool idea, or general feedback.
      </p>

      <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
        <label>
          <span>Reason</span>
          <select
            value={form.reason}
            onChange={(event) =>
              update("reason", event.target.value as ContactReason)
            }
          >
            {CONTACT_REASONS.map((reason) => (
              <option value={reason} key={reason}>{reason}</option>
            ))}
          </select>
        </label>

        {form.reason === "Report a Calculation Issue" ? (
          <p className={styles.helper}>
            Please include the tool name, inputs used, result received,
            expected result if known, and a screenshot if useful.
          </p>
        ) : null}

        <div className={styles.fieldRow}>
          <label>
            <span>Name <small>Optional</small></span>
            <input
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>
          <label>
            <span>Email <small>Optional</small></span>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "contact-email-error" : undefined}
              onChange={(event) => update("email", event.target.value)}
            />
            {errors.email ? <small id="contact-email-error" className={styles.error}>{errors.email}</small> : null}
          </label>
        </div>

        <label>
          <span>Message</span>
          <textarea
            required
            rows={6}
            value={form.message}
            aria-invalid={messageTouched && Boolean(errors.message)}
            aria-describedby={messageTouched && errors.message ? "contact-message-error" : undefined}
            onBlur={() => setMessageTouched(true)}
            onChange={(event) => update("message", event.target.value)}
          />
          {messageTouched && errors.message ? (
            <small id="contact-message-error" className={styles.error}>{errors.message}</small>
          ) : null}
        </label>

        <div className={styles.deliveryNotice} role="note">
          Online delivery is being finalized. Submission will be enabled at
          launch; nothing entered here is currently sent or stored.
        </div>
        <button className={styles.submit} type="submit" disabled>
          Submit — Coming at Launch
        </button>
      </form>
    </Modal>
  );
}
