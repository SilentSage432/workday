import { describe, expect, it } from "vitest";
import {
  AuthenticatedUserError,
  requireAuthenticatedUserId,
} from "@/server/auth/requireAuthenticatedUser";

describe("requireAuthenticatedUserId", () => {
  it("rejects missing Bearer credentials without trusting user_id query params", async () => {
    await expect(
      requireAuthenticatedUserId(
        new Request("https://example.test/api/external/google/connect?user_id=attacker", {
          method: "POST",
        }),
      ),
    ).rejects.toBeInstanceOf(AuthenticatedUserError);

    await expect(
      requireAuthenticatedUserId(
        new Request("https://example.test/api/external/google/connect", {
          method: "POST",
          headers: { Authorization: "Bearer " },
        }),
      ),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });
});
