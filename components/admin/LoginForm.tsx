"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./Admin.module.css";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    try {
      const result = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          pin: form.get("pin"),
        }),
      });
      if (result.ok) {
        router.replace("/admin/mail");
        router.refresh();
        return;
      }
      const body: unknown = await result.json().catch(() => null);
      setError(
        typeof body === "object" && body !== null && "error" in body
          ? String(body.error)
          : "Sign-in failed. Please try again.",
      );
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label>
        <span>Username</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          required
          maxLength={100}
          autoFocus
        />
      </label>
      <label>
        <span>6-digit PIN</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          title="Enter exactly six digits."
          required
          onInput={(event) => {
            event.currentTarget.value = event.currentTarget.value
              .replace(/\D/g, "")
              .slice(0, 6);
          }}
        />
      </label>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.primaryButton} type="submit" disabled={pending}>
        {pending ? "Signing In…" : "Sign In"}
      </button>
    </form>
  );
}
