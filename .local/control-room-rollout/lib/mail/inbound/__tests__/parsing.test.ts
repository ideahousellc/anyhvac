import { describe, expect, it } from "vitest";

import { findSupportedMailbox, normalizeAddresses, parseMessageIds } from "../parsing";

describe("inbound mail parsing", () => {
  it("detects each supported mailbox case-insensitively and through display names", () => {
    for (const mailbox of ["contact", "support", "social", "mailtest"]) {
      expect(findSupportedMailbox([`AnyHVAC <${mailbox.toUpperCase()}@ANYHVAC.NET>`])).toBe(`${mailbox}@anyhvac.net`);
    }
  });

  it("rejects unsupported mailboxes", () => {
    expect(findSupportedMailbox(["other@anyhvac.net"])).toBeNull();
  });

  it("normalizes and deduplicates addresses", () => {
    expect(normalizeAddresses(["Customer <USER@example.com>", "user@example.com", "bad address"])).toEqual(["user@example.com"]);
  });

  it("extracts ordered RFC message identifiers", () => {
    expect(parseMessageIds("<first@example.com> <second@example.com>")).toEqual(["<first@example.com>", "<second@example.com>"]);
  });
});
