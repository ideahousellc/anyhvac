import type { Metadata } from "next";
import Link from "next/link";

import {
  ContentPage,
  ContentSection,
  PrincipleGrid,
  StatusPanel,
} from "@/components/ContentPage";
import { NewsletterCTA } from "@/components/NewsletterCTA";
import { SupportLink } from "@/components/SupportLink";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "About AnyHVAC | Free HVAC Tools",
  description:
    "Learn why AnyHVAC is building free, practical, and transparent HVAC tools and resources.",
  path: "/about",
});

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

      <ContentSection title="Project background">
        <p>
          AnyHVAC is a project by Idea House, focused on practical HVAC design
          relationships: airflow, duct geometry, pressure loss, moist-air
          properties and air mixing. Calculators are paired with explanations,
          worked examples and references so users can understand the inputs and
          interpret the results in a project context.
        </p>
        <p>
          The site provides calculation and reference assistance, not
          project-specific professional engineering services. Use the methods
          alongside applicable specifications, codes, manufacturer data and
          professional judgment. Read the <Link href="/engineering-disclaimer">Engineering Disclaimer</Link> for the full scope and limitations.
        </p>
      </ContentSection>

      <ContentSection title="Calculation methods and references">
        <p>
          The method depends on the question being answered. References support
          understanding of the approach; they do not constitute an endorsement,
          certification or independent review of AnyHVAC.
        </p>
        <ul>
          <li>
            <Link href="/tools/duct-calculator">Duct sizing</Link> uses an
            equal-friction approach with round and rectangular comparisons.
            The <Link href="/resources/duct-design-quick-reference">Duct Design Quick Reference</Link> explains sizing relationships and project checks,
            with <a href="https://handbook.ashrae.org/Handbooks/F25/IP/F25_Ch21/F25_Ch21_ip.aspx" target="_blank" rel="noreferrer">ASHRAE Handbook—Fundamentals, Duct Design</a> as a technical reference.
          </li>
          <li>
            <Link href="/tools/psychrometric-calculator">Psychrometric properties</Link> are calculated with the MIT-licensed <a href="https://github.com/psychrometrics/psychrolib" target="_blank" rel="noreferrer">PsychroLib</a> backend,
            with explicit unit, moisture-input and atmospheric-pressure handling.
          </li>
          <li>
            <Link href="/tools/mixed-air-calculator">Mixed-air analysis</Link> converts
            incoming airflow to dry-air mass flow using specific volume, then
            balances humidity ratio and enthalpy at a common pressure. It uses
            the same psychrometric property engine and reports a warning when
            the single-phase mixing model reaches saturation.
          </li>
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
