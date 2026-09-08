import type { Metadata } from "next";

import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | AnyHVAC",
  description:
    "Launch-development shell for the forthcoming AnyHVAC Privacy Policy.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" documentName="Privacy Policy" />
  );
}
