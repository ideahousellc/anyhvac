import { APPROVED_BATCH_ID } from "./approved-batch";
export const HISTORICAL_BATCH_ID = "anyhvac-week-2026-10-12";
export const WEEKLY_BATCHES = [{ id: HISTORICAL_BATCH_ID, label: "October 12–17 · historical" }, { id: APPROVED_BATCH_ID, label: "October 19–25 · approved revision 5" }];
export function selectedBatch(value?: string | null) {
  const batch = value ?? HISTORICAL_BATCH_ID;
  if (!WEEKLY_BATCHES.some(item => item.id === batch)) throw Error("Unknown weekly batch.");
  return batch;
}
