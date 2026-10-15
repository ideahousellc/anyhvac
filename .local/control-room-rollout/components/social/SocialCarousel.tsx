import { SocialSlide } from "./SocialSlide";
import styles from "./social.module.css";

export function SocialCarousel() {
  return (
    <section className={styles.carousel} aria-label="Instagram carousel previews">
      <SocialSlide number={1} variant="cover">
        <div className={styles.coverGrid} aria-hidden="true" />
        <div className={styles.airflowLines} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className={styles.coverBody}>
          <p className={styles.eyebrow}>Design resources for the work that matters</p>
          <h2>HVAC tools.<br /><span>Made simple.</span></h2>
          <p className={styles.lede}>
            Free calculators &amp; practical resources<br />
            for HVAC professionals and designers.
          </p>
        </div>
        <div className={styles.coverInterface} aria-hidden="true">
          <div className={styles.interfaceHeader}>
            <span />
            <span />
            <span />
          </div>
          <div className={styles.interfaceMetrics}>
            <div>
              <span>Airflow</span>
              <strong>2,500 <small>CFM</small></strong>
            </div>
            <div>
              <span>Velocity</span>
              <strong>850 <small>FPM</small></strong>
            </div>
          </div>
        </div>
      </SocialSlide>

      <SocialSlide number={2} variant="simple">
        <div className={styles.standardHeading}>
          <p className={styles.eyebrow}>Built to keep work moving</p>
          <h2>Less searching.<br /><span>More designing.</span></h2>
          <p className={styles.bodyCopy}>
            AnyHVAC is a growing collection of free HVAC calculators, design
            tools and quick-reference resources.
          </p>
        </div>
        <div className={styles.promiseGrid} aria-label="AnyHVAC promises">
          {[
            ["01", "No account."],
            ["02", "No subscription."],
            ["03", "Just useful HVAC tools."],
          ].map(([index, statement]) => (
            <div className={styles.promiseCard} key={statement}>
              <span>{index}</span>
              <strong>{statement}</strong>
            </div>
          ))}
        </div>
      </SocialSlide>

      <SocialSlide number={3} variant="tools">
        <div className={styles.standardHeading}>
          <p className={styles.eyebrow}>Explore the library</p>
          <h2>Tools already<br /><span>available</span></h2>
        </div>
        <ol className={styles.toolList}>
          {[
            "HVAC Duct Calculator",
            "Air Distribution Tools",
            "Psychrometric Calculator",
            "Mixed Air Calculator",
            "HVAC Design References",
          ].map((tool, index) => (
            <li key={tool}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{tool}</strong>
              <i aria-hidden="true" />
            </li>
          ))}
        </ol>
      </SocialSlide>

      <SocialSlide number={4} variant="roadmap">
        <div className={styles.roadmapHeading}>
          <p className={styles.eyebrow}>The roadmap</p>
          <h2>We&apos;re just<br /><span>getting started.</span></h2>
        </div>
        <ul className={styles.roadmapList}>
          {[
            "New calculators",
            "HVAC design references",
            "Quick engineering tips",
            "Tool demonstrations",
            "Practical HVAC content",
          ].map((item, index) => (
            <li key={item}>
              <span aria-hidden="true">{index + 1}</span>
              <strong>{item}</strong>
            </li>
          ))}
        </ul>
        <p className={styles.roadmapNote}>One useful resource at a time.</p>
      </SocialSlide>

      <SocialSlide number={5} variant="cta">
        <div className={styles.ctaBody}>
          <p className={styles.eyebrow}>Ready when you are</p>
          <h2>Free HVAC tools<br /><span>are waiting.</span></h2>
          <div className={styles.urlCard}>
            <span>Visit</span>
            <strong>anyhvac.net</strong>
            <i aria-hidden="true">↗</i>
          </div>
          <p className={styles.followCopy}>
            Follow <strong>@anyhvac</strong> as we build the library.
          </p>
        </div>
      </SocialSlide>
    </section>
  );
}
