import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    /** H1 บนหน้า ถ้าอยากให้ต่างจาก <title> */
    heading: z.string().optional(),
    description: z.string(),
    /** คีย์เวิร์ดหลักที่ตั้งใจติดอันดับ — ใช้ตรวจงาน ไม่ได้ยัดลงหน้า */
    targetKeyword: z.string(),
    excerpt: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /** ลำดับความสำคัญในการโชว์เป็น "บทความแนะนำ" (น้อย = มาก่อน) */
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
