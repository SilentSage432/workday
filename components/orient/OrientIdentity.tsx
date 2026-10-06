/**
 * The instrument's maker's mark. One asset, no operational behavior.
 * The artwork is the supplied lockup; this only places it.
 */
export function OrientIdentity() {
  return (
    <div className="orient-identity" data-orient-identity="true">
      {/* Served unchanged. Optimization would recompress the supplied lockup. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/orient-logo.png" alt="Orient" width={2182} height={721} />
    </div>
  );
}
