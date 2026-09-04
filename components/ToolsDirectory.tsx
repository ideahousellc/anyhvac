"use client";

import Link from "next/link";
import { useState } from "react";

import {
  HVAC_TOOLS,
  TOOL_CATEGORIES,
  type HvacTool,
  type ToolIconName,
} from "@/data/tools";

import styles from "./ToolsDirectory.module.css";

const DIRECTORY_TOOLS = HVAC_TOOLS.filter((tool) => tool.showInDirectory);

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToolIcon({ name }: { name: ToolIconName }) {
  switch (name) {
    case "duct":
      return (
        <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
          <path
            d="M5 10h15v12H5zM20 13h7v6h-7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9 10v12M24 13v6"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "cooling":
      return (
        <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 5v22M8.2 9.5l15.6 13M8.2 22.5l15.6-13M12.5 7.8 16 11l3.5-3.2M12.5 24.2 16 21l3.5 3.2"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "airflow":
      return (
        <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
          <path
            d="M5 10h15.5c3 0 3-4 0-4-1.6 0-2.4.8-2.7 1.7M5 16h20c3.2 0 3.2-4.5 0-4.5-1.7 0-2.6.9-2.9 1.9M5 22h13.5c3 0 3 4 0 4-1.6 0-2.4-.8-2.7-1.7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "psychrometric":
      return (
        <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 4s7 8.1 7 14a7 7 0 1 1-14 0c0-5.9 7-14 7-14Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12.5 19.5a3.8 3.8 0 0 0 5 3.6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

function CardContents({ tool }: { tool: HvacTool }) {
  return (
    <>
      <div className={styles.cardTop}>
        <span className={styles.toolIcon}>
          <ToolIcon name={tool.icon} />
        </span>
        <span
          className={`${styles.status} ${
            tool.status === "Available" ? styles.availableStatus : ""
          }`}
        >
          {tool.status}
        </span>
      </div>
      <div className={styles.cardCopy}>
        <p className={styles.category}>{tool.category}</p>
        <h2>{tool.title}</h2>
        <p className={styles.description}>{tool.description}</p>
      </div>
      {tool.cta ? (
        <span className={styles.cta}>
          {tool.cta}
          <ArrowIcon />
        </span>
      ) : null}
    </>
  );
}

export function ToolsDirectory() {
  const [activeCategory, setActiveCategory] = useState<
    (typeof TOOL_CATEGORIES)[number]
  >("All Tools");

  const visibleTools =
    activeCategory === "All Tools"
      ? DIRECTORY_TOOLS
      : DIRECTORY_TOOLS.filter((tool) => tool.category === activeCategory);

  return (
    <section className={`page-shell ${styles.directory}`} id="tools">
      <div
        className={styles.categoryBar}
        role="group"
        aria-label="Filter tools by category"
      >
        {TOOL_CATEGORIES.map((category) => (
          <button
            className={`${styles.categoryButton} ${
              activeCategory === category ? styles.active : ""
            }`}
            type="button"
            aria-pressed={activeCategory === category}
            onClick={() => setActiveCategory(category)}
            key={category}
          >
            {category}
          </button>
        ))}
      </div>

      <div className={styles.toolsGrid} aria-live="polite">
        {visibleTools.map((tool) =>
          tool.status === "Available" && tool.href ? (
            <Link
              className={`${styles.toolCard} ${styles.availableCard}`}
              href={tool.href}
              aria-label={`Open ${tool.title}`}
              key={tool.id}
            >
              <CardContents tool={tool} />
            </Link>
          ) : (
            <article
              className={`${styles.toolCard} ${styles.soonCard}`}
              key={tool.id}
            >
              <CardContents tool={tool} />
            </article>
          ),
        )}
      </div>
    </section>
  );
}
