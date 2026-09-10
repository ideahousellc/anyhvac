import type { Metadata } from "next";

import {
  ContentPage,
  ContentSection,
  PrincipleGrid,
  StatusPanel,
} from "@/components/ContentPage";
import { ContactTrigger } from "@/components/ModalTriggers";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Contact | AnyHVAC",
  description:
    "Contact AnyHVAC to report a calculation issue, suggest a tool, or share general feedback.",
};

const contactReasons = [
  {
    title: "Report a Calculation Issue",
    description:
      "Tell us when a result appears incorrect or when a calculation needs clarification.",
  },
  {
    title: "Suggest a Tool",
    description:
      "Share an HVAC calculation or workflow that would be useful to have in one place.",
  },
  {
    title: "General Feedback",
    description:
      "Let us know what is working well or how the site experience could improve.",
  },
];

export default function ContactPage() {
  return (
    <ContentPage
      eyebrow="Contact"
      title="Get in touch."
      intro="Found an issue, have an idea for a tool, or want to suggest an improvement? We'd like to hear from you."
    >
      <ContentSection title="How We Can Help">
        <PrincipleGrid items={contactReasons} />
      </ContentSection>

      <ContentSection title="Contact AnyHVAC">
        <StatusPanel>
          <h3>Send us a message.</h3>
          <p>
            Use the form below, email general inquiries to{" "}
            <a href="mailto:contact@anyhvac.net">contact@anyhvac.net</a>, or
            send calculator and technical problems to{" "}
            <a href="mailto:support@anyhvac.net">support@anyhvac.net</a>.
          </p>
          <ContactTrigger className={styles.contactButton}>
            Contact AnyHVAC
          </ContactTrigger>
        </StatusPanel>
      </ContentSection>

      <ContentSection title="Reporting a Calculation Issue">
        <p>
          Use the contact form or email{" "}
          <a href="mailto:support@anyhvac.net">support@anyhvac.net</a>. To help
          us verify a technical issue, please include:
        </p>
        <ul>
          <li>The tool name</li>
          <li>The inputs used</li>
          <li>The result received</li>
          <li>The result expected, if known</li>
          <li>A screenshot, if useful</li>
        </ul>
      </ContentSection>
    </ContentPage>
  );
}
