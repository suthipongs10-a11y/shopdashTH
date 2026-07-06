// ฟอนต์ไทยที่อนุญาตทั้ง 7 ตัว (§4.2) โหลดผ่าน next/font/google (self-hosted)
// - preload: false — บราวเซอร์จะดาวน์โหลดเฉพาะฟอนต์ที่ธีมใช้จริง
// - แต่ละตัว expose CSS variable แล้ว preset อ้างผ่านชื่อฟอนต์ (FONT_VAR)
// หมายเหตุ: next/font บังคับให้ argument เป็น literal ล้วน (compiler แกะค่า
// ตอน build) — ห้ามใช้ตัวแปร/spread ในการเรียก

import {
  Bai_Jamjuree,
  IBM_Plex_Sans_Thai,
  Kanit,
  Mitr,
  Noto_Sans_Thai,
  Prompt,
  Sarabun,
} from 'next/font/google';
import type { ThemeFontName } from './types';

const prompt = Prompt({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  preload: false,
  variable: '--font-prompt',
});

const sarabun = Sarabun({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  preload: false,
  variable: '--font-sarabun',
});

const kanit = Kanit({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  preload: false,
  variable: '--font-kanit',
});

const notoSansThai = Noto_Sans_Thai({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  preload: false,
  variable: '--font-noto-sans-thai',
});

const mitr = Mitr({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  preload: false,
  variable: '--font-mitr',
});

const baiJamjuree = Bai_Jamjuree({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  preload: false,
  variable: '--font-bai-jamjuree',
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  preload: false,
  variable: '--font-ibm-plex-sans-thai',
});

/** className รวมทุกฟอนต์ — ใส่ที่ ThemeScope เพื่อให้ var(--font-*) ใช้ได้ */
export const themeFontVariables = [
  prompt.variable,
  sarabun.variable,
  kanit.variable,
  notoSansThai.variable,
  mitr.variable,
  baiJamjuree.variable,
  ibmPlexSansThai.variable,
].join(' ');

/** map ชื่อฟอนต์ในธีม → ค่า CSS var สำหรับ --font-heading / --font-body */
export const FONT_VAR: Record<ThemeFontName, string> = {
  Prompt: 'var(--font-prompt)',
  Sarabun: 'var(--font-sarabun)',
  Kanit: 'var(--font-kanit)',
  'Noto Sans Thai': 'var(--font-noto-sans-thai)',
  Mitr: 'var(--font-mitr)',
  'Bai Jamjuree': 'var(--font-bai-jamjuree)',
  'IBM Plex Sans Thai': 'var(--font-ibm-plex-sans-thai)',
};
