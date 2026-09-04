export const TOOL_CATEGORIES = [
  "All Tools",
  "Air Distribution",
  "Heating & Cooling",
  "Air Properties",
] as const;

export type ToolCategory = Exclude<
  (typeof TOOL_CATEGORIES)[number],
  "All Tools"
>;

export type ToolIconName = "duct" | "cooling" | "airflow" | "psychrometric";

export type HvacTool = {
  id: string;
  title: string;
  category: ToolCategory;
  description: string;
  status: "Available" | "Coming Soon";
  href: string | null;
  cta: string | null;
  icon: ToolIconName;
  showOnHomepage: boolean;
  showInDirectory: boolean;
};

export const HVAC_TOOLS: readonly HvacTool[] = [
  {
    id: "duct-calculator",
    title: "HVAC Duct Calculator",
    category: "Air Distribution",
    description:
      "Size round and rectangular ductwork using airflow, friction rate, and velocity.",
    status: "Available",
    href: "/tools/duct-calculator",
    cta: "Open Calculator",
    icon: "duct",
    showOnHomepage: true,
    showInDirectory: true,
  },
  {
    id: "air-distribution-tools",
    title: "Air Distribution Tools",
    category: "Air Distribution",
    description:
      "Airflow, velocity, air changes, friction rate, pressure relationships, and practical air-distribution calculations.",
    status: "Available",
    href: "/tools/air-distribution",
    cta: "Open Tools",
    icon: "airflow",
    showOnHomepage: true,
    showInDirectory: true,
  },
  {
    id: "heating-cooling-tools",
    title: "Heating & Cooling Tools",
    category: "Heating & Cooling",
    description:
      "Practical heating and cooling calculations for airflow, sensible heat, capacity, water flow, and system design.",
    status: "Coming Soon",
    href: null,
    cta: null,
    icon: "cooling",
    showOnHomepage: true,
    showInDirectory: true,
  },
  {
    id: "air-properties",
    title: "Air Properties",
    category: "Air Properties",
    description:
      "Psychrometric, dew point, enthalpy, mixed-air, and humidity calculations.",
    status: "Coming Soon",
    href: null,
    cta: null,
    icon: "psychrometric",
    showOnHomepage: true,
    showInDirectory: true,
  },
];
