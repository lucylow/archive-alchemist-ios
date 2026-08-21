import type { MindsDiscoveryResponse } from "@/shared/minds";

export type PersistedMindMemory = {
  title: string;
  platforms: string[];
  savedAt: string;
  followUp: string;
  mindsInsight?: MindsDiscoveryResponse;
};

export function mergeMindsInsight<T extends PersistedMindMemory>(
  memory: T,
  history: T[],
  insight: MindsDiscoveryResponse,
): { memory: T; history: T[] } {
  const updatedMemory = { ...memory, mindsInsight: insight } as T;
  const nextHistory = [updatedMemory, ...history.filter((item) => item.savedAt !== updatedMemory.savedAt)].slice(0, 5);
  return { memory: updatedMemory, history: nextHistory };
}
