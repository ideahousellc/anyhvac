import { HeroEquipment } from "@/components/HeroEquipment";

const features = [
  { title: "100% Free", detail: "Always will be." },
  { title: "Fast & Accurate", detail: "Built for real work." },
  { title: "No Sign Up", detail: "Open and easy." },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="hero page-shell" id="top" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">Free tools for better HVAC work</p>
        <h1 id="hero-title">
          <span>HVAC tools.</span>
          <strong>Made simple.</strong>
        </h1>
        <p className="hero-description">
          Free calculators and practical tools for HVAC professionals and designers.
        </p>

        <ul className="feature-list" aria-label="Why use AnyHVAC">
          {features.map((feature) => (
            <li key={feature.title}>
              <span className="feature-check" aria-hidden="true">✓</span>
              <span>
                <strong>{feature.title}</strong>
                <small>{feature.detail}</small>
              </span>
            </li>
          ))}
        </ul>

        <a className="primary-cta" href="#tools">
          Explore HVAC Tools
          <ArrowIcon />
        </a>
      </div>

      <div className="hero-visual">
        <HeroEquipment />
      </div>
    </section>
  );
}
