export type SaveResult = {
  saved: boolean;
  historySaved: boolean;
};

export function getAutoPostNotice(result: SaveResult): string | null {
  if (!result.saved) return null;
  return result.historySaved
    ? "The Conductor scheduled the approved content batch and stored the workflow in Mind memory."
    : "The workflow was saved to Mind memory, but recent-workflow history could not be updated.";
}
