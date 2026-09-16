import Image from "next/image";
import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { SearchImpressionsChart } from "@/components/admin/SearchImpressionsChart";
import {
  ADMIN_METRICS,
  ADMIN_QUICK_LINKS,
  ADMIN_SYSTEM_STATUS,
  integrationStateLabel,
} from "@/lib/admin/integrations/catalog";
import type { ControlRoomIntegrations } from "@/lib/admin/integrations/load";

import styles from "./ControlRoomDashboard.module.css";

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

const DEFAULT_INTEGRATIONS: ControlRoomIntegrations = {
  beehiiv: { state: "not-connected", data: null },
  googleSearch: { state: "not-connected", data: null },
  resend: { state: "not-connected", data: null },
};

function formatMetric(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatRate(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

export function ControlRoomDashboard({
  integrations = DEFAULT_INTEGRATIONS,
}: {
  integrations?: ControlRoomIntegrations;
}) {
  const emailSnapshot = integrations.resend;
  const newsletterSnapshot = integrations.beehiiv;
  const searchSnapshot = integrations.googleSearch;
  const metrics = ADMIN_METRICS.map((metric) =>
    metric.id === "email" ? { ...metric, state: emailSnapshot.state }
      : metric.id === "newsletter" ? { ...metric, state: newsletterSnapshot.state }
        : metric.id === "search" ? { ...metric, state: searchSnapshot.state } : metric,
  );
  const systemStatus = ADMIN_SYSTEM_STATUS.map((service) =>
    service.id === "email" ? { ...service, state: emailSnapshot.state }
      : service.id === "newsletter" ? { ...service, state: newsletterSnapshot.state }
        : service.id === "search" ? { ...service, state: searchSnapshot.state } : service,
  );

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
          {metrics.map((metric) => (
            <article className={styles.metricCard} key={metric.id}>
              <p className={styles.provider}>{metric.provider}</p>
              <h3>{metric.label}</h3>
              {metric.id === "search" && searchSnapshot.state === "connected" ? (
                <div className={styles.emailMetrics} data-state="connected">
                  <p className={styles.emailPrimary}>
                    <strong>{formatMetric(searchSnapshot.data.impressions)}</strong> impressions
                  </p>
                  <p className={styles.searchDetail}>
                    {formatMetric(searchSnapshot.data.clicks)} clicks · {searchSnapshot.data.ctr === null
                      ? "— CTR" : `${formatRate(searchSnapshot.data.ctr)}% CTR`}
                  </p>
                  <p className={styles.searchDetail}>
                    Avg position {searchSnapshot.data.averagePosition === null
                      ? "—" : formatRate(searchSnapshot.data.averagePosition)}
                  </p>
                  <p className={styles.metricPeriod}>Last 28 finalized days</p>
                </div>
              ) : metric.id === "newsletter" && newsletterSnapshot.state === "connected" ? (
                <div className={styles.emailMetrics} data-state="connected">
                  <p className={styles.emailPrimary}>
                    <strong>{formatMetric(newsletterSnapshot.data.activeSubscribers)}</strong> subscribers
                  </p>
                  <p className={styles.newsletterRate}>
                    {newsletterSnapshot.data.averageOpenRate === null
                      ? "— avg. open"
                      : `${formatRate(newsletterSnapshot.data.averageOpenRate)}% avg. open`}
                  </p>
                  <p className={styles.newsletterRate}>
                    {newsletterSnapshot.data.averageClickRate === null
                      ? "— avg. click"
                      : `${formatRate(newsletterSnapshot.data.averageClickRate)}% avg. click`}
                  </p>
                </div>
              ) : metric.id === "email" && emailSnapshot.state === "connected" ? (
                <div className={styles.emailMetrics} data-state="connected">
                  <p className={styles.emailPrimary}>
                    <strong>{formatMetric(emailSnapshot.data.sent)}</strong> sent
                  </p>
                  <p className={styles.emailRate}>
                    {emailSnapshot.data.deliveryRate === null
                      ? "—"
                      : `${formatRate(emailSnapshot.data.deliveryRate)}% delivered`}
                  </p>
                  <p className={styles.emailBreakdown}>
                    Delivered {formatMetric(emailSnapshot.data.delivered)} · Failed {formatMetric(emailSnapshot.data.failed)} · Bounced {formatMetric(emailSnapshot.data.bounced)}
                  </p>
                  <p className={styles.metricPeriod}>Last 30 days</p>
                </div>
              ) : (
                <p className={styles.metricValue} data-state={metric.state}>
                  {metric.value ?? integrationStateLabel(metric.state)}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="performance-heading">
        <div className={styles.sectionTitle}>
          <p>Performance</p>
          <h2 id="performance-heading">Traffic &amp; search trends</h2>
        </div>
        {searchSnapshot.state === "connected" ? (
          <SearchImpressionsChart metrics={searchSnapshot.data} />
        ) : (
        <div className={styles.chartEmpty}>
          <div className={styles.chartMark} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <strong>Trend data not connected</strong>
          <p>Traffic and search performance will appear here after a provider is connected.</p>
        </div>
        )}
      </section>

      <div className={styles.lowerGrid}>
        <section className={styles.section} aria-labelledby="status-heading">
          <div className={styles.sectionTitle}>
            <p>System Status</p>
            <h2 id="status-heading">System Health</h2>
          </div>
          <div className={styles.statusList}>
            {systemStatus.map((service) => (
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
            <h2 id="access-heading">Quick Access</h2>
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
