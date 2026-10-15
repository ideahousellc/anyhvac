"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type HeroEquipmentItem = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

const heroEquipment: readonly HeroEquipmentItem[] = [
  { src: "/images/hero/AHU.png", alt: "Air handling unit" },
  {
    src: "/images/hero/Boiler.png",
    alt: "Commercial boiler",
    className: "hero-equipment-image--boiler",
    width: 1024,
    height: 1536,
  },
  { src: "/images/hero/Cooling-tower.png", alt: "Cooling tower" },
  { src: "/images/hero/Heat-pump.png", alt: "Outdoor heat pump" },
  { src: "/images/hero/Rooftop-unit.png", alt: "Rooftop HVAC unit" },
  { src: "/images/hero/Ductwork.png", alt: "HVAC ductwork and VAV air distribution" },
] as const;

const previousEquipmentKey = "anyhvac-previous-hero-equipment";

export function HeroEquipment() {
  const [equipment, setEquipment] = useState<HeroEquipmentItem | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      let previousSrc: string | null = null;

      try {
        previousSrc = window.sessionStorage.getItem(previousEquipmentKey);
      } catch {
        // Continue with a normal random selection when storage is unavailable.
      }

      const choices = heroEquipment.filter((item) => item.src !== previousSrc);
      const nextEquipment = choices[Math.floor(Math.random() * choices.length)];

      setEquipment(nextEquipment);

      try {
        window.sessionStorage.setItem(previousEquipmentKey, nextEquipment.src);
      } catch {
        // The selected image still works when storage is unavailable.
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="visual-wrap">
      <div className="equipment-panel">
        {equipment && (
          <Image
            className={[
              "hero-equipment-image",
              equipment.className,
              isLoaded && "is-visible",
            ].filter(Boolean).join(" ")}
            src={equipment.src}
            alt={equipment.alt}
            width={equipment.width ?? 1536}
            height={equipment.height ?? 1024}
            sizes="(max-width: 800px) 82vw, (max-width: 1280px) 38vw, 470px"
            onLoad={() => setIsLoaded(true)}
            preload
          />
        )}
      </div>
    </div>
  );
}
