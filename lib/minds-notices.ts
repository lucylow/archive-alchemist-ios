const MINDS_TIMEOUT_NOTICE =
  "Minds took too long to respond. Try again when your connection is ready; your local workflow is still available.";
const MINDS_GENERIC_NOTICE = "Minds could not analyze this item right now. Your local workflow is still available.";

export function getMindsErrorNotice(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("timed out") ? MINDS_TIMEOUT_NOTICE : MINDS_GENERIC_NOTICE;
}
