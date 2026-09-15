import Image from "next/image";
import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import {
  ADMIN_METRICS,
  ADMIN_QUICK_LINKS,
  ADMIN_SYSTEM_STATUS,
  integrationStateLabel,
} from "@/lib/admin/integrations/catalog";

import styles from "./ControlRoomDashboard.module.css";

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export function ControlRoomDashboard() {
  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <Image
            src="/Horizontal Logo.png"
            alt="AnyHVAC"
            width={2073}
            height={758}
            priority
          />
          <div>
            <p>AnyHVAC Admin</p>
            <h1>Control Room</h1>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.mailButton} href="/admin/mail">Mail</Link>
          <AdminLogoutButton />
        </div>
      </header>

      <section className={styles.section} aria-labelledby="overview-heading">
        <div className={styles.sectionTitle}>
          <p>Overview</p>
          <h2 id="overview-heading">At a glance</h2>
        </div>
        <div className={styles.metricGrid}>
          {ADMIN_METRICS.map((metric) => (
            <article className={styles.metricCard} key={metric.id}>
              <p className={styles.provider}>{metric.provider}</p>
              <h3>{metric.label}</h3>
              <p className={styles.metricValue} data-state={metric.state}>
                {metric.value ?? integrationStateLabel(metric.state)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="performance-heading">
        <div className={styles.sectionTitle}>
          <p>Performance</p>
          <h2 id="performance-heading">Traffic &amp; search trends</h2>
        </div>
        <div className={styles.chartEmpty}>
          <div className={styles.chartMark} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <strong>Trend data not connected</strong>
          <p>Traffic and search performance will appear here after a provider is connected.</p>
        </div>
      </section>

      <div className={styles.lowerGrid}>
        <section className={styles.section} aria-labelledby="status-heading">
          <div className={styles.sectionTitle}>
            <p>System Status</p>
            <h2 id="status-heading">Services</h2>
          </div>
          <div className={styles.statusList}>
            {ADMIN_SYSTEM_STATUS.map((service) => (
              <div className={styles.statusRow} key={service.id}>
                <div>
                  <strong>{service.label}</strong>
                  <span>{service.provider}</span>
                </div>
                <span className={styles.statusValue} data-state={service.state}>
                  {integrationStateLabel(service.state)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="access-heading">
          <div className={styles.sectionTitle}>
            <p>Quick Access</p>
            <h2 id="access-heading">Services</h2>
          </div>
          <div className={styles.quickGrid}>
            {ADMIN_QUICK_LINKS.map((link) =>
              link.external ? (
                <a
                  className={styles.quickLink}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  key={link.label}
                >
                  <span>{link.label}</span>
                  <ArrowIcon />
                </a>
              ) : (
                <Link className={styles.quickLink} href={link.href} key={link.label}>
                  <span>{link.label}</span>
                  <ArrowIcon />
                </Link>
              ),
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
