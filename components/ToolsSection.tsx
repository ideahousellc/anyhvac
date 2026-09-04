import Link from "next/link";

import { HVAC_TOOLS, type ToolIconName } from "@/data/tools";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ToolIcon({ name }: { name: ToolIconName }) {
  if (name === "duct") {
    return (
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
        <path d="M5 10h15v12H5zM20 13h7v6h-7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 10v12M24 13v6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "cooling") {
    return (
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
        <path d="M16 5v22M8.2 9.5l15.6 13M8.2 22.5l15.6-13M12.5 7.8 16 11l3.5-3.2M12.5 24.2 16 21l3.5 3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "airflow") {
    return (
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
        <path d="M5 10h15.5c3 0 3-4 0-4-1.6 0-2.4.8-2.7 1.7M5 16h20c3.2 0 3.2-4.5 0-4.5-1.7 0-2.6.9-2.9 1.9M5 22h13.5c3 0 3 4 0 4-1.6 0-2.4-.8-2.7-1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
      <path d="M16 4s7 8.1 7 14a7 7 0 1 1-14 0c0-5.9 7-14 7-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12.5 19.5a3.8 3.8 0 0 0 5 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const homepageTools = HVAC_TOOLS.filter((tool) => tool.showOnHomepage);

function ToolCardContents({ tool }: { tool: (typeof homepageTools)[number] }) {
  return (
    <>
      <div className="tool-card-top">
        <span className="tool-icon"><ToolIcon name={tool.icon} /></span>
        <span className={`tool-status ${tool.status === "Available" ? "tool-status--available" : ""}`}>
          {tool.status}
        </span>
      </div>
      <div className="tool-card-copy">
        <h3>{tool.title}</h3>
        <p>{tool.description}</p>
      </div>
      {tool.cta ? (
        <span className="tool-card-cta">
          {tool.cta}
          <ArrowIcon />
        </span>
      ) : null}
    </>
  );
}

export function ToolsSection() {
  return (
    <section className="tools-section page-shell" id="tools" aria-labelledby="tools-title">
      <div className="tools-heading">
        <p className="tools-eyebrow">HVAC Calculators</p>
        <h2 id="tools-title">Tools built for real HVAC work.</h2>
        <p>
          Fast, practical calculators designed for HVAC professionals, engineers,
          designers, and students.
        </p>
      </div>

      <div className="tools-grid">
        {homepageTools.map((tool) =>
          tool.status === "Available" && tool.href ? (
            <Link
              className="tool-card tool-card--available"
              href={tool.href}
              aria-label={`Open ${tool.title}`}
              key={tool.id}
            >
              <ToolCardContents tool={tool} />
            </Link>
          ) : (
            <article className="tool-card tool-card--soon" key={tool.id}>
              <ToolCardContents tool={tool} />
            </article>
          ),
        )}
      </div>

      <div className="tools-footer">
        <Link className="secondary-action" href="/tools">
          View All Tools
          <ArrowIcon />
        </Link>
      </div>
    </section>
  );
}
