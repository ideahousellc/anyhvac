import Link from "next/link";

export function CalculationIssueNote() {
  return (
    <p>
      Found a calculation discrepancy? <Link href="/contact">Report a calculation issue</Link>
      {" "}with the tool, inputs, units, pressure setting where relevant, actual
      result, and expected result with its source. A reproducible case helps
      distinguish input or method differences from a defect. A confirmed defect
      needs a focused regression check alongside its correction; a report alone
      does not establish that a formula should change.
    </p>
  );
}
