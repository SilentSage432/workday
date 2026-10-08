import { AuthenticatedUserError } from "@/server/auth/requireAuthenticatedUser";
import { ExternalCredentialError } from "@/server/credentials/errors";
import { GoogleConfigError } from "@/server/googleCalendar/config";
import { GoogleConnectionError } from "@/server/googleCalendar/connections";
import { GoogleOAuthError } from "@/server/googleCalendar/oauth";
import { OAuthStateError } from "@/server/googleCalendar/oauthState";
import { GoogleObservationError } from "@/server/googleCalendar/observe";
import { ObservationPersistenceError } from "@/server/googleCalendar/observationPersistence";
import { GoogleSourceError } from "@/server/googleCalendar/sources";

export function jsonOk(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, { status: 200, ...init });
}

export function jsonError(status: number, error: string, code?: string): Response {
  return Response.json(code ? { error, code } : { error }, { status });
}

export function mapRouteError(error: unknown): Response {
  if (error instanceof AuthenticatedUserError) {
    return jsonError(error.code === "auth_unavailable" ? 503 : 401, error.message, error.code);
  }
  if (error instanceof GoogleConfigError) {
    return jsonError(503, error.message, error.code);
  }
  if (error instanceof OAuthStateError) {
    return jsonError(400, error.message, error.code);
  }
  if (error instanceof GoogleOAuthError) {
    const status = error.code === "oauth_auth_failed" ? 401 : error.code === "oauth_transient" ? 502 : 400;
    return jsonError(status, error.message, error.code);
  }
  if (error instanceof ExternalCredentialError) {
    if (error.code === "unauthorized_connection") return jsonError(403, error.message, error.code);
    if (error.code === "credential_missing") return jsonError(409, error.message, error.code);
    if (error.code === "service_role_unavailable" || error.code === "encryption_key_unavailable") {
      return jsonError(503, "Google Calendar connection is not configured.", error.code);
    }
    return jsonError(500, "Google Calendar connection failed.", error.code);
  }
  if (error instanceof GoogleConnectionError) {
    return jsonError(500, error.message, error.code);
  }
  if (error instanceof GoogleSourceError) {
    return jsonError(error.code === "source_injection_rejected" ? 400 : 500, error.message, error.code);
  }
  if (error instanceof GoogleObservationError) {
    if (error.code === "not_connected") return jsonError(409, error.message, error.code);
    if (error.code === "timezone_unavailable") return jsonError(409, error.message, error.code);
    return jsonError(500, error.message, error.code);
  }
  if (error instanceof ObservationPersistenceError) {
    return jsonError(500, error.message, error.code);
  }
  return jsonError(500, "Google Calendar connection failed.");
}
