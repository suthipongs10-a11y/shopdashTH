// PromptPay dynamic QR ต่อออร์เดอร์ (§2.2)
// สำคัญ: QR ต้อง generate จาก stores.promptpay_id ของ tenant นั้น (§1.2)
// ห้ามใช้ค่า config กลาง — เงินค่าสินค้าเข้าบัญชีร้านโดยตรง แพลตฟอร์มไม่แตะ

import 'server-only';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';

const PROMPTPAY_ID_PATTERN = /^[0-9]{10}$|^[0-9]{13}$/;

export function isValidPromptpayId(id: string): boolean {
  return PROMPTPAY_ID_PATTERN.test(id);
}

/**
 * สร้าง QR PromptPay ฝังยอดเงิน คืนเป็น SVG string (เรนเดอร์ผ่าน QrPaymentPanel)
 * @param promptpayId เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลักของร้าน
 * @param amountBaht ยอดจาก orders.total_amount (บาทเต็ม)
 */
export async function generatePromptpayQrSvg(
  promptpayId: string,
  amountBaht: number,
): Promise<string> {
  if (!isValidPromptpayId(promptpayId)) {
    throw new Error(`Invalid PromptPay ID: ${promptpayId}`);
  }
  if (!Number.isFinite(amountBaht) || amountBaht <= 0) {
    throw new Error(`Invalid amount: ${amountBaht}`);
  }
  const payload = generatePayload(promptpayId, { amount: amountBaht });
  return QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 1 });
}
