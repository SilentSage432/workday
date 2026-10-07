import { requireAuthenticatedUserId } from "@/server/auth/requireAuthenticatedUser";
import { disconnectGoogleCalendarForUser } from "@/server/googleCalendar/disconnect";
import { jsonOk, mapRouteError } from "@/server/googleCalendar/httpJson";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const result = await disconnectGoogleCalendarForUser({
      authenticatedUserId: userId,
    });
    return jsonOk(result);
  } catch (error) {
    return mapRouteError(error);
  }
}
