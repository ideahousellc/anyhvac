import { describe, expect, it, vi } from "vitest";

import {
  getClientExpirationDeadline,
  handleAdminUnauthorized,
  startAdminSessionExpirationMonitor,
} from "@/components/admin/session-expiration";

function eventTarget() {
  return new EventTarget() as unknown as Pick<
    Window,
    "addEventListener" | "removeEventListener"
  >;
}

describe("admin session expiration UX", () => {
  it("keeps an authenticated session active before expiration", () => {
    const now = 10_000;
    const expiresAt = 1_100_000;
    const serverNow = 100_000;
    const deadline = getClientExpirationDeadline(expiresAt, serverNow, now);
    const redirect = vi.fn();
    let timerCallback: () => void = () => undefined;
    const windowEvents = eventTarget();
    const documentEvents = new EventTarget() as unknown as Pick<
      Document,
      "addEventListener" | "removeEventListener"
    >;

    const cleanup = startAdminSessionExpirationMonitor({
      deadline,
      onExpire: redirect,
      now: () => now,
      schedule: (callback) => {
        timerCallback = callback;
        return 1;
      },
      cancel: vi.fn(),
      windowTarget: windowEvents,
      documentTarget: documentEvents,
      isDocumentVisible: () => true,
    });

    (windowEvents as EventTarget).dispatchEvent(new Event("focus"));
    expect(redirect).not.toHaveBeenCalled();
    expect(timerCallback).toBeTypeOf("function");
    cleanup();
  });

  it("automatically redirects when the expiration timer fires", () => {
    const redirect = vi.fn();
    let timerCallback: () => void = () => undefined;

    startAdminSessionExpirationMonitor({
      deadline: 20_000,
      onExpire: redirect,
      now: () => 10_000,
      schedule: (callback, delay) => {
        expect(delay).toBe(10_000);
        timerCallback = callback;
        return 1;
      },
      cancel: vi.fn(),
      windowTarget: eventTarget(),
      documentTarget: new EventTarget() as unknown as Document,
      isDocumentVisible: () => true,
    });

    timerCallback();
    expect(redirect).toHaveBeenCalledOnce();
  });

  it("detects expiration immediately when a sleeping tab becomes active", () => {
    let now = 10_000;
    const redirect = vi.fn();
    const windowEvents = eventTarget();

    startAdminSessionExpirationMonitor({
      deadline: 20_000,
      onExpire: redirect,
      now: () => now,
      schedule: () => 1,
      cancel: vi.fn(),
      windowTarget: windowEvents,
      documentTarget: new EventTarget() as unknown as Document,
      isDocumentVisible: () => true,
    });

    now = 25_000;
    (windowEvents as EventTarget).dispatchEvent(new Event("focus"));
    expect(redirect).toHaveBeenCalledOnce();
  });

  it("treats a 401 response as an immediate redirect instruction", () => {
    const redirect = vi.fn();
    expect(handleAdminUnauthorized(401, redirect)).toBe(true);
    expect(redirect).toHaveBeenCalledOnce();

    redirect.mockClear();
    expect(handleAdminUnauthorized(502, redirect)).toBe(false);
    expect(redirect).not.toHaveBeenCalled();
  });
});
