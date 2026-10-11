export function buildTrackingNumber(sequenceNumber: number): string {
  const year = new Date().getFullYear();
  return `TRK-${year}-${String(sequenceNumber).padStart(5, "0")}`;
}
