import type { GoogleSearchMetrics } from "@/lib/admin/integrations/google-search-console/types";

import styles from "./ControlRoomDashboard.module.css";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

export function SearchImpressionsChart({ metrics }: { metrics: GoogleSearchMetrics }) {
  if (metrics.daily.length === 0) {
    return (
      <div className={styles.chartEmpty}>
        <strong>No finalized search data yet</strong>
        <p>Google Search has no daily impressions for this 28-day period.</p>
      </div>
    );
  }

  const startTime = Date.parse(`${metrics.startDate}T00:00:00Z`);
  const max = Math.max(...metrics.daily.map((day) => day.impressions));
  const top = 25;
  const baseline = 155;
  const height = baseline - top;
  const xStart = 52;
  const step = 27;
  const barWidth = 16;

  return (
    <div className={styles.searchChart}>
      <div className={styles.searchChartHeader}>
        <strong>Google Search impressions</strong>
        <span>Finalized through {formatDate(metrics.endDate)} · Pacific Time</span>
      </div>
      <div className={styles.searchChartScroll}>
        <svg
          viewBox="0 0 840 205"
          role="img"
          aria-label={`Daily Google Search impressions from ${metrics.startDate} through ${metrics.endDate}`}
        >
          {[0, 0.5, 1].map((fraction) => {
            const y = baseline - fraction * height;
            return (
              <g key={fraction}>
                <line x1="52" x2="814" y1={y} y2={y} className={styles.searchGridLine} />
                <text x="44" y={y + 4} textAnchor="end" className={styles.searchAxisText}>
                  {Math.round(max * fraction).toLocaleString("en-US")}
                </text>
              </g>
            );
          })}
          {metrics.daily.map((day) => {
            const index = Math.round((Date.parse(`${day.date}T00:00:00Z`) - startTime) / 86_400_000);
            const barHeight = max === 0 ? 0 : (day.impressions / max) * height;
            return (
              <rect
                key={day.date}
                x={xStart + index * step + (step - barWidth) / 2}
                y={baseline - barHeight}
                width={barWidth}
                height={barHeight}
                rx="3"
                className={styles.searchBar}
              >
                <title>{`${formatDate(day.date)}: ${day.impressions.toLocaleString("en-US")} impressions`}</title>
              </rect>
            );
          })}
          <text x={xStart} y="184" className={styles.searchAxisText}>{formatDate(metrics.startDate)}</text>
          <text x="814" y="184" textAnchor="end" className={styles.searchAxisText}>
            {formatDate(metrics.endDate)}
          </text>
        </svg>
      </div>
    </div>
  );
}
