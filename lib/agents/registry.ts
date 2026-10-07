import type { AgentDefinition } from "./types";
// Display metadata only; runner loads instructions from canonical source files.
export const AGENTS: AgentDefinition[] = [
  { id: "anyhvac.george", name: "George", role: "Growth & Distribution", summary: "Interpret growth evidence, prepare useful content and propose measurable distribution opportunities.", source: "docs/agents/george.md" },
  { id: "anyhvac.william", name: "William", role: "Analytics & Measurement", summary: "Measure audience and discovery signals, preserve exclusions and report evidence with clear limitations.", source: "docs/agents/william.md" },
];
export const findAgent = (id: string) => AGENTS.find(agent => agent.id === id);
