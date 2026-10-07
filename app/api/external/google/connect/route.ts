import { requireAuthenticatedUserId } from "@/server/auth/requireAuthenticatedUser";
import { readGoogleOAuthConfig } from "@/server/googleCalendar/config";
import { prepareGoogleConnection } from "@/server/googleCalendar/connections";
import { jsonOk, mapRouteError } from "@/server/googleCalendar/httpJson";
import { buildGoogleAuthorizationUrl } from "@/server/googleCalendar/oauth";
import { createOAuthInitiation } from "@/server/googleCalendar/oauthState";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const userId = await requireAuthenticatedUserId(request);
    readGoogleOAuthConfig();
    const connection = await prepareGoogleConnection(userId);
    const initiation = await createOAuthInitiation({
      userId,
      connectionId: connection.id,
    });
    const authorizeUrl = buildGoogleAuthorizationUrl({
      state: initiation.state,
      codeChallenge: initiation.codeChallenge,
    });
    return jsonOk({
      authorizeUrl,
      connectionId: connection.id,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
