import type { Metadata } from "next";
import Link from "next/link";

import { ContentSection } from "@/components/ContentPage";
import { LegalPageShell } from "@/components/LegalPageShell";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy | AnyHVAC",
  description:
    "How AnyHVAC may collect, use, share, and protect information across its website, calculators, newsletter, contact, and support features.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      intro="AnyHVAC respects your privacy. This Privacy Policy explains what information may be collected when you use the AnyHVAC website, calculators, newsletter, contact features, support/payment features, and related services, and how that information may be used. By using AnyHVAC, you acknowledge the practices described in this Privacy Policy."
    >
      <ContentSection title="1. Information You Provide">
        <p>
          When you subscribe to the newsletter, information collected may include your
          email address, subscription status, signup or referral information, newsletter
          engagement, and information you voluntarily supply through a form. AnyHVAC
          currently uses beehiiv to provide newsletter services. You may unsubscribe
          through the unsubscribe mechanism included in newsletter emails.
        </p>
        <p>
          Contact and feedback features may ask for an optional name, optional email
          address, reason for contact, comments, questions, suggestions, issues, and
          technical information you voluntarily provide. AnyHVAC uses Resend to deliver
          contact-form submissions by email.
        </p>
      </ContentSection>

      <ContentSection title="2. HVAC Calculator Inputs">
        <p>
          Technical inputs may include airflow, velocity, dimensions, pressure,
          friction, and other values needed to perform an HVAC calculation. Core
          calculators currently do not require an account or personally identifying
          information. Internet infrastructure used to deliver the site may still
          generate routine logs and diagnostic information as described below.
        </p>
      </ContentSection>

      <ContentSection title="3. Optional Financial Support">
        <p>
          AnyHVAC currently uses Stripe to process voluntary financial support. Stripe
          processes payment and transaction information under its own terms and privacy
          practices. AnyHVAC does not directly collect or store your full credit-card
          number, CVC, or complete payment credentials through its own servers.
        </p>
        <p>
          Stripe may provide transaction and contact information associated with a
          payment, such as a name, email address, transaction amount, status, and payment
          reference. Financial support is optional and does not influence calculator or
          engineering results.
        </p>
      </ContentSection>

      <ContentSection title="4. Information Collected Automatically">
        <p>
          When you use AnyHVAC, site infrastructure and service providers may collect
          information such as your IP address, browser and device type, operating system,
          referring page, pages visited, approximate location derived from IP address,
          timestamps, usage information, and diagnostic, security, or performance data.
          The exact information collected depends on the service and how you access the site.
        </p>
      </ContentSection>

      <ContentSection title="5. Browser Storage and Similar Technologies">
        <p>
          AnyHVAC uses or may use browser-local storage, cookies, and similar technologies
          to remember settings and support site features. Current local-storage keys may
          include <code>anyhvac-support-prompt-seen</code>, which remembers that a support
          prompt has been shown, and <code>anyhvac-newsletter-last-prompt-date</code>, which
          helps manage newsletter-prompt timing. <code>anyhvac-newsletter-subscribed</code>
          may be used when a reliable subscription signal becomes available. Theme or
          interface preferences may also be stored where applicable.
        </p>
        <p>
          Browser controls may allow you to remove or block cookies and local storage,
          although doing so can affect site preferences or features. Third-party providers
          may use their own cookies or similar technologies under their own policies.
        </p>
      </ContentSection>

      <ContentSection title="6. Analytics">
        <p>
          AnyHVAC uses Cloudflare Web Analytics to understand general website usage and
          performance. It helps us understand information such as page views, visits,
          referral sources, general device and browser information, and website
          performance metrics, including Core Web Vitals.
        </p>
        <p>
          Cloudflare describes Web Analytics as a privacy-first analytics service that
          does not use cookies for visitor analytics and is not designed to track
          individual users across websites. You can learn more in the{" "}
          <a href="https://developers.cloudflare.com/web-analytics/about/">
            Cloudflare Web Analytics documentation
          </a>.
        </p>
        <p>
          Analytics information is used to understand how AnyHVAC is used, identify
          performance issues, improve tools and content, and help guide future
          development. AnyHVAC does not use Cloudflare Web Analytics to alter HVAC
          calculation results or engineering outcomes based on a visitor&apos;s identity or
          behavior.
        </p>
      </ContentSection>

      <ContentSection title="7. How We Use Information">
        <p>Information may be used to:</p>
        <ul>
          <li>Operate and provide the website, calculators, and related tools</li>
          <li>Manage and deliver newsletters</li>
          <li>Process voluntary financial support</li>
          <li>Receive and respond to feedback and support requests</li>
          <li>Investigate reported calculator issues</li>
          <li>Understand usage and improve tools, content, and user experience</li>
          <li>Maintain security and perform diagnostics</li>
          <li>Comply with applicable legal obligations</li>
        </ul>
        <p>
          Newsletter subscription and financial support do not alter calculator results
          or engineering outcomes.
        </p>
      </ContentSection>

      <ContentSection title="8. How Information May Be Shared">
        <p>
          AnyHVAC does not sell personal information simply because someone uses an HVAC
          calculator. Information may be shared with service providers when reasonably
          necessary to operate the site and requested features. Current relevant providers
          include beehiiv for newsletters, Stripe for payments, and Resend for contact
          email delivery. Providers process information under their own terms, privacy
          practices, and legal obligations.
        </p>
        <p>
          Information may also be disclosed when required by law, to protect rights or
          security, or in connection with a future reorganization or transition of site
          operations into a future business entity, subject to applicable law and
          appropriate notice where required.
        </p>
      </ContentSection>

      <ContentSection title="9. Advertising and Affiliate Relationships">
        <p>
          AnyHVAC may introduce advertising, sponsorship, affiliate, or referral
          technologies in the future. This Policy and any necessary consent mechanisms
          will be updated as appropriate. Commercial relationships will not determine or
          alter engineering calculations or results.
        </p>
      </ContentSection>

      <ContentSection title="10. Data Retention">
        <p>
          Information may be retained for as long as reasonably necessary for the purpose
          for which it was collected, to operate services, resolve issues, maintain
          security, and satisfy legal or recordkeeping obligations. Newsletter and payment
          providers may maintain records according to their own practices and applicable
          legal requirements. Retention periods can vary by the type of information and service.
        </p>
      </ContentSection>

      <ContentSection title="11. Data Security">
        <p>
          AnyHVAC and its service providers use reasonable administrative, technical, and
          organizational measures appropriate to the nature of the information handled.
          No website, transmission method, or storage system can be guaranteed to be
          completely secure.
        </p>
      </ContentSection>

      <ContentSection title="12. Your Choices">
        <p>You may:</p>
        <ul>
          <li>Unsubscribe from newsletter emails using the included unsubscribe mechanism</li>
          <li>Choose whether to provide optional information through contact features</li>
          <li>Decline voluntary financial support</li>
          <li>Use browser controls to manage cookies and local storage</li>
          <li>Use core calculators without subscribing to the newsletter</li>
          <li>Exercise applicable privacy rights available in your location</li>
        </ul>
        <p>
          Requests concerning applicable privacy rights may be submitted through the
          AnyHVAC <Link href="/contact">Contact page</Link> or emailed to{" "}
          <a href="mailto:contact@anyhvac.net">contact@anyhvac.net</a>.
        </p>
      </ContentSection>

      <ContentSection title="13. Children&apos;s Privacy">
        <p>
          AnyHVAC is a technical HVAC resource and is not directed specifically toward
          children under 13. We do not knowingly seek personal information from children
          under 13. If you believe a child has provided personal information through the
          service, please use the <Link href="/contact">Contact page</Link> to notify us.
        </p>
      </ContentSection>

      <ContentSection title="14. International Visitors">
        <p>
          AnyHVAC is operated from the United States. If you access the site from another
          country, information may be processed in the United States or other jurisdictions
          where service providers operate. Data-protection laws in those jurisdictions may
          differ from those in your location.
        </p>
      </ContentSection>

      <ContentSection title="15. Third-Party Links">
        <p>
          AnyHVAC may link to third-party websites, documents, and services. Those third
          parties have independent privacy policies and practices, and AnyHVAC does not
          control their collection or use of information.
        </p>
      </ContentSection>

      <ContentSection title="16. Do Not Track and Privacy Signals">
        <p>
          Browsers and devices may offer Do Not Track or other privacy preference signals.
          Because technical and legal standards for responding to these signals continue
          to develop, AnyHVAC does not currently promise a specific automated response.
          AnyHVAC will evaluate applicable requirements and update its practices and this
          Policy as appropriate.
        </p>
      </ContentSection>

      <ContentSection title="17. Changes to This Privacy Policy">
        <p>
          AnyHVAC may update this Privacy Policy as the website, tools, providers, or
          practices evolve. The Last Updated date at the top identifies the most recent
          revision. Continued use of AnyHVAC after an update is subject to the then-current
          version of this Policy.
        </p>
      </ContentSection>

      <ContentSection title="18. Contact Regarding Privacy">
        <p>
          Privacy questions or requests may be submitted through the AnyHVAC <Link href="/contact">Contact page</Link>.
          You may also email{" "}
          <a href="mailto:contact@anyhvac.net">contact@anyhvac.net</a>.
        </p>
      </ContentSection>
    </LegalPageShell>
  );
}
