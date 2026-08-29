import { z } from 'zod';
import { Id } from './common.js';

export const DropEntry = z
  .object({
    item: z.string().min(1),
    /** น้ำหนักในการสุ่ม (ต่อการดรอป 1 ครั้ง) */
    weight: z.number().min(0),
    min: z.number().int().min(0).default(1),
    max: z.number().int().min(0).default(1),
  })
  .strict();
export type DropEntry = z.infer<typeof DropEntry>;

export const DropTable = z
  .object({
    id: Id,
    /** จำนวนครั้งที่หมุน */
    rolls: z.number().int().min(1).default(1),
    entries: z.array(DropEntry).min(1),
  })
  .strict();
export type DropTable = z.infer<typeof DropTable>;
