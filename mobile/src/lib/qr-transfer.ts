import LZString from 'lz-string';

import { parseTransferBundle, type VehicleTransferBundle } from '@/lib/transfer';

// Payload format: prefix + LZ-compressed JSON (URI-safe alphabet, so the
// whole payload stays plain ASCII for QR byte mode).
const QR_PREFIX = 'CLANK1:';

// A byte-mode QR at the lowest error correction tops out at 2953 bytes, and
// codes near that limit are hard to scan from a phone screen anyway.
const MAX_QR_PAYLOAD = 2600;

export function encodeTransferQr(bundle: VehicleTransferBundle): string | null {
  // Photos/videos can't ride along in a QR code — strip them so the buyer
  // doesn't end up with records pointing at files that never arrived.
  const withoutMedia: VehicleTransferBundle = {
    ...bundle,
    maintenanceRecords: bundle.maintenanceRecords.map((record) => ({
      ...record,
      media: null,
    })),
  };
  const payload =
    QR_PREFIX + LZString.compressToEncodedURIComponent(JSON.stringify(withoutMedia));
  return payload.length > MAX_QR_PAYLOAD ? null : payload;
}

export function decodeTransferQr(data: string): VehicleTransferBundle {
  if (!data.startsWith(QR_PREFIX)) {
    throw new Error('This QR code is not a Clank maintenance history.');
  }
  const json = LZString.decompressFromEncodedURIComponent(data.slice(QR_PREFIX.length));
  if (!json) {
    throw new Error('Could not read this QR code — try again or use the file instead.');
  }
  return parseTransferBundle(json);
}
