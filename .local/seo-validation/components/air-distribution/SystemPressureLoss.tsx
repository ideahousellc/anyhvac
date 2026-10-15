"use client";

import { useRef, useState } from "react";

import { InfoTip } from "@/components/units-and-terms/UnitsAndTerms";

import styles from "./SystemPressureLoss.module.css";

type DuctShape = "round" | "rectangular";

type LossItem = {
  id: number;
  label: string;
  pressureLoss: string;
};

type PathSection = {
  id: number;
  name: string;
  airflow: string;
  shape: DuctShape;
  diameter: string;
  width: string;
  height: string;
  length: string;
  frictionRate: string;
  lossItems: LossItem[];
};

type SectionCalculation = {
  valid: boolean;
  straightLength: number;
  straightLoss: number;
  componentLoss: number;
  totalLoss: number;
};

const LOSS_LABEL_SUGGESTIONS = [
  "90° Elbow",
  "Transition",
  "Fire Damper",
  "VAV Box",
  "Diffuser",
  "Grille",
  "Filter",
  "Coil",
  "Other",
];

function createSection(id: number): PathSection {
  return {
    id,
    name: `Section ${id}`,
    airflow: "",
    shape: "round",
    diameter: "",
    width: "",
    height: "",
    length: "",
    frictionRate: "",
    lossItems: [],
  };
}

function parseOptionalNonNegative(value: string) {
  if (value.trim() === "") return { valid: true, value: 0 };
  const parsed = Number(value);
  return {
    valid: Number.isFinite(parsed) && parsed >= 0,
    value: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
  };
}

function calculateSection(section: PathSection): SectionCalculation {
  const numericFields = [
    section.airflow,
    section.length,
    section.frictionRate,
    ...(section.shape === "round"
      ? [section.diameter]
      : [section.width, section.height]),
  ].map(parseOptionalNonNegative);
  const parsedLosses = section.lossItems.map((item) =>
    parseOptionalNonNegative(item.pressureLoss),
  );
  const valid = [...numericFields, ...parsedLosses].every((field) => field.valid);
  const straightLength = parseOptionalNonNegative(section.length).value;
  const frictionRate = parseOptionalNonNegative(section.frictionRate).value;
  const straightLoss = frictionRate * straightLength / 100;
  const componentLoss = parsedLosses.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  return {
    valid,
    straightLength,
    straightLoss,
    componentLoss,
    totalLoss: straightLoss + componentLoss,
  };
}

function formatLoss(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
}

function formatLength(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function NumericField({
  id,
  label,
  unit,
  value,
  onChange,
  step = "any",
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <span className={styles.inputRow}>
        <input
          id={id}
          type="number"
          min="0"
          step={step}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{unit}</span>
      </span>
    </div>
  );
}

function SectionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.sectionMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>in. w.g.</small>
    </div>
  );
}

