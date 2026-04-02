// Topic mapping utilities for NNS proposals
// Maps IC API topic strings to numeric topic IDs used in the backend
// Only supports the three critical IC topics

export const TOPIC_IDS = {
  TOPIC_APPLICATION_CANISTER_MANAGEMENT: 0n,
  TOPIC_PROTOCOL_CANISTER_MANAGEMENT: 3n,
  TOPIC_IC_OS_VERSION_ELECTION: 5n,
} as const;

export const TOPIC_DISPLAY_NAMES: Record<string, string> = {
  "0": "Application Canister Management",
  "3": "Protocol Canister Management",
  "5": "IC OS Version Election",
};

export const TOPIC_API_STRINGS = [
  "TOPIC_APPLICATION_CANISTER_MANAGEMENT",
  "TOPIC_IC_OS_VERSION_ELECTION",
  "TOPIC_PROTOCOL_CANISTER_MANAGEMENT",
] as const;

/**
 * Convert IC API topic string to numeric topic ID
 */
export function topicStringToId(apiTopic: string): bigint | null {
  switch (apiTopic) {
    case "TOPIC_IC_OS_VERSION_ELECTION":
      return TOPIC_IDS.TOPIC_IC_OS_VERSION_ELECTION;
    case "TOPIC_APPLICATION_CANISTER_MANAGEMENT":
      return TOPIC_IDS.TOPIC_APPLICATION_CANISTER_MANAGEMENT;
    case "TOPIC_PROTOCOL_CANISTER_MANAGEMENT":
      return TOPIC_IDS.TOPIC_PROTOCOL_CANISTER_MANAGEMENT;
    default:
      return null;
  }
}

/**
 * Convert numeric topic ID to human-friendly display name
 */
export function topicIdToDisplayName(topicId: bigint): string {
  return TOPIC_DISPLAY_NAMES[topicId.toString()] || "Unknown Topic";
}

/**
 * Convert API topic string to display name
 */
export function topicStringToDisplayName(apiTopic: string): string {
  const topicId = topicStringToId(apiTopic);
  if (topicId === null) return "Unknown Topic";
  return topicIdToDisplayName(topicId);
}

/**
 * Get all topics as array of [id, displayName] tuples
 */
export function getAllTopicsArray(): Array<[bigint, string]> {
  return Object.entries(TOPIC_DISPLAY_NAMES).map(([id, name]) => [
    BigInt(id),
    name,
  ]);
}
