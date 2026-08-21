export type WorkflowPlatform = "YouTube" | "Spotify" | "Substack" | "Twitter" | "Instagram" | "TikTok";

export const outputCatalog: Record<WorkflowPlatform, string> = {
  YouTube: "YouTube Short (0:45)",
  Spotify: "Spotify Audiogram (0:45)",
  Substack: "Blog Post (1,200 words)",
  Twitter: "Twitter Thread (10 tweets)",
  Instagram: "Instagram Reel (0:30)",
  TikTok: "TikTok / Reels Clip (0:58)",
};

export function getSelectedOutputs(platforms: WorkflowPlatform[]) {
  return platforms.map((platform) => outputCatalog[platform]);
}

export function canAutoPost(reviewMode: boolean, approvedOutputs: string[], selectedOutputs: string[]) {
  return !reviewMode || selectedOutputs.every((output) => approvedOutputs.includes(output));
}

export function platformCountLabel(count: number) {
  return `${count} platform${count === 1 ? "" : "s"}`;
}
