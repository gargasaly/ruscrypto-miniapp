export const ANALYTICS_EVENT_TYPES = [
  "app_open",
  "page_view",
  "guide_open",
  "token_check_open",
  "token_check_submit",
  "token_check_result",
  "portfolio_open",
  "portfolio_report_open",
  "payment_started",
  "payment_success",
  "external_link_click",
  "support_channel_click",
  "virtual_card_bot_click",
  "error",
  "custom",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

const knownEventTypes = new Set<string>(ANALYTICS_EVENT_TYPES);

export function normalizeAnalyticsEventType(value: unknown): AnalyticsEventType {
  return typeof value === "string" && knownEventTypes.has(value) ? value as AnalyticsEventType : "custom";
}
