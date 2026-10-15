"use client";

import { ToolGuide, type ToolGuideSection } from "../ToolGuide";
import {
  calculatePsychrometricState,
  humidityRatioToGrainsPerPound,
} from "../../lib/psychrometrics";
import guideStyles from "../duct-calculator/DuctSizingGuide.module.css";

const exampleResult = calculatePsychrometricState({
  unitSystem: "IP",
  dryBulb: 75,
  moistureMode: "relativeHumidity",
  moistureValue: 50,
  pressureMode: "elevation",
  elevation: 0,
});

if (!exampleResult.ok) {
  throw new Error("The Psychrometric Guide example state could not be calculated.");
}

const exampleState = exampleResult.value;

const guideSections: readonly ToolGuideSection[] = [
  {
    id: "psychrometric-how-to-use",
    label: "How to Use",
    title: "How to Use the Psychrometric Calculator",
    content: (
      <>
        <p>
          Select IP or SI units, enter the dry-bulb temperature, and choose a
          moisture input: relative humidity, wet-bulb temperature, or dew-point
          temperature. Then use elevation-derived pressure or enter the actual
          atmospheric pressure manually.
        </p>
        <p>
          The calculated air properties and chart marker update from that single
          air state. You can also click a valid chart location or drag the marker
          to explore other conditions while keeping the inputs and results
          synchronized.
        </p>
        <p>
          Pressure matters because the relationships between temperature,
          moisture, air density, and other moist-air properties change with
          atmospheric pressure and elevation.
        </p>
      </>
    ),
  },
  {
    id: "psychrometric-reading-chart",
    label: "Reading the Chart",
    title: "Reading the Psychrometric Chart",
    content: (
      <>
        <p>
          The horizontal axis shows dry-bulb temperature, and the vertical scale
          on the right shows humidity ratio. The curved upper boundary is the
          saturation curve, where relative humidity is 100%.
        </p>
        <p>
          Relative-humidity curves run through the chart. Other line families
          represent wet-bulb temperature, enthalpy, and specific volume. The
          selected point identifies one combination of these related air
          properties.
        </p>
        <p>
          A single moist-air state can therefore be described in several ways.
          Moving the point changes the complete set of properties together.
        </p>
      </>
    ),
  },
  {
    id: "psychrometric-dry-wet-bulb",
    label: "Dry & Wet Bulb",
    title: "Dry-Bulb and Wet-Bulb Temperature",
    content: (
      <>
        <h4>Dry-bulb temperature</h4>
        <p>
          Dry bulb is the ordinary air temperature measured without accounting
          for evaporative moisture effects.
        </p>
        <h4>Wet-bulb temperature</h4>
        <p>
          Wet bulb reflects the cooling caused by evaporation and is influenced
          by both air temperature and moisture content.
        </p>
        <p>
          For a valid psychrometric state, wet bulb normally cannot exceed dry
          bulb. As the air approaches saturation, the wet-bulb temperature
          approaches the dry-bulb temperature.
        </p>
      </>
    ),
  },
  {
    id: "psychrometric-humidity-dew-point",
    label: "Humidity & Dew Point",
    title: "Humidity and Dew Point",
    content: (
      <>
        <h4>Relative humidity</h4>
        <p>
          Relative humidity compares the air&apos;s current water-vapor content with
          the maximum possible at the same temperature and pressure.
        </p>
        <h4>Humidity ratio</h4>
        <p>
          Humidity ratio expresses the actual mass of water vapor per unit mass
          of dry air.
        </p>
        <h4>Dew point</h4>
        <p>
          Dew point is the temperature at which air reaches saturation when it is
          cooled without adding or removing moisture.
        </p>
        <p>
          Because relative humidity changes when temperature changes, dew point
          is often a more direct indicator of the air&apos;s actual moisture content.
        </p>
      </>
    ),
  },
  {
    id: "psychrometric-enthalpy-volume",
    label: "Enthalpy & Specific Volume",
    title: "Enthalpy and Specific Volume",
    content: (
      <>
        <h4>Enthalpy</h4>
        <p>
          Enthalpy represents the combined thermal energy associated with the dry
          air and its water vapor.
        </p>
        <h4>Specific volume</h4>
        <p>
          Specific volume is the volume occupied by the moist-air mixture per
          unit mass of dry air.
        </p>
        <p>
          HVAC designers use these properties to compare air states, understand
          air-conditioning processes, and evaluate how temperature, moisture,
          energy, and air volume relate to one another.
        </p>
      </>
    ),
  },
  {
    id: "psychrometric-example",
    label: "Example Calculation",
    title: "Example Psychrometric Calculation",
    content: (
      <>
        <p>Start with the calculator&apos;s default air state:</p>
        <dl className={guideStyles.exampleValues}>
          <div>
            <dt>Dry-bulb temperature:</dt>
            <dd>75.0°F</dd>
          </div>
          <div>
            <dt>Relative humidity:</dt>
            <dd>50.0%</dd>
          </div>
          <div>
            <dt>Elevation:</dt>
            <dd>0 ft</dd>
          </div>
          <div>
            <dt>Atmospheric pressure:</dt>
            <dd>{exampleState.atmosphericPressure.toFixed(3)} psi</dd>
          </div>
        </dl>
        <p>The locked psychrometric engine calculates:</p>
        <dl className={guideStyles.exampleValues}>
          <div>
            <dt>Wet-bulb temperature:</dt>
            <dd>{exampleState.wetBulb.toFixed(1)}°F</dd>
          </div>
          <div>
            <dt>Dew-point temperature:</dt>
            <dd>{exampleState.dewPoint.toFixed(1)}°F</dd>
          </div>
          <div>
            <dt>Humidity ratio:</dt>
            <dd>
              {humidityRatioToGrainsPerPound(exampleState.humidityRatio).toFixed(1)} grains/lb
            </dd>
          </div>
          <div>
            <dt>Enthalpy:</dt>
            <dd>{exampleState.enthalpy.toFixed(1)} Btu/lb</dd>
          </div>
          <div>
            <dt>Specific volume:</dt>
            <dd>{exampleState.specificVolume.toFixed(2)} ft³/lb</dd>
          </div>
        </dl>
        <p>
          On the chart, the point appears at 75°F on the dry-bulb axis and on the
          50% relative-humidity curve, below the saturation boundary. The other
          results describe that same plotted state.
        </p>
      </>
    ),
  },
  {
    id: "psychrometric-hvac-applications",
    label: "HVAC Applications",
    title: "HVAC Applications of Psychrometrics",
    content: (
      <>
        <p>
          A psychrometric calculator helps compare indoor and outdoor conditions,
          review cooling and dehumidification, and identify when humidification
          may be needed.
        </p>
        <p>
          It can also compare supply-air and room-air states, evaluate air
          properties at different elevations, and help technicians, designers,
          engineers, and students visualize how moist-air properties change
          together.
        </p>
        <p>
          These comparisons support HVAC analysis, but this guide does not add
          cooling-load, sensible-heat, latent-heat, air-mixing, or coil-leaving
          calculations.
        </p>
      </>
    ),
  },
  {
    id: "psychrometric-faq",
    label: "FAQ",
    title: "Psychrometric Calculator FAQ",
    content: (
      <div className={guideStyles.faqList}>
        <div>
          <h4>What is a psychrometric chart?</h4>
          <p>
            It is a graphical map of interrelated moist-air properties at a
            defined atmospheric pressure.
          </p>
        </div>
        <div>
          <h4>What is the difference between relative humidity and humidity ratio?</h4>
          <p>
            Relative humidity depends on temperature and pressure. Humidity ratio
            states the mass of water vapor relative to the mass of dry air.
          </p>
        </div>
        <div>
          <h4>Why does atmospheric pressure or elevation matter?</h4>
          <p>
            Atmospheric pressure decreases as elevation increases, changing the
            relationships used to calculate moist-air properties.
          </p>
        </div>
        <div>
          <h4>Can wet-bulb temperature be higher than dry-bulb temperature?</h4>
          <p>
            Not for a normal, valid psychrometric state. Wet bulb approaches dry
            bulb as the air approaches saturation.
          </p>
        </div>
        <div>
          <h4>What happens at 100% relative humidity?</h4>
          <p>
            The air is saturated at that temperature and pressure, and dry bulb,
            wet bulb, and dew point converge.
          </p>
        </div>
        <div>
          <h4>What is dew point used for in HVAC?</h4>
          <p>
            Dew point helps assess actual moisture content and when cooling a
            surface or air stream may lead to condensation.
          </p>
        </div>
        <div>
          <h4>Why does the chart change when elevation changes?</h4>
          <p>
            The psychrometric relationships and saturation boundary depend on
            atmospheric pressure, so the chart is regenerated for the selected
            elevation or pressure.
          </p>
        </div>
        <div>
          <h4>Can I click or drag directly on the AnyHVAC chart?</h4>
          <p>
            Yes. Click a valid chart location or drag the selected point to
            explore another state within the chart&apos;s valid range.
          </p>
        </div>
        <div>
          <h4>Does changing IP to SI change the physical air state?</h4>
          <p>
            No. It changes the displayed units while preserving the same physical
            air state, subject to normal display rounding.
          </p>
        </div>
        <div>
          <h4>Are these results suitable for final engineering design?</h4>
          <p>
            Results are informational and intended to assist design. They should
            be independently verified before final design, construction,
            equipment selection, permitting, or other safety-critical use, as
            stated in the AnyHVAC Engineering Notice.
          </p>
        </div>
      </div>
    ),
  },
];

export function PsychrometricGuide() {
  return (
    <ToolGuide
      id="psychrometric-guide"
      title="Psychrometric Guide"
      subtitle="Practical explanations for using the calculator, reading the chart, and understanding moist-air properties."
      topicsLabel="Psychrometric guide topics"
      sections={guideSections}
    />
  );
}
