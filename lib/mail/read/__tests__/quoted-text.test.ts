import { describe, expect, it } from "vitest";
import { displayTextBody } from "../quoted-text";

describe("quoted reply presentation", () => {
  it("hides Gmail-style quoted history with an address marker", () => {
    const raw = "Thanks, that works.\n\nOn Fri, Sep 25, 2026 at 10:30 AM AnyHVAC <contact@anyhvac.net> wrote:\n> Previous message\n> Older text";
    expect(displayTextBody(raw)).toEqual({ text: "Thanks, that works.", quotedTextHidden: true });
  });

  it("hides a trailing block of quoted lines including nested replies", () => {
    const raw = "My new reply\n\n> Previous reply\n>> Nested older reply\n> More history";
    expect(displayTextBody(raw)).toEqual({ text: "My new reply", quotedTextHidden: true });
  });

  it("hides common original-message and forwarded-message separators", () => {
    expect(displayTextBody("New response\n\n-----Original Message-----\nFrom: Person <person@example.com>\nOld body")).toEqual({ text: "New response", quotedTextHidden: true });
    expect(displayTextBody("FYI\n\n---------- Forwarded message ---------\nFrom: Person <person@example.com>\nOld body")).toEqual({ text: "FYI", quotedTextHidden: true });
  });

  it("recognizes a sufficiently complete reply header block", () => {
    const raw = "Got it.\n\nFrom: Person <person@example.com>\nSent: Friday, September 25\nTo: contact@anyhvac.net\nSubject: Service\n\nEarlier message";
    expect(displayTextBody(raw)).toEqual({ text: "Got it.", quotedTextHidden: true });
  });

  it("preserves ordinary text, ambiguous wording, and signatures", () => {
    const raw = "On Tuesday I wrote the estimate.\nPlease review it.\n\nCesar Suarez Pepper\nLodi, Ohio 44256";
    expect(displayTextBody(raw)).toEqual({ text: raw, quotedTextHidden: false });
  });

  it("preserves an isolated greater-than line when later authored text follows", () => {
    const raw = "Use this comparison:\n> 80 percent\nThen continue with the calculation.";
    expect(displayTextBody(raw)).toEqual({ text: raw, quotedTextHidden: false });
  });
});
