import type { MindsDiscoveryResponse } from "@/shared/minds";

export const MINDS_SUMMARY_MAX_LENGTH = 500;
export const MINDS_RECOMMENDATIONS_MAX_COUNT = 4;
export const MINDS_RECOMMENDATION_TITLE_MAX_LENGTH = 120;
export const MINDS_RECOMMENDATION_RATIONALE_MAX_LENGTH = 400;
export const MINDS_FORMAT_MAX_COUNT = 4;
export const MINDS_FORMAT_MAX_LENGTH = 80;

const isBoundedNonEmptyString = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maxLength;

export function isValidMindsInsight(value: unknown): value is MindsDiscoveryResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MindsDiscoveryResponse>;
  if (!isBoundedNonEmptyString(candidate.summary, MINDS_SUMMARY_MAX_LENGTH)) return false;
  if (!Array.isArray(candidate.recommendations) || candidate.recommendations.length === 0 || candidate.recommendations.length > MINDS_RECOMMENDATIONS_MAX_COUNT) return false;

  return candidate.recommendations.every((recommendation) => {
    if (!recommendation || typeof recommendation !== "object") return false;
    const item = recommendation as MindsDiscoveryResponse["recommendations"][number];
    return (
      isBoundedNonEmptyString(item.title, MINDS_RECOMMENDATION_TITLE_MAX_LENGTH) &&
      isBoundedNonEmptyString(item.rationale, MINDS_RECOMMENDATION_RATIONALE_MAX_LENGTH) &&
      Array.isArray(item.formats) &&
      item.formats.length > 0 &&
      item.formats.length <= MINDS_FORMAT_MAX_COUNT &&
      item.formats.every((format) => isBoundedNonEmptyString(format, MINDS_FORMAT_MAX_LENGTH)) &&
      typeof item.confidence === "number" &&
      Number.isFinite(item.confidence) &&
      item.confidence >= 0 &&
      item.confidence <= 1
    );
  });
}
