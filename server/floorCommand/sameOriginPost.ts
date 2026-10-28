const CROSS_SITE = "Cross-site request refused.";

/**
 * Browser POSTs must come from this response's origin.
 * A missing Origin is allowed for a non-browser caller. Cross-site is refused.
 */
export function rejectCrossSiteFloorCommandPost(request: Request): Response | null {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") {
    return Response.json({ error: CROSS_SITE }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (origin === "null") {
    return Response.json({ error: CROSS_SITE }, { status: 403 });
  }
  let expected: string;
  try {
    expected = new URL(request.url).origin;
  } catch {
    return Response.json({ error: CROSS_SITE }, { status: 403 });
  }
  if (origin !== expected) {
    return Response.json({ error: CROSS_SITE }, { status: 403 });
  }
  return null;
}
