import type { Metadata } from "next";

import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Engineering Disclaimer | AnyHVAC",
  description:
    "Launch-development shell for the forthcoming AnyHVAC Engineering Disclaimer.",
};

export default function EngineeringDisclaimerPage() {
  return (
    <LegalPageShell
      title="Engineering Disclaimer"
      documentName="Engineering Disclaimer"
    />
  );
}
