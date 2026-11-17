import { cookies } from "next/headers";

/**
 * The viewer's IANA timezone, from the `tz` cookie the root layout's inline
 * script sets on every visit. Falls back to UTC until the first visit has set
 * it (or when the value is bogus).
 */
export async function getTimeZone(): Promise<string> {
  const tz = (await cookies()).get("tz")?.value;
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}
