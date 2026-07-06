declare module 'promptpay-qr' {
  /**
   * สร้าง EMVCo payload สำหรับ PromptPay QR
   * @param target เบอร์มือถือ 10 หลัก / เลขบัตรประชาชน 13 หลัก / e-wallet id 15 หลัก
   * @param options amount เป็นบาท (ทศนิยมได้) — ไม่ใส่ = QR แบบไม่ระบุยอด
   */
  export default function generatePayload(target: string, options?: { amount?: number }): string;
}
