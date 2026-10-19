/**
 * Prevent an asynchronous account refresh from applying after a newer refresh
 * starts or the active account changes while the request is in flight.
 */
export function shouldApplyAccountRefresh(input: {
  requestId: number;
  latestRequestId: number;
  requestedTag: string;
  activeTag: string | null | undefined;
}): boolean {
  return (
    input.requestId === input.latestRequestId &&
    input.requestedTag === input.activeTag
  );
}
