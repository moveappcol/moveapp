export const META_PIXEL_ID = "1790195715579625";

type Fbq = (...args: unknown[]) => void;

export function trackMetaEvent(event: string, params?: Record<string, unknown>, eventId?: string) {
  const fbq = (window as typeof window & { fbq?: Fbq }).fbq;
  if (typeof fbq !== "function") return;
  if (eventId) fbq("track", event, params, { eventID: eventId });
  else fbq("track", event, params);
}
