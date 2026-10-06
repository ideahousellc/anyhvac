import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NEWSLETTER_OPEN_EVENT } from "@/lib/growth/browser";

const effects = vi.hoisted(() => ({ effect: null as (() => void | (() => void)) | null }));
vi.mock("react", () => ({ useEffect: (effect: () => void | (() => void)) => { effects.effect = effect; } }));
import { ResourceGrowthMeasurement } from "@/components/ResourceGrowthMeasurement";

type Handler = (event: never) => void;
let listeners: Map<string, Handler>;
let winListeners: Map<string, Handler>;
let fetchMock: ReturnType<typeof vi.fn>;
let pathname: string;
let optedOut: boolean;

class MarkerTarget {
  constructor(private placement = "duct-reference-top", private href = "/tools/duct-calculator") {}
  closest() { return { getAttribute: (name: string) => name === "href" ? this.href : this.placement }; }
}
function click(type = "click", button = 0, target = new MarkerTarget()) {
  listeners.get(type)?.({ type, button, target } as never);
}
function newsletter(source = "footer") {
  winListeners.get(NEWSLETTER_OPEN_EVENT)?.({ detail: source } as never);
}
function mount() {
  ResourceGrowthMeasurement();
  return effects.effect?.();
}
function payloads() { return fetchMock.mock.calls.map((call) => JSON.parse(call[1].body)); }

describe("resource measurement event behavior", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_GROWTH_MEASUREMENT_ENABLED", "true");
    pathname = "/resources/duct-design-quick-reference";
    optedOut = false;
    listeners = new Map(); winListeners = new Map();
    fetchMock = vi.fn().mockResolvedValue({});
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("Element", MarkerTarget);
    vi.stubGlobal("crypto", { randomUUID: () => "d3e15125-4d43-4dc3-a15d-f52f5013ed93" });
    vi.stubGlobal("document", {
      addEventListener: (name: string, handler: Handler, capture: boolean) => { expect(capture).toBe(true); listeners.set(name, handler); },
      removeEventListener: (name: string) => listeners.delete(name),
    });
    vi.stubGlobal("window", {
      location: { get pathname() { return pathname; }, hostname: "www.anyhvac.net" },
      localStorage: { getItem: () => optedOut ? "true" : null },
      addEventListener: (name: string, handler: Handler) => winListeners.set(name, handler),
      removeEventListener: (name: string) => winListeners.delete(name),
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("captures native primary/keyboard and middle-button actions once per placement without intercepting navigation", () => {
    mount();
    click("click", 2); click("auxclick", 2); // right button never counts
    expect(fetchMock).toHaveBeenCalledTimes(1);
    click(); click(); // primary or keyboard synthesized button-zero event
    click("auxclick", 1, new MarkerTarget("duct-reference-contextual"));
    click("click", 0, new MarkerTarget("duct-reference-top", "/other"));
    click("click", 0, {} as MarkerTarget);
    expect(payloads().map((p) => [p.event, p.placement])).toEqual([
      ["resource_view", null], ["resource_calculator_click", "duct-reference-top"],
      ["resource_calculator_click", "duct-reference-contextual"],
    ]);
    expect(new Set(payloads().map((p) => p.viewId)).size).toBe(1);
    expect(fetchMock.mock.calls.every((call) => call[1].keepalive)).toBe(true);
  });
  it("distinguishes signup entry points, guards route changes and removes listeners", () => {
    const cleanup = mount();
    newsletter(); newsletter(); newsletter("automatic"); newsletter("duct-reference-inline");
    expect(payloads().slice(1).map((p) => p.placement)).toEqual(["footer", "automatic", "duct-reference-inline"]);
    pathname = "/admin";
    click(); newsletter("other");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    if (typeof cleanup === "function") cleanup();
    expect(listeners.size).toBe(0); expect(winListeners.size).toBe(0);
  });
  it("fails silently when disabled or crypto unavailable and respects a later owner opt-out", () => {
    vi.stubEnv("NEXT_PUBLIC_GROWTH_MEASUREMENT_ENABLED", "false");
    mount(); expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv("NEXT_PUBLIC_GROWTH_MEASUREMENT_ENABLED", "true");
    vi.stubGlobal("crypto", { randomUUID: () => { throw new Error("unsupported"); } });
    expect(mount).not.toThrow(); expect(fetchMock).not.toHaveBeenCalled();
    vi.stubGlobal("crypto", { randomUUID: () => "d3e15125-4d43-4dc3-a15d-f52f5013ed93" });
    mount(); optedOut = true; click(); newsletter();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
