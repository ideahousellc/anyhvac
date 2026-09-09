import Image from "next/image";
import Link from "next/link";

import { NewsletterCTA } from "@/components/NewsletterCTA";
import { NewsletterTrigger } from "@/components/ModalTriggers";
import { SupportLink } from "@/components/SupportLink";

import styles from "./Footer.module.css";

const toolLinks = [
  { label: "All Tools", href: "/tools" },
  { label: "HVAC Duct Calculator", href: "/tools/duct-calculator" },
  { label: "Air Distribution Tools", href: "/tools/air-distribution" },
];

const legalLinks = [
  { label: "Engineering Disclaimer", href: "/engineering-disclaimer" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
];

function FooterLinks({
  heading,
  links,
}: {
  heading: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div className={styles.linkGroup}>
      <h2>{heading}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className={styles.footer} aria-label="Site footer">
      <div className={`page-shell ${styles.inner}`}>
        <div className={styles.grid}>
          <div className={styles.brandColumn}>
            <Link className={styles.brand} href="/" aria-label="AnyHVAC home">
              <Image src="/Favicon.png" alt="" width={44} height={44} />
              <span>
                Any<strong>HVAC</strong>
              </span>
            </Link>
            <p>
              Free, practical HVAC calculators and resources for professionals,
              designers, technicians, and students.
            </p>
          </div>

          <FooterLinks heading="Tools" links={toolLinks} />

          <div className={styles.linkGroup}>
            <h2>Resources</h2>
            <ul className={styles.futureList}>
              <li>
                <span>Resources</span>
                <small>Coming soon</small>
              </li>
              <li>
                <span>Codes &amp; Standards</span>
                <small>Coming soon</small>
              </li>
            </ul>
          </div>

          <div className={styles.linkGroup}>
            <h2>Company</h2>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li>
                <SupportLink />
              </li>
              <li>
                <NewsletterTrigger>
                  Newsletter
                </NewsletterTrigger>
              </li>
            </ul>
          </div>
          <FooterLinks heading="Legal" links={legalLinks} />
        </div>

        <NewsletterCTA compact />

        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} AnyHVAC.</p>
          <p>A project by Idea House.</p>
        </div>
      </div>
    </footer>
  );
}
