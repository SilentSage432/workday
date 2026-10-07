import { describe, expect, it } from "vitest";
import {
  EXTERNAL_CREDENTIAL_ENCRYPTION_VERSION_V1,
  EXTERNAL_CREDENTIAL_KEY_BYTES,
  bytesToBase64,
  decodeExternalCredentialsEncryptionKey,
  openCredentialPayload,
  sealCredentialPayload,
  utf8ToBytes,
} from "@/server/credentials/crypto";
import { ExternalCredentialError } from "@/server/credentials/errors";

function randomKey(): Uint8Array {
  const key = new Uint8Array(EXTERNAL_CREDENTIAL_KEY_BYTES);
  crypto.getRandomValues(key);
  return key;
}

const context = { userId: "user-1", connectionId: "conn-1" };

describe("external credential AES-GCM", () => {
  it("round-trips opaque payload bytes", async () => {
    const key = randomKey();
    const plaintext = utf8ToBytes(JSON.stringify({ refresh: "synthetic-refresh", access: "synthetic-access" }));
    const sealed = await sealCredentialPayload({ plaintext, context, keyBytes: key });
    const opened = await openCredentialPayload({
      envelope: sealed,
      context,
      keyBytes: key,
    });
    expect(Buffer.from(opened).equals(Buffer.from(plaintext))).toBe(true);
    expect(sealed.encryptionVersion).toBe(EXTERNAL_CREDENTIAL_ENCRYPTION_VERSION_V1);
    expect(sealed.ciphertextBase64).not.toContain("synthetic-refresh");
    expect(sealed.nonceBase64).not.toContain("synthetic-refresh");
  });

  it("produces different ciphertext and nonce for the same plaintext", async () => {
    const key = randomKey();
    const plaintext = utf8ToBytes("same-payload");
    const first = await sealCredentialPayload({ plaintext, context, keyBytes: key });
    const second = await sealCredentialPayload({ plaintext, context, keyBytes: key });
    expect(first.nonceBase64).not.toBe(second.nonceBase64);
    expect(first.ciphertextBase64).not.toBe(second.ciphertextBase64);
  });

  it("allows empty opaque payloads", async () => {
    const key = randomKey();
    const plaintext = new Uint8Array();
    const sealed = await sealCredentialPayload({ plaintext, context, keyBytes: key });
    const opened = await openCredentialPayload({ envelope: sealed, context, keyBytes: key });
    expect(opened.byteLength).toBe(0);
  });

  it("rejects malformed configured keys", () => {
    expect(() => decodeExternalCredentialsEncryptionKey("")).toThrow(ExternalCredentialError);
    expect(() => decodeExternalCredentialsEncryptionKey("%%%")).toThrow(/base64/i);
    expect(() => decodeExternalCredentialsEncryptionKey(bytesToBase64(new Uint8Array(16)))).toThrow(
      /32 bytes/i,
    );
    try {
      decodeExternalCredentialsEncryptionKey("not-base64!!!");
    } catch (error) {
      expect(error).toBeInstanceOf(ExternalCredentialError);
      if (error instanceof ExternalCredentialError) {
        expect(error.code).toBe("encryption_key_invalid");
        expect(error.message).not.toMatch(/not-base64/);
      }
    }
  });

  it("fails closed with the wrong key", async () => {
    const sealed = await sealCredentialPayload({
      plaintext: utf8ToBytes("secret"),
      context,
      keyBytes: randomKey(),
    });
    await expect(
      openCredentialPayload({
        envelope: sealed,
        context,
        keyBytes: randomKey(),
      }),
    ).rejects.toMatchObject({ code: "credential_unopenable" });
  });

  it("fails closed when ciphertext is tampered", async () => {
    const key = randomKey();
    const sealed = await sealCredentialPayload({
      plaintext: utf8ToBytes("secret"),
      context,
      keyBytes: key,
    });
    const bytes = Buffer.from(sealed.ciphertextBase64, "base64");
    bytes[0] = bytes[0]! ^ 0xff;
    await expect(
      openCredentialPayload({
        envelope: { ...sealed, ciphertextBase64: bytes.toString("base64") },
        context,
        keyBytes: key,
      }),
    ).rejects.toMatchObject({ code: "credential_unopenable" });
  });

  it("fails closed when nonce is tampered", async () => {
    const key = randomKey();
    const sealed = await sealCredentialPayload({
      plaintext: utf8ToBytes("secret"),
      context,
      keyBytes: key,
    });
    const nonce = Buffer.from(sealed.nonceBase64, "base64");
    nonce[0] = nonce[0]! ^ 0xff;
    await expect(
      openCredentialPayload({
        envelope: { ...sealed, nonceBase64: nonce.toString("base64") },
        context,
        keyBytes: key,
      }),
    ).rejects.toMatchObject({ code: "credential_unopenable" });
  });

  it("fails closed on AAD / custody-context mismatch", async () => {
    const key = randomKey();
    const sealed = await sealCredentialPayload({
      plaintext: utf8ToBytes("secret"),
      context,
      keyBytes: key,
    });
    await expect(
      openCredentialPayload({
        envelope: sealed,
        context: { userId: "user-1", connectionId: "other-conn" },
        keyBytes: key,
      }),
    ).rejects.toMatchObject({ code: "credential_unopenable" });
  });

  it("rejects unknown envelope versions", async () => {
    const key = randomKey();
    const sealed = await sealCredentialPayload({
      plaintext: utf8ToBytes("secret"),
      context,
      keyBytes: key,
    });
    await expect(
      openCredentialPayload({
        envelope: { ...sealed, encryptionVersion: "v999" },
        context,
        keyBytes: key,
      }),
    ).rejects.toMatchObject({ code: "unsupported_envelope_version" });
  });
});
