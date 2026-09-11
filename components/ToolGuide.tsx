"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import styles from "./duct-calculator/DuctSizingGuide.module.css";

export type ToolGuideSection = {
  id: string;
  label: string;
  title: string;
  content: ReactNode;
};

export function nextGuideSelection(
  selectedSection: string | null,
  requestedSection: string,
): string | null {
  return selectedSection === requestedSection ? null : requestedSection;
}

type ToolGuideProps = {
  id: string;
  title: string;
  subtitle: string;
  topicsLabel: string;
  sections: readonly ToolGuideSection[];
};

export function ToolGuide({
  id,
  title,
  subtitle,
  topicsLabel,
  sections,
}: ToolGuideProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const contentRefs = useRef(new Map<string, HTMLElement>());
  const panelId = `${id}-panel`;

  useEffect(() => {
    if (!selectedSection) return;

    const content = contentRefs.current.get(selectedSection);
    if (!content) return;

    const updateHeight = () => setPanelHeight(content.scrollHeight);
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, [selectedSection]);

  function toggleSection(sectionId: string) {
    const nextSection = nextGuideSelection(selectedSection, sectionId);
    const nextContent = nextSection ? contentRefs.current.get(nextSection) : null;

    setPanelHeight(nextContent?.scrollHeight ?? 0);
    setSelectedSection(nextSection);
  }

  return (
    <section className={styles.guide} aria-labelledby={`${id}-title`}>
      <header className={styles.heading}>
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{subtitle}</p>
      </header>

      <div className={styles.topicMenu} aria-label={topicsLabel}>
        {sections.map((section) => {
          const isOpen = selectedSection === section.id;

          return (
            <button
              className={`${styles.topicButton} ${isOpen ? styles.active : ""}`}
              id={`${section.id}-button`}
              key={section.id}
              type="button"
              aria-controls={panelId}
              aria-expanded={isOpen}
              onClick={() => toggleSection(section.id)}
            >
              <span>{section.label}</span>
              <span className={styles.indicator} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div
        className={`${styles.panel} ${selectedSection ? styles.panelOpen : ""}`}
        id={panelId}
        role="region"
        aria-live="polite"
        aria-labelledby={
          selectedSection ? `${selectedSection}-button` : undefined
        }
        aria-hidden={!selectedSection}
      >
        <div className={styles.panelClip}>
          <div className={styles.panelCard}>
            <div className={styles.contentStage} style={{ height: panelHeight }}>
              {sections.map((section) => {
                const isActive = selectedSection === section.id;

                return (
                  <article
                    className={`${styles.topicContent} ${isActive ? styles.contentActive : ""}`}
                    key={section.id}
                    ref={(node) => {
                      if (node) contentRefs.current.set(section.id, node);
                      else contentRefs.current.delete(section.id);
                    }}
                    aria-hidden={!isActive}
                  >
                    <h3>{section.title}</h3>
                    <div className={styles.panelContent}>{section.content}</div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
