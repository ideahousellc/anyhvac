"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { useModals } from "@/components/ModalProvider";
import type { NewsletterSource } from "@/lib/growth/browser";

export function NewsletterTrigger({
  children,
  source = "other",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; source?: NewsletterSource }) {
  const { openNewsletter } = useModals();
  return (
    <button {...props} type="button" onClick={() => openNewsletter(source)}>
      {children}
    </button>
  );
}

export function ContactTrigger({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  const { openContact } = useModals();
  return (
    <button {...props} type="button" onClick={openContact}>
      {children}
    </button>
  );
}
