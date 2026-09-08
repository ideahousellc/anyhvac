import type { Metadata } from "next";

import {
  ContentPage,
  ContentSection,
  PrincipleGrid,
  StatusPanel,
} from "@/components/ContentPage";
import { NewsletterCTA } from "@/components/NewsletterCTA";
import { SupportLink } from "@/components/SupportLink";

export const metadata: Metadata = {
  title: "About AnyHVAC | AnyHVAC",
  description:
    "Learn why AnyHVAC is building free, practical, and transparent HVAC tools and resources.",
};

const principles = [
  {
    title: "Practical",
    description:
      "Built around common HVAC design, field, and engineering workflows.",
  },
  {
    title: "Transparent",
    description:
      "Calculations and assumptions should be understandable, not hidden behind a black box.",
  },
  {
    title: "Accessible",
    description:
      "Core AnyHVAC tools are intended to remain free and easy to access.",
  },
  {
    title: "Independent",
    description:
      "Support, sponsorships, affiliate relationships, and advertising do not affect calculation results or engineering outcomes. Paid relationships will never change a result or determine the best engineering choice.",
  },
];

export default function AboutPage() {
  return (
    <ContentPage
      compact
      eyebrow="About AnyHVAC"
      title="Practical HVAC tools. Free and easy to use."
      intro="AnyHVAC started with a simple idea: everyday HVAC calculations shouldn't require jumping between multiple websites, spreadsheets, reference books, and disconnected tools."
    >
      <ContentSection title="Our Mission">
        <p>
          Build practical HVAC calculators, references, and resources that are
          easy to use, transparent in how they work, and available without a
          paywall.
        </p>
      </ContentSection>

      <NewsletterCTA />

      <ContentSection title="Our Approach">
        <PrincipleGrid items={principles} />
      </ContentSection>

      <ContentSection title="What&apos;s Coming">
        <p>The platform is planned to grow with:</p>
        <ul>
          <li>More HVAC calculators</li>
          <li>Code and standards navigation resources</li>
          <li>Manufacturer and equipment resources</li>
          <li>Additional practical reference tools</li>
        </ul>
      </ContentSection>

      <ContentSection title="Support AnyHVAC">
        <StatusPanel>
          <h3>Support AnyHVAC</h3>
          <p>
            AnyHVAC is free to use. If the tools save you time, you can
            optionally support future development.
          </p>
          <SupportLink
            variant="button"
            aria-label="Support AnyHVAC"
          />
        </StatusPanel>
      </ContentSection>
    </ContentPage>
  );
}
