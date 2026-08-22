export function canStartMindsRequest(isPending: boolean): boolean {
  return !isPending;
}

export function createMindsRequestGate() {
  let activeRequestId = 0;

  return {
    begin() {
      activeRequestId += 1;
      return activeRequestId;
    },
    cancel() {
      activeRequestId += 1;
    },
    isCurrent(requestId: number) {
      return requestId === activeRequestId;
    },
  };
}