export function SystemPressureLoss() {
  const [sections, setSections] = useState<PathSection[]>([createSection(1)]);
  const [availableStatic, setAvailableStatic] = useState("");
  const nextSectionId = useRef(2);
  const nextLossItemId = useRef(1);

  function updateSection(
    sectionId: number,
    field: keyof Omit<PathSection, "id" | "lossItems">,
    value: string,
  ) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section,
      ),
    );
  }

  function addSection() {
    const id = nextSectionId.current++;
    setSections((current) => [...current, createSection(id)]);
  }

  function addLossItem(sectionId: number) {
    const id = nextLossItemId.current++;
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              lossItems: [
                ...section.lossItems,
                { id, label: "", pressureLoss: "" },
              ],
            }
          : section,
      ),
    );
  }

  function updateLossItem(
    sectionId: number,
    itemId: number,
    field: "label" | "pressureLoss",
    value: string,
  ) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              lossItems: section.lossItems.map((item) =>
                item.id === itemId ? { ...item, [field]: value } : item,
              ),
            }
          : section,
      ),
    );
  }

  function removeLossItem(sectionId: number, itemId: number) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              lossItems: section.lossItems.filter((item) => item.id !== itemId),
            }
          : section,
      ),
    );
  }

  function resetSystem() {
    setSections([createSection(1)]);
    setAvailableStatic("");
    nextSectionId.current = 2;
    nextLossItemId.current = 1;
  }

  const calculations = sections.map(calculateSection);
  const pathIsValid = calculations.every((calculation) => calculation.valid);
  const totalLength = calculations.reduce(
    (sum, calculation) => sum + calculation.straightLength,
    0,
  );
  const totalStraightLoss = calculations.reduce(
    (sum, calculation) => sum + calculation.straightLoss,
    0,
  );
  const totalComponentLoss = calculations.reduce(
    (sum, calculation) => sum + calculation.componentLoss,
    0,
  );
  const totalSystemLoss = totalStraightLoss + totalComponentLoss;
  const parsedAvailableStatic = availableStatic.trim() === ""
    ? null
    : parseOptionalNonNegative(availableStatic);
  const remainingStatic =
    pathIsValid && parsedAvailableStatic?.valid
      ? parsedAvailableStatic.value - totalSystemLoss
      : null;

  return (
    <div className={styles.systemGrid}>
      <section className={styles.sectionsPanel} aria-labelledby="critical-path-title">
        <div className={styles.panelHeader}>
          <div>
            <p>Selected duct path</p>
            <h2 id="critical-path-title">Critical Path Sections</h2>
          </div>
          <button type="button" className={styles.addSectionButton} onClick={addSection}>
            + Add Section
          </button>
        </div>

        <datalist id="pressure-loss-label-suggestions">
          {LOSS_LABEL_SUGGESTIONS.map((label) => <option value={label} key={label} />)}
        </datalist>

        <div className={styles.sectionsList}>
          {sections.map((section, index) => {
            const calculation = calculations[index];
            return (
              <article className={styles.pathSection} key={section.id}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionNumber}>Section {index + 1}</span>
                  <label className={styles.sectionName}>
                    <span className={styles.srOnly}>Section name</span>
                    <input
                      type="text"
                      value={section.name}
                      aria-label={`Section ${index + 1} name`}
                      onChange={(event) => updateSection(section.id, "name", event.target.value)}
                    />
                  </label>
                  {sections.length > 1 ? (
                    <button
                      type="button"
                      className={styles.removeSectionButton}
                      onClick={() => setSections((current) => current.filter((item) => item.id !== section.id))}
                    >
                      Remove Section
                    </button>
                  ) : null}
                </div>

                <div className={styles.sectionFields}>
                  <NumericField id={`section-${section.id}-airflow`} label="Airflow" unit="CFM" value={section.airflow} onChange={(value) => updateSection(section.id, "airflow", value)} />
                  <div className={styles.field}>
                    <label htmlFor={`section-${section.id}-shape`}>Duct shape</label>
                    <select id={`section-${section.id}-shape`} value={section.shape} onChange={(event) => updateSection(section.id, "shape", event.target.value)}>
                      <option value="round">Round</option>
                      <option value="rectangular">Rectangular</option>
                    </select>
                  </div>
                  {section.shape === "round" ? (
                    <NumericField id={`section-${section.id}-diameter`} label="Diameter" unit="in" value={section.diameter} onChange={(value) => updateSection(section.id, "diameter", value)} />
                  ) : (
                    <>
                      <NumericField id={`section-${section.id}-width`} label="Width" unit="in" value={section.width} onChange={(value) => updateSection(section.id, "width", value)} />
                      <NumericField id={`section-${section.id}-height`} label="Height" unit="in" value={section.height} onChange={(value) => updateSection(section.id, "height", value)} />
                    </>
                  )}
                  <NumericField id={`section-${section.id}-length`} label="Straight duct length" unit="ft" value={section.length} onChange={(value) => updateSection(section.id, "length", value)} />
                  <NumericField id={`section-${section.id}-friction`} label="Friction rate" unit="in. w.g./100 ft" step="0.01" value={section.frictionRate} onChange={(value) => updateSection(section.id, "frictionRate", value)} />
                </div>

                <div className={styles.lossItems}>
                  <div className={styles.lossItemsHeading}>
                    <h3>Fitting / component losses</h3>
                    <button type="button" onClick={() => addLossItem(section.id)}>+ Add Loss Item</button>
                  </div>
                  {section.lossItems.length ? (
                    <div className={styles.lossItemList}>
                      {section.lossItems.map((item) => (
                        <div className={styles.lossItem} key={item.id}>
                          <label>
                            <span className={styles.srOnly}>Loss item label</span>
                            <input
                              type="text"
                              list="pressure-loss-label-suggestions"
                              placeholder="e.g., 90° Elbow"
                              aria-label="Loss item label"
                              value={item.label}
                              onChange={(event) => updateLossItem(section.id, item.id, "label", event.target.value)}
                            />
                          </label>
                          <label className={styles.lossValue}>
                            <span className={styles.srOnly}>{item.label || "Loss item"} pressure loss</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              aria-label={`${item.label || "Loss item"} pressure loss`}
                              value={item.pressureLoss}
                              onChange={(event) => updateLossItem(section.id, item.id, "pressureLoss", event.target.value)}
                            />
                            <span>in. w.g.</span>
                          </label>
                          <button type="button" className={styles.removeLossButton} aria-label={`Remove ${item.label || "loss item"}`} onClick={() => removeLossItem(section.id, item.id)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyLosses}>No fitting or component losses added.</p>
                  )}
                </div>

                {!calculation.valid ? (
                  <p className={styles.validation} role="alert">Use blank, zero, or positive numbers for this section.</p>
                ) : null}

                <div className={styles.sectionTotals} aria-live="polite">
                  <SectionMetric label="Straight duct loss" value={calculation.valid ? formatLoss(calculation.straightLoss) : "—"} />
                  <SectionMetric label="Fitting / component loss" value={calculation.valid ? formatLoss(calculation.componentLoss) : "—"} />
                  <SectionMetric label="Section total loss" value={calculation.valid ? formatLoss(calculation.totalLoss) : "—"} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className={styles.summaryPanel} aria-labelledby="pressure-summary-title">
        <div className={styles.summaryHeader}>
          <div>
            <p>Critical path summary</p>
            <h2 id="pressure-summary-title">System Pressure Summary</h2>
          </div>
          <button type="button" className={styles.resetButton} onClick={resetSystem}>Reset System</button>
        </div>

        <dl className={styles.summaryList}>
          <div><dt>Total sections</dt><dd>{sections.length}</dd></div>
          <div><dt>Total straight duct length</dt><dd>{pathIsValid ? `${formatLength(totalLength)} ft` : "—"}</dd></div>
          <div><dt>Total straight duct loss</dt><dd>{pathIsValid ? `${formatLoss(totalStraightLoss)} in. w.g.` : "—"}</dd></div>
          <div><dt>Total fitting / component losses</dt><dd>{pathIsValid ? `${formatLoss(totalComponentLoss)} in. w.g.` : "—"}</dd></div>
        </dl>

        <div className={styles.systemTotal} aria-live="polite">
          <span>Total System Pressure Loss</span>
          <strong>{pathIsValid ? formatLoss(totalSystemLoss) : "—"}</strong>
          <small>in. w.g.</small>
        </div>

        {!pathIsValid ? (
          <p className={styles.validation} role="alert">Correct negative or invalid section values to calculate the critical-path total.</p>
        ) : null}

        <div className={styles.staticComparison}>
          <div className={styles.staticLabel}>
            <label htmlFor="system-available-static">Available Static Pressure</label>
            <InfoTip label="Available Static Pressure">ASP — Static pressure available to overcome the calculated distribution-system pressure loss.</InfoTip>
          </div>
          <span className={styles.inputRow}>
            <input id="system-available-static" type="number" min="0" step="0.01" inputMode="decimal" value={availableStatic} onChange={(event) => setAvailableStatic(event.target.value)} />
            <span>in. w.g.</span>
          </span>

          {parsedAvailableStatic && !parsedAvailableStatic.valid ? (
            <p className={styles.validation} role="alert">Available static pressure must be zero or greater.</p>
          ) : null}
          {remainingStatic !== null ? (
            <div className={`${styles.remainingStatic} ${remainingStatic < 0 ? styles.overStatic : styles.withinStatic}`} aria-live="polite">
              <span>Remaining static</span>
              <strong>{formatLoss(remainingStatic)} in. w.g.</strong>
              <p>{remainingStatic < 0 ? "Calculated pressure loss exceeds the entered available static pressure." : "Entered available static pressure exceeds the calculated pressure loss."}</p>
            </div>
          ) : null}
        </div>

        <p className={styles.engineeringNotice}>Pressure-loss results depend on the friction rates and component losses entered by the user. Verify values using current manufacturer data, project criteria, and applicable engineering standards.</p>
      </aside>
    </div>
  );
}
