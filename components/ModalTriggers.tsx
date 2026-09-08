"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { useModals } from "@/components/ModalProvider";

export function NewsletterTrigger({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  const { openNewsletter } = useModals();
  return (
    <button {...props} type="button" onClick={openNewsletter}>
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
