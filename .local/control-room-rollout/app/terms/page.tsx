import type { Metadata } from "next";
import Link from "next/link";

import { ContentSection } from "@/components/ContentPage";
import { LegalPageShell } from "@/components/LegalPageShell";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Use | AnyHVAC",
  description:
    "Terms governing access to and use of AnyHVAC calculators, tools, reference materials, content, and related services.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Use"
      intro={'Welcome to AnyHVAC. These Terms of Use ("Terms") govern your access to and use of the AnyHVAC website, calculators, tools, reference materials, content, and related services. By accessing or using AnyHVAC, you agree to these Terms. If you do not agree with these Terms, please do not use AnyHVAC.'}
    >
      <ContentSection title="1. About AnyHVAC">
        <p>
          AnyHVAC provides free HVAC calculators, technical tools, reference materials,
          educational information, and related resources intended to assist HVAC
          professionals, designers, technicians, students, and other users.
        </p>
        <p>
          AnyHVAC is currently provided as an independent project and is not represented
          as being operated by a limited liability company, engineering firm,
          manufacturer, standards organization, government agency, or authority having
          jurisdiction.
        </p>
        <p>
          AnyHVAC may introduce additional tools, services, features, partnerships,
          advertising, sponsorships, or other functionality over time.
        </p>
      </ContentSection>

      <ContentSection title="2. Engineering and Technical Information">
        <p>
          AnyHVAC calculators and technical information are provided for informational,
          educational, and design-assistance purposes. Results should not be treated as
          a substitute for professional judgment, project-specific engineering analysis,
          applicable codes and standards, manufacturer requirements, or review by the
          authority having jurisdiction.
        </p>
        <p>
          Users are responsible for verifying inputs, assumptions, calculations,
          results, units, code requirements, equipment information, and suitability for
          the intended application. Please review the full <Link href="/engineering-disclaimer">Engineering Disclaimer</Link>.
        </p>
      </ContentSection>

      <ContentSection title="3. No Professional Relationship">
        <p>
          Use of AnyHVAC does not create an engineer-client, architect-client,
          consultant-client, contractor-client, or other professional relationship.
          AnyHVAC&apos;s general website tools and content do not constitute project-specific
          professional engineering or consulting services. Users are responsible for
          obtaining qualified professional services where required.
        </p>
      </ContentSection>

      <ContentSection title="4. Permitted Use">
        <p>
          You may use AnyHVAC lawfully for personal, educational, professional,
          commercial, design, field, and engineering-related purposes. You may use
          results generated through normal use in your own work and may share links to
          public AnyHVAC pages.
        </p>
      </ContentSection>

      <ContentSection title="5. Prohibited Use">
        <p>You may not:</p>
        <ul>
          <li>Intentionally disrupt the service or engage in security abuse</li>
          <li>Attempt unauthorized access to systems, accounts, or data</li>
          <li>Use abusive or excessive automated scraping that materially impairs the service</li>
          <li>Misrepresent AnyHVAC content or branding as another product</li>
          <li>Remove copyright, attribution, or legal notices</li>
          <li>Use AnyHVAC for unlawful, fraudulent, or malicious purposes</li>
          <li>Bypass or attempt to bypass security measures</li>
          <li>Violate applicable law or another person&apos;s rights</li>
        </ul>
      </ContentSection>

      <ContentSection title="6. Intellectual Property">
        <p>
          The AnyHVAC name and branding, original website design, explanatory content,
          software interfaces, and original materials are protected by applicable
          intellectual-property laws. AnyHVAC does not claim ownership over generally
          known engineering formulas or principles merely because they are implemented
          in an AnyHVAC calculator.
        </p>
        <p>
          Users may use calculation results generated through normal use of AnyHVAC in
          their own work, reports, designs, studies, estimates, or projects. These Terms
          do not grant permission to copy, rebrand, or resell a substantially duplicated
          version of AnyHVAC&apos;s original software, design, content, or branding.
        </p>
      </ContentSection>

      <ContentSection title="7. Codes, Standards, and Third-Party Materials">
        <p>
          Codes, standards, manufacturer materials, and other third-party content remain
          the property of their respective owners. References or summaries provided by
          AnyHVAC are for convenience and are not substitutes for current official
          sources. Users should consult the official source and applicable local
          requirements before relying on third-party materials.
        </p>
      </ContentSection>

      <ContentSection title="8. Third-Party Services">
        <p>
          AnyHVAC may use third-party providers for hosting, newsletters, payments,
          analytics, advertising, and technical resources. Current examples include
          Stripe for payment processing and beehiiv for newsletter services. Those
          services are governed by their own terms and privacy practices.
        </p>
      </ContentSection>

      <ContentSection title="9. Optional Financial Support">
        <p>
          AnyHVAC may accept voluntary financial support. Support AnyHVAC payments are
          optional and are not required to use the core free tools. Financial support
          does not purchase professional engineering or consulting services, create a
          professional relationship, influence calculator results, guarantee development
          of requested features, or provide ownership rights in AnyHVAC.
        </p>
      </ContentSection>

      <ContentSection title="10. Advertising, Sponsorships, and Affiliate Relationships">
        <p>
          AnyHVAC may introduce advertising, sponsorships, affiliate relationships,
          referral relationships, or other commercial arrangements. These relationships
          will be disclosed where required or appropriate and will not determine or
          alter calculation results or engineering outcomes. Paid relationships will not
          make equipment the preferred engineering choice solely because of payment.
        </p>
      </ContentSection>

      <ContentSection title="11. Newsletter and Communications">
        <p>
          Newsletter subscription is voluntary and is not required to use the core
          tools. Communications may include new tool announcements, AnyHVAC updates,
          HVAC references, educational material, technical resources, and occasional
          sponsored, affiliate, or commercial content where applicable. Subscribers can
          unsubscribe using the mechanism included in newsletter emails.
        </p>
      </ContentSection>

      <ContentSection title="12. Availability and Changes">
        <p>
          AnyHVAC does not guarantee permanent or uninterrupted availability. Tools,
          features, references, and content may be corrected, modified, suspended, or
          discontinued, and calculator versions and methods may evolve over time.
        </p>
      </ContentSection>

      <ContentSection title="13. Feedback and Suggestions">
        <p>
          AnyHVAC may use suggestions, comments, and other feedback voluntarily submitted
          by users to improve or develop the service without compensation. Do not submit
          confidential, proprietary, or sensitive information through general feedback
          channels.
        </p>
      </ContentSection>

      <ContentSection title="14. Disclaimer of Warranties">
        <p>
          To the extent permitted by applicable law, AnyHVAC and its website,
          calculators, tools, content, and related services are provided &quot;as is&quot; and
          &quot;as available.&quot; We do not guarantee uninterrupted availability, completeness,
          accuracy, reliability, suitability for a particular purpose or project, or
          freedom from errors. Additional technical limitations are described in the <Link href="/engineering-disclaimer">Engineering Disclaimer</Link>.
        </p>
      </ContentSection>

      <ContentSection title="15. Limitation of Liability">
        <p>
          To the extent permitted by applicable law, AnyHVAC and the persons involved in
          creating, operating, or maintaining it will not be liable for indirect,
          incidental, special, consequential, or similar damages arising from reliance
          on or use of the website, calculators, results, references, external links, or
          other content.
        </p>
        <p>
          Users remain responsible for independently reviewing and verifying information
          before applying it to real-world engineering, construction, equipment-selection,
          installation, or operational decisions. Nothing in these Terms is intended to
          exclude or limit liability that cannot lawfully be excluded or limited.
        </p>
      </ContentSection>

      <ContentSection title="16. Indemnification">
        <p>
          To the extent permitted by applicable law, users are responsible for claims,
          losses, liabilities, and reasonable costs arising from their unlawful use of
          AnyHVAC, violation of these Terms, or infringement of another person&apos;s rights.
          This provision does not shift responsibility to users for matters for which
          AnyHVAC is legally responsible.
        </p>
      </ContentSection>

      <ContentSection title="17. Privacy">
        <p>
          AnyHVAC&apos;s collection and use of information are described in the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </ContentSection>

      <ContentSection title="18. Governing Law">
        <p>
          These Terms are governed by the laws of the State of Ohio, United States,
          without regard to conflict-of-law principles, except where applicable law
          requires otherwise.
        </p>
      </ContentSection>

      <ContentSection title="19. Changes to These Terms">
        <p>
          AnyHVAC may update these Terms as the website, tools, technologies, or services
          evolve. The Last Updated date at the top identifies the most recent revision.
          Continued use of AnyHVAC after an update is subject to the then-current Terms.
        </p>
      </ContentSection>

      <ContentSection title="20. Contact">
        <p>
          Questions about these Terms may be submitted through the AnyHVAC <Link href="/contact">Contact page</Link>.
          You may also email{" "}
          <a href="mailto:contact@anyhvac.net">contact@anyhvac.net</a>.
        </p>
      </ContentSection>
    </LegalPageShell>
  );
}
