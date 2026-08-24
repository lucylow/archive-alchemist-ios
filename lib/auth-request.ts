export function createAuthRequestGate() {
  let activeRequestId = 0;

  return {
    begin() {
      activeRequestId += 1;
      return activeRequestId;
    },
    invalidate() {
      activeRequestId += 1;
    },
    isCurrent(requestId: number) {
      return requestId === activeRequestId;
    },
  };
}
