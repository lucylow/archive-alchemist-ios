export type Platform = "YouTube" | "Spotify" | "Substack" | "Twitter" | "Instagram" | "TikTok";

export type MindsDiscoveryRequest = {
  platforms: Platform[];
  archiveTitle: string;
  sourceYear: number;
  sourceViews: string;
};

export type MindsRecommendation = {
  title: string;
  rationale: string;
  formats: string[];
  confidence: number;
};

export type MindsDiscoveryResponse = {
  summary: string;
  recommendations: MindsRecommendation[];
};
