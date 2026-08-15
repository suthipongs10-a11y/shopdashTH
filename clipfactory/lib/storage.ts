'use client';

import type { GeneratedScript, Platform, ProductInput, TemplateId } from './types';

/**
 * เก็บงานไว้ในเครื่องผู้ใช้ (localStorage)
 *
 * เก็บเฉพาะข้อความ — ไฟล์เสียงและรูปไม่เก็บ เพราะเป็น object URL ที่ตายเมื่อปิดแท็บ
 * และการยัด base64 ลง localStorage จะเต็มโควตาทันที
 */

const KEY_JOBS = 'clipfactory.jobs.v1';
const KEY_DRAFT = 'clipfactory.draft.v1';
const MAX_JOBS = 60;

export interface SavedJob {
  id: string;
  savedAt: number;
  product: ProductInput;
  templateId: TemplateId | null;
  platform: Platform;
  targetSec: number;
  script: GeneratedScript | null;
  hookIndex: number;
  voiceName: string;
  styleId: string;
}

export type JobDraft = Omit<SavedJob, 'id' | 'savedAt'>;

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // โควตาเต็มหรือโหมดส่วนตัว — ไม่ควรทำให้แอปล้ม
    return false;
  }
}

export function loadJobs(): SavedJob[] {
  const jobs = read<SavedJob[]>(KEY_JOBS, []);
  return Array.isArray(jobs) ? jobs.filter((j) => j && typeof j.id === 'string') : [];
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** บันทึกงานใหม่ หรือทับงานเดิมถ้าส่ง id มา */
export function saveJob(draft: JobDraft, id?: string): { jobs: SavedJob[]; id: string; ok: boolean } {
  const jobs = loadJobs();
  const jobId = id ?? newId();
  const entry: SavedJob = { ...draft, id: jobId, savedAt: Date.now() };

  const existing = jobs.findIndex((j) => j.id === jobId);
  if (existing >= 0) jobs[existing] = entry;
  else jobs.unshift(entry);

  const trimmed = jobs.sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_JOBS);
  return { jobs: trimmed, id: jobId, ok: write(KEY_JOBS, trimmed) };
}

export function deleteJob(id: string): SavedJob[] {
  const jobs = loadJobs().filter((j) => j.id !== id);
  write(KEY_JOBS, jobs);
  return jobs;
}

/** งานที่กำลังทำอยู่ — กู้คืนอัตโนมัติเมื่อเผลอปิดแท็บ */
export function saveDraft(draft: JobDraft) {
  write(KEY_DRAFT, draft);
}

export function loadDraft(): JobDraft | null {
  const d = read<JobDraft | null>(KEY_DRAFT, null);
  return d && typeof d === 'object' && d.product ? d : null;
}

export function clearDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY_DRAFT);
  } catch {
    /* ไม่เป็นไร */
  }
}

export function formatSavedAt(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'เมื่อครู่';
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} วันที่แล้ว`;
  return new Date(ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}
