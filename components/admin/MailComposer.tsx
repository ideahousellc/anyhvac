"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ADMIN_FROM, MAIL_LIMITS } from "@/lib/admin/mail";

import styles from "./Admin.module.css";

type FieldErrors = Partial<Record<"to" | "subject" | "message", string>>;

export function MailComposer() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const requestId = useRef("");
  const sending = useRef(false);

  function edited() {
    if (!sending.current) requestId.current = "";
    setSuccess(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setPending(true);
    setSuccess(false);
    setError("");
    setFieldErrors({});

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    requestId.current ||= crypto.randomUUID();

    try {
      const result = await fetch("/api/admin/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: form.get("to"),
          subject: form.get("subject"),
          message: form.get("message"),
          requestId: requestId.current,
        }),
      });
      const body: unknown = await result.json().catch(() => null);
      if (result.ok) {
        formElement.reset();
        requestId.current = "";
        setSuccess(true);
        return;
      }
      if (result.status === 401) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      if (typeof body === "object" && body !== null) {
        if ("error" in body) setError(String(body.error));
        if ("fields" in body && typeof body.fields === "object" && body.fields) {
          setFieldErrors(body.fields as FieldErrors);
        }
      } else {
        setError("Email could not be sent. Please try again.");
      }
    } catch {
      setError("Email could not be sent. Please try again.");
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  async function logout() {
    if (sending.current) return;
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.replace("/admin");
      router.refresh();
    }
  }

  return (
    <>
      <div className={styles.sectionHeading}>
        <h2>Mail</h2>
        <button className={styles.logoutButton} type="button" onClick={logout}>
          Logout
        </button>
      </div>
      <form className={styles.form} onSubmit={submit} onChange={edited}>
        <label>
          <span>From</span>
          <input value={ADMIN_FROM} readOnly aria-readonly="true" />
        </label>
        <label>
          <span>To</span>
          <input
            name="to"
            type="email"
            autoComplete="off"
            maxLength={MAIL_LIMITS.recipient}
            required
          />
          {fieldErrors.to ? <small className={styles.fieldError}>{fieldErrors.to}</small> : null}
        </label>
        <label>
          <span>Subject</span>
          <input name="subject" maxLength={MAIL_LIMITS.subject} required />
          {fieldErrors.subject ? <small className={styles.fieldError}>{fieldErrors.subject}</small> : null}
        </label>
        <label>
          <span>Message</span>
          <textarea name="message" rows={10} maxLength={MAIL_LIMITS.message} required />
          {fieldErrors.message ? <small className={styles.fieldError}>{fieldErrors.message}</small> : null}
        </label>
        {success ? (
          <p className={styles.success} role="status">✓ Email sent from contact@anyhvac.net</p>
        ) : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button className={styles.primaryButton} type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send Email"}
        </button>
      </form>
    </>
  );
}
