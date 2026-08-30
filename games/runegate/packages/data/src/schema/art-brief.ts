import { z } from 'zod';
import { Id } from './common.js';

/**
 * คำบรรยายภาพของตัวละคร 1 ตัว — ใช้สร้าง prompt สำหรับ AI วาดรูป (`npm run art-prompts`)
 * เขียนเป็นภาษาอังกฤษเพราะโมเดลสร้างภาพเข้าใจดีกว่า และ prompt ต้องส่งเป็นอังกฤษอยู่แล้ว
 */
export const ArtBrief = z
  .object({
    id: Id,
    /** เงาทึบของตัวละคร — สิ่งที่ต้องอ่านออกที่ 64 px */
    silhouette: z.string().min(10),
    /** รายละเอียดชุด/ผิว/วัสดุ/สี */
    details: z.string().min(10),
    /** ท่าโจมตี (ใช้กับ 3 เฟรมของ attack) */
    attack: z.string().min(5),
    /** ท่าตาย (ใช้กับ 3 เฟรมของ death) */
    death: z.string().min(5),
  })
  .strict();
export type ArtBrief = z.infer<typeof ArtBrief>;
