import Link from "next/link";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DuctIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
      <path d="M5 10h15v12H5zM20 13h7v6h-7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 10v12M24 13v6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CoolingIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
      <path d="M16 5v22M8.2 9.5l15.6 13M8.2 22.5l15.6-13M12.5 7.8 16 11l3.5-3.2M12.5 24.2 16 21l3.5 3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AirflowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
      <path d="M5 10h15.5c3 0 3-4 0-4-1.6 0-2.4.8-2.7 1.7M5 16h20c3.2 0 3.2-4.5 0-4.5-1.7 0-2.6.9-2.9 1.9M5 22h13.5c3 0 3 4 0 4-1.6 0-2.4-.8-2.7-1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PsychrometricIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
      <path d="M16 4s7 8.1 7 14a7 7 0 1 1-14 0c0-5.9 7-14 7-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12.5 19.5a3.8 3.8 0 0 0 5 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const comingSoonTools = [
  {
    title: "Cooling Load Calculator",
    description: "Estimate heating and cooling loads for HVAC system planning.",
    icon: <CoolingIcon />,
  },
  {
    title: "Airflow Calculator",
    description: "Quickly calculate airflow, velocity, and duct area relationships.",
    icon: <AirflowIcon />,
  },
  {
    title: "Psychrometric Tools",
    description: "Work with temperature, humidity, enthalpy, and air properties.",
    icon: <PsychrometricIcon />,
  },
];

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
        <Link
          className="tool-card tool-card--available"
          href="/tools/duct-calculator"
          aria-label="Open HVAC Duct Calculator"
        >
          <div className="tool-card-top">
            <span className="tool-icon"><DuctIcon /></span>
            <span className="tool-status tool-status--available">Available</span>
          </div>
          <div className="tool-card-copy">
            <h3>HVAC Duct Calculator</h3>
            <p>Size round and rectangular ductwork using airflow, friction rate, and velocity.</p>
          </div>
          <span className="tool-card-cta">
            Open Calculator
            <ArrowIcon />
          </span>
        </Link>

        {comingSoonTools.map((tool) => (
          <article className="tool-card tool-card--soon" key={tool.title}>
            <div className="tool-card-top">
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-status">Coming Soon</span>
            </div>
            <div className="tool-card-copy">
              <h3>{tool.title}</h3>
              <p>{tool.description}</p>
            </div>
          </article>
        ))}
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
