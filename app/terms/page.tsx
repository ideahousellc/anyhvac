import type { Metadata } from "next";

import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Use | AnyHVAC",
  description:
    "Launch-development shell for the forthcoming AnyHVAC Terms of Use.",
};

export default function TermsPage() {
  return <LegalPageShell title="Terms of Use" documentName="Terms of Use" />;
}
