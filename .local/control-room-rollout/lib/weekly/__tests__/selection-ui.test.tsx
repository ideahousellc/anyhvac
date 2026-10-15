import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { WeeklyReview } from "@/components/admin/WeeklyReview";
import { WeeklyApprovedImport } from "@/components/admin/WeeklyApprovedImport";
import { selectedBatch, HISTORICAL_BATCH_ID } from "../selection";
import { APPROVED_BATCH_ID } from "../approved-batch";
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => createElement("a", { href, ...props }, children) }));
it("renders separate owner batch choices and immutable approved-batch guidance", () => {
  const html = renderToStaticMarkup(createElement(WeeklyReview, { batch: APPROVED_BATCH_ID, approvedImportEnabled: true }));
  expect(html).toContain("Weekly batch selection"); expect(html).toContain(HISTORICAL_BATCH_ID); expect(html).toContain(APPROVED_BATCH_ID);
  expect(html).toContain("approved snapshot is immutable"); expect(html).toContain("Import approved October"); expect(html).not.toContain("Import original weekly batch");
});
it("keeps uploads disabled before status, hash verification and explicit confirmation", () => {
  const html = renderToStaticMarkup(createElement(WeeklyApprovedImport, { onImported: () => {} }));
  expect(html).toMatch(/type="file"[^>]*disabled=""/); expect(html).toContain("Import approved batch privately once"); expect(html).toContain("does not schedule or publish");
});
it("rejects traversal and arbitrary batch names while preserving the historical default", () => {
  expect(selectedBatch()).toBe(HISTORICAL_BATCH_ID); expect(selectedBatch(APPROVED_BATCH_ID)).toBe(APPROVED_BATCH_ID);
  for (const value of ["../other", "anyhvac-week-2027-01-01", ""]) expect(() => selectedBatch(value)).toThrow();
});
