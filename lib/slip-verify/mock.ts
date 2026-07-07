// MockSlipVerifier — ใช้ทดสอบ flow auto-verify โดยไม่ต้องมี provider จริง
// พฤติกรรมคุมด้วย env: SLIP_VERIFY_MOCK_MODE = pass | amount_mismatch

import type { SlipVerifier, SlipVerifyInput, SlipVerifyResult } from './types';

export class MockSlipVerifier implements SlipVerifier {
  readonly providerName = 'mock';

  async verify(input: SlipVerifyInput): Promise<SlipVerifyResult> {
    const mode = process.env.SLIP_VERIFY_MOCK_MODE ?? 'pass';

    if (mode === 'amount_mismatch') {
      return {
        verified: false,
        reason_th: `ยอดในสลิปไม่ตรงกับยอดออร์เดอร์ (ต้องได้รับ ฿${input.expectedAmount.toLocaleString('th-TH')})`,
        raw: { provider: 'mock', mode, order_number: input.orderNumber },
      };
    }

    return {
      verified: true,
      transactionRef: `MOCK-${input.fileHash.slice(0, 12)}`,
      raw: { provider: 'mock', mode: 'pass', order_number: input.orderNumber },
    };
  }
}
