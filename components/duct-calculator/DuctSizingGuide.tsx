"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./DuctSizingGuide.module.css";

type GuideSection = {
  id: string;
  label: string;
  title: string;
  content: React.ReactNode;
};

const guideSections: readonly GuideSection[] = [
  {
    id: "how-to-size",
    label: "How to Size",
    title: "How to Size HVAC Ductwork",
    content: (
      <>
        <p>
          Proper duct sizing balances airflow, friction loss, velocity, available
          space, and system requirements. The AnyHVAC Duct Calculator uses airflow
          and friction rate to determine a calculated round duct diameter and helps
          evaluate practical round and rectangular duct sizes.
        </p>
        <p>
          Enter the required airflow (CFM) and friction rate (in. w.g. per 100 ft)
          to calculate the duct size. The results also show air velocity and the
          actual friction rate associated with the selected nominal duct size.
        </p>
      </>
    ),
  },
  {
    id: "understanding-results",
    label: "Results",
    title: "Understanding the Results",
    content: (
      <>
        <h4>Calculated Diameter</h4>
        <p>
          The calculated diameter is the theoretical round duct diameter required
          for the entered airflow and friction rate.
        </p>
        <p>
          Because manufactured duct sizes typically use standard nominal
          dimensions, the calculated diameter may fall between available sizes.
          The calculator therefore also provides a suggested nominal round duct
          size.
        </p>
        <h4>Air Velocity</h4>
        <p>
          Air velocity indicates how quickly air moves through the duct and is
          expressed in feet per minute (FPM).
        </p>
        <p>
          For the same airflow, a smaller duct produces a higher velocity while a
          larger duct produces a lower velocity. Velocity can affect system
          pressure loss, noise, air distribution, and overall system performance.
        </p>
        <p>
          The calculator displays velocity so the selected duct size can be
          evaluated as part of the overall design rather than based on duct
          diameter alone.
        </p>
        <h4>Actual Friction Rate</h4>
        <p>
          When the calculated diameter is converted to a nominal duct size, the
          resulting friction rate may differ slightly from the original design
          friction rate.
        </p>
        <p>
          AnyHVAC calculates the actual friction rate of the selected nominal size,
          allowing you to see how the practical duct selection compares with the
          original design target.
        </p>
      </>
    ),
  },
  {
    id: "round-and-rectangular",
    label: "Round & Rectangular",
    title: "Round and Rectangular Duct Sizing",
    content: (
      <>
        <p>
          Round duct is commonly used because of its efficient airflow
          characteristics and relatively low surface area for a given
          cross-sectional area. However, building conditions do not always allow
          round ductwork.
        </p>
        <p>
          Rectangular duct is often required where ceiling height, structure,
          equipment, or other building systems limit available space.
        </p>
        <p>
          The AnyHVAC Duct Calculator provides rectangular duct recommendations
          based on the required equivalent duct performance. A fixed dimension can
          be used when one side of the duct must fit within a specific space.
        </p>
        <p>
          For example, when vertical clearance is limited, a designer may establish
          the maximum duct height and determine the corresponding width required to
          provide suitable airflow performance.
        </p>
        <p>
          Rectangular alternatives should still be reviewed for velocity, friction
          loss, aspect ratio, available space, and project requirements before
          final selection.
        </p>
      </>
    ),
  },
  {
    id: "friction-rate",
    label: "Friction Rate",
    title: "Understanding Duct Friction Rate",
    content: (
      <>
        <p>
          Friction rate represents the pressure loss caused by air moving through
          ductwork and is commonly expressed as:
        </p>
        <p className={styles.formula}>in. w.g. per 100 ft of duct</p>
        <p>
          As air travels through a duct, friction between the moving air and the
          duct surface creates resistance. Duct size, airflow, duct material,
          geometry, fittings, and system configuration all influence total pressure
          loss.
        </p>
        <p>
          A lower friction rate generally requires a larger duct for the same
          airflow, while a higher friction rate generally results in a smaller duct
          and higher air velocity.
        </p>
        <p>
          The appropriate design friction rate depends on the system and project
          requirements. It should not be selected solely because a particular value
          is commonly used.
        </p>
      </>
    ),
  },
  {
    id: "airflow-size-velocity",
    label: "Airflow & Velocity",
    title: "Airflow, Duct Size, and Velocity",
    content: (
      <>
        <p>
          Airflow is expressed in cubic feet per minute (CFM) and represents the
          volume of air moving through the duct.
        </p>
        <p>Air velocity depends on both airflow and duct cross-sectional area:</p>
        <p className={styles.formula}>
          Velocity (FPM) = Airflow (CFM) &divide; Duct Area (ft&sup2;)
        </p>
        <p>
          For example, increasing airflow through the same duct increases velocity.
          Increasing the duct size while maintaining the same airflow decreases
          velocity.
        </p>
        <p>
          This relationship is one reason duct sizing should consider more than
          simply finding a duct capable of carrying the required CFM.
        </p>
      </>
    ),
  },
  {
    id: "example-calculation",
    label: "Example Calculation",
    title: "Example HVAC Duct Calculation",
    content: (
      <>
        <p>Suppose a duct must carry:</p>
        <dl className={styles.exampleValues}>
          <div>
            <dt>Airflow:</dt>
            <dd>5,000 CFM</dd>
          </div>
          <div>
            <dt>Design friction rate:</dt>
            <dd>0.10 in. w.g./100 ft</dd>
          </div>
        </dl>
        <p>
          Using the AnyHVAC Duct Calculator produces a calculated round diameter of
          approximately:
        </p>
        <p className={styles.formula}>25.6 inches</p>
        <p>A practical nominal selection would therefore be:</p>
        <p className={styles.formula}>26-inch round duct</p>
        <p>At that nominal size, the calculator indicates approximately:</p>
        <dl className={styles.exampleValues}>
          <div>
            <dt>Air velocity:</dt>
            <dd>1,356 FPM</dd>
          </div>
          <div>
            <dt>Actual friction rate:</dt>
            <dd>0.092 in. w.g./100 ft</dd>
          </div>
        </dl>
        <p>
          This illustrates why the calculator provides both the theoretical
          calculated diameter and the performance of the practical nominal duct
          selection.
        </p>
        <p>
          The final duct size should still be evaluated within the complete HVAC
          system design.
        </p>
      </>
    ),
  },
  {
    id: "frequently-asked-questions",
    label: "FAQ",
    title: "Frequently Asked Questions",
    content: (
      <div className={styles.faqList}>
        <div>
          <h4>What size duct do I need for a certain CFM?</h4>
          <p>
            Duct size cannot be determined from CFM alone. The required size also
            depends on the selected friction rate and resulting air velocity, along
            with system and project requirements.
          </p>
          <p>
            Enter the airflow and design friction rate into the AnyHVAC Duct
            Calculator to determine an appropriate starting duct size.
          </p>
        </div>
        <div>
          <h4>What is friction rate in duct design?</h4>
          <p>
            Friction rate describes the pressure loss caused by air moving through
            a length of duct. In U.S. HVAC design, it is commonly expressed in
            inches of water gauge per 100 feet of duct.
          </p>
        </div>
        <div>
          <h4>Does a larger duct reduce air velocity?</h4>
          <p>
            Yes. For the same airflow, increasing the duct cross-sectional area
            reduces air velocity.
          </p>
        </div>
        <div>
          <h4>Does a larger duct reduce friction loss?</h4>
          <p>
            Generally, yes. For the same airflow and comparable duct conditions,
            increasing duct size reduces velocity and friction loss.
          </p>
        </div>
        <div>
          <h4>Can I convert a round duct size to rectangular duct?</h4>
          <p>
            A rectangular duct can be selected to provide performance comparable to
            a round duct, but it should not be converted based on cross-sectional
            area alone.
          </p>
          <p>
            Equivalent duct relationships account for the different friction
            characteristics of round and rectangular ducts.
          </p>
        </div>
        <div>
          <h4>Why is the nominal duct size different from the calculated diameter?</h4>
          <p>
            The calculated diameter represents the theoretical size required for
            the entered conditions. Actual ductwork is generally constructed using
            practical nominal dimensions.
          </p>
          <p>
            AnyHVAC therefore provides both the calculated diameter and a suggested
            nominal size and recalculates the resulting velocity and friction rate.
          </p>
        </div>
        <div>
          <h4>Is 0.10 in. w.g./100 ft always the correct friction rate?</h4>
          <p>
            No. 0.10 in. w.g./100 ft should not be treated as a universal design
            requirement.
          </p>
          <p>
            The appropriate friction rate depends on the HVAC system, available
            static pressure, duct configuration, acoustical requirements, design
            method, applicable standards, and project conditions.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "equal-friction-method",
    label: "Equal Friction Method",
    title: "Equal Friction Method",
    content: (
      <p>
        The equal friction method sizes ductwork around a consistent friction
        rate while maintaining the airflow required by the system.
      </p>
    ),
  },
];

export function DuctSizingGuide() {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const contentRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!selectedSection) return;

    const content = contentRefs.current.get(selectedSection);
    if (!content) return;

    const updateHeight = () => setPanelHeight(content.scrollHeight);
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, [selectedSection]);

  function toggleSection(id: string) {
    const nextSection = selectedSection === id ? null : id;
    const nextContent = nextSection
      ? contentRefs.current.get(nextSection)
      : null;

    setPanelHeight(nextContent?.scrollHeight ?? 0);
    setSelectedSection(nextSection);
  }

  return (
    <section
      className={styles.guide}
      aria-labelledby="duct-sizing-guide-title"
    >
      <header className={styles.heading}>
        <h2 id="duct-sizing-guide-title">Duct Sizing Guide</h2>
        <p>
          Practical explanations for using the calculator and understanding the
          results.
        </p>
      </header>

      <div className={styles.topicMenu} aria-label="Duct sizing guide topics">
        {guideSections.map((section) => {
          const isOpen = selectedSection === section.id;

          return (
            <button
              className={`${styles.topicButton} ${isOpen ? styles.active : ""}`}
              id={`${section.id}-button`}
              key={section.id}
              type="button"
              aria-controls="duct-sizing-guide-panel"
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
        id="duct-sizing-guide-panel"
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
              {guideSections.map((section) => {
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
