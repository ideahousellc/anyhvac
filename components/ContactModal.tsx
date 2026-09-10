"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Modal } from "@/components/Modal";
import {
  CONTACT_LIMITS,
  CONTACT_REASONS,
  submitContactSubmission,
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

type SubmissionState = "idle" | "submitting" | "success" | "error";

export function ContactModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [website, setWebsite] = useState("");
  const [messageTouched, setMessageTouched] = useState(false);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const startedAt = useRef<number | null>(null);
  const errors = validateContactSubmission(form);

  useEffect(() => {
    if (open && startedAt.current === null) startedAt.current = Date.now();
  }, [open]);

  const handleClose = useCallback(() => {
    setForm(INITIAL_FORM);
    setWebsite("");
    setMessageTouched(false);
    setSubmissionState("idle");
    startedAt.current = null;
    onClose();
  }, [onClose]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (submissionState !== "idle") setSubmissionState("idle");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessageTouched(true);

    if (Object.keys(errors).length > 0 || submissionState === "submitting") {
      return;
    }

    setSubmissionState("submitting");
    try {
      const result = await submitContactSubmission(form, {
        website,
        startedAt: startedAt.current ?? 0,
      });

      if (!result.delivered) {
        setSubmissionState("error");
        return;
      }

      setForm(INITIAL_FORM);
      setWebsite("");
      setMessageTouched(false);
      setSubmissionState("success");
      startedAt.current = Date.now();
    } catch {
      setSubmissionState("error");
    }
  }

  const fallbackEmail =
    form.reason === "Report a Calculation Issue"
      ? "support@anyhvac.net"
      : "contact@anyhvac.net";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      titleId="contact-modal-title"
      descriptionId="contact-modal-description"
      className={`${styles.dialog} ${submissionState === "success" ? styles.dialogSuccess : ""}`}
    >
      {submissionState === "success" ? (
        <div className={styles.success} role="status" aria-live="polite">
          <Image
            className={styles.watermark}
            src="/Compact AH logo.png"
            alt=""
            width={300}
            height={300}
            aria-hidden="true"
          />
          <div className={styles.successContent}>
            <span className={styles.successIcon} aria-hidden="true">✓</span>
            <h2 id="contact-modal-title">Message sent!</h2>
            <p id="contact-modal-description">
              Thanks for contacting AnyHVAC.<br />
              We’ll get back to you as soon as we can.
            </p>
          </div>
        </div>
      ) : (
        <>
          <h2 id="contact-modal-title">Contact AnyHVAC</h2>
          <p id="contact-modal-description">
            Share a calculation issue, tool idea, or general feedback.
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
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
            and expected result if known.
          </p>
        ) : null}

        <div className={styles.fieldRow}>
          <label>
            <span>Name <small>Optional</small></span>
            <input
              type="text"
              autoComplete="name"
              maxLength={CONTACT_LIMITS.name}
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>
          <label>
            <span>Email <small>Optional</small></span>
            <input
              type="email"
              autoComplete="email"
              maxLength={CONTACT_LIMITS.email}
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
            maxLength={CONTACT_LIMITS.message}
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

        <label className={styles.honeypot} aria-hidden="true">
          <span>Website</span>
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>

        {submissionState === "error" ? (
          <div className={styles.deliveryNotice} role="alert">
            We couldn&apos;t send your message. Please try again or email{" "}
            <a href={`mailto:${fallbackEmail}`}>{fallbackEmail}</a> directly.
          </div>
        ) : null}

        <button
          className={styles.submit}
          type="submit"
          disabled={submissionState === "submitting"}
        >
          {submissionState === "submitting" ? "Sending…" : "Send Message"}
        </button>
          </form>
        </>
      )}
    </Modal>
  );
}
