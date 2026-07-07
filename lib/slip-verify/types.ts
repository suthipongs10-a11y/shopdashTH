// Slip Verify API (งาน 4.6 — §2.2 v1.1) — ออกแบบเป็น interface ให้สลับ provider ได้
// ตัวแรกคือ MockSlipVerifier (อ่านค่าจาก env) — provider จริงค่อยเสียบภายหลัง

export interface SlipVerifyInput {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  /** ยอดที่ต้องได้รับ = orders.total_amount (บาทเต็ม) */
  expectedAmount: number;
  /** PromptPay ID ของร้าน — ตรวจบัญชีปลายทาง (§7.1) */
  expectedPromptpayId: string | null;
  /** SHA-256 ของไฟล์สลิป — ตรวจสลิปถูกใช้ซ้ำ (transaction ref) */
  fileHash: string;
  /** ไฟล์สลิปต้นฉบับ */
  fileBuffer: Buffer;
  mimeType: string;
}

export interface SlipVerifyResult {
  /** ผ่านทุกเงื่อนไข (ยอด + บัญชีปลายทาง + ไม่ซ้ำ) → auto-approve ได้ */
  verified: boolean;
  /** เหตุผลภาษาไทยเมื่อไม่ผ่าน — โชว์ในคิว manual (§7.1: ไม่ผ่าน = ตกคิว ไม่ reject อัตโนมัติ) */
  reason_th?: string;
  /** transaction reference จากสลิป (ถ้า provider อ่านได้) */
  transactionRef?: string;
  /** payload ดิบจาก provider — เก็บลง payment_slips.auto_verify_result */
  raw?: unknown;
}

export interface SlipVerifier {
  readonly providerName: string;
  verify(input: SlipVerifyInput): Promise<SlipVerifyResult>;
}
