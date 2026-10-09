import { ExternalCredentialError } from "@/server/credentials/errors";
import { PulseDispatchError } from "@/server/pulseDispatch/errors";

export function jsonOk(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, { status: 200, ...init });
}

export function jsonError(status: number, error: string, code?: string): Response {
  return Response.json(code ? { error, code } : { error }, { status });
}

export function mapPulseDispatchRouteError(error: unknown): Response {
  if (error instanceof PulseDispatchError) {
    switch (error.code) {
      case "dispatch_unauthorized":
        return jsonError(401, error.message, error.code);
      case "dispatch_malformed_input":
        return jsonError(400, error.message, error.code);
      case "occurrence_not_found":
        return jsonError(404, error.message, error.code);
      case "dispatch_secret_unavailable":
      case "service_role_unavailable":
      case "firebase_unavailable":
      case "firebase_config_invalid":
        return jsonError(503, error.message, error.code);
      default:
        return jsonError(500, "Pulse dispatch failed.", error.code);
    }
  }
  if (error instanceof ExternalCredentialError) {
    if (error.code === "service_role_unavailable") {
      return jsonError(
        503,
        "Supabase service-role access is not configured for Pulse dispatch.",
        "service_role_unavailable",
      );
    }
  }
  return jsonError(500, "Pulse dispatch failed.");
}
