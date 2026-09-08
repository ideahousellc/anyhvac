"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { ContactModal } from "@/components/ContactModal";
import { NewsletterModal } from "@/components/NewsletterModal";
import { SupportModal } from "@/components/SupportModal";
import { SupportPrompt } from "@/components/SupportPrompt";
import {
  localDateKey,
  NEWSLETTER_LAST_PROMPT_KEY,
  NEWSLETTER_SUBSCRIBED_KEY,
} from "@/lib/newsletter";
import {
  SUCCESSFUL_TOOL_USE_EVENT,
  SUPPORT_PROMPT_STORAGE_KEY,
} from "@/lib/support";

type ModalName = "support" | "support-prompt" | "newsletter" | "contact";

type ModalContextValue = {
  openSupport: () => void;
  openNewsletter: () => void;
  openContact: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalName | null>(null);
  const [newsletterMounted, setNewsletterMounted] = useState(false);
  const activeModalRef = useRef<ModalName | null>(null);
  const supportPromptShownRef = useRef(false);

  const setModal = useCallback((modal: ModalName | null) => {
    if (modal === "newsletter") setNewsletterMounted(true);
    activeModalRef.current = modal;
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => setModal(null), [setModal]);
  const openSupport = useCallback(() => setModal("support"), [setModal]);
  const openNewsletter = useCallback(
    () => setModal("newsletter"),
    [setModal],
  );
  const openContact = useCallback(() => setModal("contact"), [setModal]);

  useEffect(() => {
    function handleSuccessfulToolUse() {
      if (activeModalRef.current || supportPromptShownRef.current) return;

      try {
        if (window.localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY)) return;
        window.localStorage.setItem(SUPPORT_PROMPT_STORAGE_KEY, "true");
      } catch {
        // The session guard still prevents repetition when storage is unavailable.
      }

      supportPromptShownRef.current = true;
      setModal("support-prompt");
    }

    window.addEventListener(SUCCESSFUL_TOOL_USE_EVENT, handleSuccessfulToolUse);
    return () =>
      window.removeEventListener(
        SUCCESSFUL_TOOL_USE_EVENT,
        handleSuccessfulToolUse,
      );
  }, [setModal]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activeModalRef.current) return;

      const today = localDateKey();
      try {
        if (
          window.localStorage.getItem(NEWSLETTER_SUBSCRIBED_KEY) === "true" ||
          window.localStorage.getItem(NEWSLETTER_LAST_PROMPT_KEY) === today
        ) {
          return;
        }
        window.localStorage.setItem(NEWSLETTER_LAST_PROMPT_KEY, today);
      } catch {
        // If storage is unavailable, show at most once during this mounted visit.
      }

      setModal("newsletter");
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [setModal]);

  return (
    <ModalContext.Provider
      value={{ openSupport, openNewsletter, openContact }}
    >
      {children}
      {newsletterMounted ? (
        <NewsletterModal
          open={activeModal === "newsletter"}
          onClose={closeModal}
        />
      ) : null}
      {activeModal === "support" ? (
        <SupportModal open onClose={closeModal} />
      ) : null}
      {activeModal === "support-prompt" ? (
        <SupportPrompt
          open
          onClose={closeModal}
          onSupport={openSupport}
        />
      ) : null}
      {activeModal === "contact" ? (
        <ContactModal open onClose={closeModal} />
      ) : null}
    </ModalContext.Provider>
  );
}

export function useModals() {
  const value = useContext(ModalContext);
  if (!value) throw new Error("useModals must be used within ModalProvider");
  return value;
}
