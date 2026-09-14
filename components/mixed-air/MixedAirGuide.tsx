"use client";

import { ToolGuide, type ToolGuideSection } from "../ToolGuide";
import guideStyles from "../duct-calculator/DuctSizingGuide.module.css";
import { calculateMixedAir } from "../../lib/psychrometrics/mixing";
import { humidityRatioToGrainsPerPound } from "../../lib/psychrometrics";

const example = calculateMixedAir({
  unitSystem: "IP",
  outdoorAir: { airflow: 500, dryBulb: 90, relativeHumidity: 50 },
  returnAir: { airflow: 1500, dryBulb: 75, relativeHumidity: 50 },
  pressureMode: "elevation",
  elevation: 0,
});
if (!example.ok) throw new Error("The Mixed Air Guide example could not be calculated.");
const exampleState = example.value.mixedState;

const sections: readonly ToolGuideSection[] = [
  {
    id: "mixed-air-how-to-use", label: "How to Use", title: "How to Use the Mixed Air Calculator",
    content: <><p>Enter outdoor-air airflow, dry-bulb temperature, and relative humidity. Then enter the return-air values and select elevation-derived pressure or manual atmospheric pressure.</p><p>Current Weather can optionally populate outdoor dry bulb and relative humidity. The loaded values remain editable, and airflow always stays manual. Select Calculate Mixed Air to review the resulting state.</p></>,
  },
  {
    id: "mixed-air-definition", label: "What Is Mixed Air?", title: "What Is Mixed Air?",
    content: <><p>Mixed air is the condition produced after two air streams combine. In a typical HVAC system, outdoor ventilation air mixes with return air from conditioned spaces before the combined stream is heated, cooled, or otherwise conditioned.</p></>,
  },
  {
    id: "mixed-air-streams", label: "Outdoor & Return Air", title: "Outdoor and Return Air",
    content: <><p>Outdoor air introduces ventilation air and its current heat and moisture conditions. Return air comes back from conditioned spaces.</p><p>The proportions of the streams strongly affect the mixed condition. The displayed percentages use entered volumetric airflow, while the psychrometric calculation accounts for each stream&apos;s specific volume.</p></>,
  },
  {
    id: "mixed-air-method", label: "Mixing Method", title: "Dry-Air Mass Mixing Method",
    content: <><p>AnyHVAC calculates each incoming psychrometric state with the locked engine, converts airflow to dry-air mass flow using specific volume, conserves moisture and enthalpy, and derives the final state at the common project pressure.</p><p><strong>Relative humidity is not directly averaged.</strong> It is calculated from the conserved mixed humidity ratio, mixed enthalpy, and pressure.</p></>,
  },
  {
    id: "mixed-air-results", label: "Understanding Results", title: "Understanding Mixed-Air Results",
    content: <><p>Dry bulb is ordinary air temperature; wet bulb reflects evaporative cooling; dew point indicates actual moisture content; and relative humidity compares vapor content with saturation at the mixed temperature.</p><p>Humidity ratio reports water-vapor mass per dry-air mass. Enthalpy represents moist-air energy, specific volume links air volume to dry-air mass, and OA/RA percentages show the entered volumetric proportions.</p></>,
  },
  {
    id: "mixed-air-example", label: "Example", title: "Example Mixed-Air Calculation",
    content: <><p>At sea level, mix 500 CFM of 90°F / 50% RH outdoor air with 1,500 CFM of 75°F / 50% RH return air. The implemented solver calculates:</p><dl className={guideStyles.exampleValues}><div><dt>Total airflow:</dt><dd>{example.value.totalInputAirflow.toFixed(0)} CFM</dd></div><div><dt>Outdoor / return air:</dt><dd>{example.value.outdoorAirPercent.toFixed(1)}% / {example.value.returnAirPercent.toFixed(1)}%</dd></div><div><dt>Mixed dry bulb:</dt><dd>{exampleState.dryBulb.toFixed(1)}°F</dd></div><div><dt>Mixed relative humidity:</dt><dd>{exampleState.relativeHumidity.toFixed(1)}%</dd></div><div><dt>Mixed humidity ratio:</dt><dd>{humidityRatioToGrainsPerPound(exampleState.humidityRatio).toFixed(1)} grains/lb</dd></div><div><dt>Mixed enthalpy:</dt><dd>{exampleState.enthalpy.toFixed(1)} Btu/lb</dd></div></dl></>,
  },
  {
    id: "mixed-air-applications", label: "HVAC Applications", title: "HVAC Applications",
    content: <><p>Mixed-air calculations support outdoor-air ventilation reviews, AHU mixing-section analysis, economizer analysis, troubleshooting, commissioning, and estimates of the entering condition at a coil.</p><p>This V1 tool describes the mixed state only; it does not calculate coil loads or leaving-air conditions.</p></>,
  },
  {
    id: "mixed-air-faq", label: "FAQ", title: "Mixed Air Calculator FAQ",
    content: <div className={guideStyles.faqList}>
      <div><h4>What is mixed air in HVAC?</h4><p>It is the combined air state formed when streams such as outdoor air and return air meet in a mixing section.</p></div>
      <div><h4>How is mixed-air temperature calculated?</h4><p>The calculator conserves enthalpy and humidity ratio on a dry-air mass basis, then recovers dry bulb with PsychroLib.</p></div>
      <div><h4>Why shouldn&apos;t relative humidity be directly averaged?</h4><p>Relative humidity changes with temperature and pressure; it is not a conserved moisture quantity.</p></div>
      <div><h4>Why does airflow matter?</h4><p>Each stream&apos;s airflow and specific volume determine how much dry-air mass it contributes.</p></div>
      <div><h4>Why does elevation matter?</h4><p>Elevation changes atmospheric pressure, which changes moist-air properties and specific volume.</p></div>
      <div><h4>Can I use current weather for outdoor air?</h4><p>Yes. It is an optional autofill for outdoor dry bulb and relative humidity, and you can edit both values afterward.</p></div>
      <div><h4>Is current weather the same as HVAC design weather?</h4><p>No. Current weather is a present observation or model value, not a design condition selected for equipment sizing.</p></div>
      <div><h4>What happens if mixed air reaches saturation?</h4><p>The tool returns a condensation warning instead of clamping the result, because a single-phase adiabatic mixing model is then insufficient.</p></div>
      <div><h4>Can I use this calculator for final engineering design?</h4><p>Results are informational and should be independently verified before final design, construction, equipment selection, permitting, or other safety-critical use, as stated in the AnyHVAC Engineering Notice.</p></div>
    </div>,
  },
];

export function MixedAirGuide() {
  return <ToolGuide id="mixed-air-guide" title="Mixed Air Guide" subtitle="Practical explanations for combining outdoor and return air and understanding mixed-air conditions." topicsLabel="Mixed air guide topics" sections={sections} />;
}
