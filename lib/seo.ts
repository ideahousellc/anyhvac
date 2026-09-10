import type { Metadata } from "next";

export const SITE_NAME = "AnyHVAC";
export const SITE_URL = "https://www.anyhvac.net";
export const SITE_DESCRIPTION =
  "Free practical HVAC calculators, design tools, references, and resources for HVAC professionals, designers, technicians, and students.";

const SOCIAL_IMAGE = {
  url: "/Light-background version.png",
  width: 1774,
  height: 887,
  alt: "AnyHVAC — Free HVAC Calculators & Tools",
};

export function createPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const canonicalUrl = path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      siteName: SITE_NAME,
      title,
      description,
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SOCIAL_IMAGE.url],
    },
  };
}
