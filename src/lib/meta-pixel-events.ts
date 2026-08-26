type Fbq = (...args: unknown[]) => void;

export function trackMetaEvent(event: string, params?: Record<string, unknown>) {
  const fbq = (window as typeof window & { fbq?: Fbq }).fbq;
  if (typeof fbq === "function") fbq("track", event, params);
}
