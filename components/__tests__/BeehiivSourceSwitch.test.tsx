import { afterEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({ effect: null as (() => void | (() => void)) | null, container: null as unknown }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: (effect: () => void | (() => void)) => { hooks.effect = effect; },
  useRef: () => ({ current: hooks.container }),
}));
import { BeehiivSubscribeEmbed } from "@/components/BeehiivSubscribeEmbed";
import { DEFAULT_BEEHIIV_FORM_ID } from "@/lib/growth/newsletter-source";

describe("Beehiiv source form lifecycle", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("destroys the old controller and removes generated form nodes before switching forms", () => {
    const oldDestroy = vi.fn(); const newDestroy = vi.fn();
    const append = vi.fn(); const clear = vi.fn(); const disconnect = vi.fn();
    const scripts: { dataset: Record<string, string>; remove: ReturnType<typeof vi.fn> }[] = [];
    hooks.container = { appendChild: append, replaceChildren: clear };
    vi.stubGlobal("document", { createElement: () => {
      const script = { dataset: {}, remove: vi.fn() }; scripts.push(script); return script;
    } });
    vi.stubGlobal("MutationObserver", class { observe() {} disconnect = disconnect; });
    const dedicated = "73c01614-764a-45ef-a8ea-0d16d5402cc7";
    vi.stubGlobal("window", { __bhv_embeds: { [DEFAULT_BEEHIIV_FORM_ID]: { destroy: oldDestroy }, [dedicated]: { destroy: newDestroy } } });

    BeehiivSubscribeEmbed();
    const cleanupOld = hooks.effect?.();
    expect(scripts[0].dataset.beehiivForm).toBe(DEFAULT_BEEHIIV_FORM_ID);
    if (typeof cleanupOld === "function") cleanupOld();
    expect(oldDestroy).toHaveBeenCalledOnce(); expect(clear).toHaveBeenCalledOnce();
    expect(scripts[0].remove).toHaveBeenCalledOnce();

    BeehiivSubscribeEmbed({ formId: dedicated, dedicatedFormConfigured: true });
    const cleanupNew = hooks.effect?.();
    expect(scripts[1].dataset.beehiivForm).toBe(dedicated);
    expect(append).toHaveBeenCalledTimes(2);
    if (typeof cleanupNew === "function") cleanupNew();
    expect(newDestroy).toHaveBeenCalledOnce(); expect(disconnect).toHaveBeenCalledTimes(2);
  });
});
