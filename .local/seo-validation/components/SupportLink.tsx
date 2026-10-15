"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { useModals } from "@/components/ModalProvider";

import styles from "./SupportLink.module.css";

export function SupportLink({
  children = "Support AnyHVAC",
  className = "",
  variant = "text",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  variant?: "text" | "button";
}) {
  const { openSupport } = useModals();
  const classes = [styles.link, variant === "button" ? styles.button : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      type="button"
      className={classes}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) openSupport();
      }}
    >
      {children}
    </button>
  );
}
