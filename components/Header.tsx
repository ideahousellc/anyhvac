"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6.75" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ThemeIcon({ dark }: { dark: boolean }) {
  return dark ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M20 15.1A8 8 0 0 1 8.9 4a8.15 8.15 0 1 0 11.1 11.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const navigation = ["Tools", "Resources", "About", "Contact"];

export function Header() {
  const [dark, setDark] = useState(false);

  function toggleTheme() {
    const nextTheme = !dark;
    setDark(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme);
  }

  return (
    <header className="site-header page-shell" aria-label="Site header">
      <div className="header-surface">
        <Link className="brand" href="/" aria-label="AnyHVAC home">
          <Image
            className="brand-mark"
            src="/Favicon.png"
            alt=""
            width={1254}
            height={1254}
            priority
          />
          <span className="brand-copy">
            <span className="brand-name"><span>Any</span><strong>HVAC</strong></span>
            <span className="brand-tagline">Free HVAC Calculators &amp; Tools</span>
          </span>
        </Link>

        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`}>{item}</a>
          ))}
        </nav>

        <div className="header-actions">
          <button className="icon-button" type="button" aria-label="Search">
            <SearchIcon />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
            aria-pressed={dark}
            onClick={toggleTheme}
          >
            <ThemeIcon dark={dark} />
          </button>
        </div>
      </div>
    </header>
  );
}
