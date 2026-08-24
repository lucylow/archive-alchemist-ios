export function createOAuthCallbackGate() {
  let activeCallbackId = 0;

  return {
    begin() {
      activeCallbackId += 1;
      return activeCallbackId;
    },
    invalidate() {
      activeCallbackId += 1;
    },
    isCurrent(callbackId: number) {
      return callbackId === activeCallbackId;
    },
  };
}
