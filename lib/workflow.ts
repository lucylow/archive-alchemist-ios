export type WorkflowPlatform = "YouTube" | "Spotify" | "Substack" | "Twitter" | "Instagram" | "TikTok";

export const outputCatalog: Record<WorkflowPlatform, string> = {
  YouTube: "YouTube Short (0:45)",
  Spotify: "Spotify Audiogram (0:45)",
  Substack: "Blog Post (1,200 words)",
  Twitter: "Twitter Thread (10 tweets)",
  Instagram: "Instagram Reel (0:30)",
  TikTok: "TikTok / Reels Clip (0:58)",
};

export const platformPerformance: Record<WorkflowPlatform, string> = {
  YouTube: "37K views",
  Spotify: "18K listens",
  Substack: "6.4K reads",
  Twitter: "22K impressions",
  Instagram: "28K views",
  TikTok: "41K views",
};

export function getPlatformPerformance(platform: WorkflowPlatform) {
  return platformPerformance[platform];
}

export function getSelectedOutputs(platforms: WorkflowPlatform[]) {
  return platforms.map((platform) => outputCatalog[platform]);
}

const outputTimeSavedMinutes: Record<WorkflowPlatform, number> = {
  YouTube: 45,
  Spotify: 45,
  Substack: 60,
  Twitter: 25,
  Instagram: 30,
  TikTok: 58,
};

export function estimateTimeSaved(platforms: WorkflowPlatform[]) {
  return platforms.reduce((total, platform) => total + outputTimeSavedMinutes[platform], 0);
}

export function formatTimeSaved(totalMinutes: number) {
  const safeMinutes = Number.isFinite(totalMinutes) && totalMinutes >= 0 ? Math.round(totalMinutes) : 0;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours === 0) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (minutes === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function canAutoPost(reviewMode: boolean, approvedOutputs: string[], selectedOutputs: string[]) {
  return !reviewMode || selectedOutputs.every((output) => approvedOutputs.includes(output));
}

export function platformCountLabel(count: number) {
  return `${count} platform${count === 1 ? "" : "s"}`;
}
