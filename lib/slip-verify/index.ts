// เลือก SlipVerifier ตาม env SLIP_VERIFY_PROVIDER (ดีฟอลต์ mock)

import 'server-only';
import { MockSlipVerifier } from './mock';
import type { SlipVerifier } from './types';

export type { SlipVerifier, SlipVerifyInput, SlipVerifyResult } from './types';

export function getSlipVerifier(): SlipVerifier {
  const provider = process.env.SLIP_VERIFY_PROVIDER ?? 'mock';
  switch (provider) {
    case 'mock':
      return new MockSlipVerifier();
    default:
      // provider จริง (Phase อนาคต) — ยังไม่รู้จัก = fallback mock พร้อมเตือน
      console.warn(`[slip-verify] unknown provider "${provider}" — falling back to mock`);
      return new MockSlipVerifier();
  }
}
