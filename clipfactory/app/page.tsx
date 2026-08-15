'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProductForm } from '@/components/ProductForm';
import { PasteImport } from '@/components/PasteImport';
import { TrendRadar } from '@/components/TrendRadar';
import { JobLibrary } from '@/components/JobLibrary';
import { buildShotList } from '@/components/ScriptExport';
import { TemplatePicker } from '@/components/TemplatePicker';
import { ScriptPanel } from '@/components/ScriptPanel';
import { VoicePanel } from '@/components/VoicePanel';
import { AssetPanel, type Asset } from '@/components/AssetPanel';
import { PreviewStage, type VoiceCue } from '@/components/PreviewStage';
import { RenderPanel, type RenderedClip } from '@/components/RenderPanel';
import { ErrorNote, Pill, Section } from '@/components/ui';
import {
  downloadBlob,
  requestParse,
  requestScript,
  requestTrends,
  revokeSegments,
  safeFilename,
  synthesizeLines,
} from '@/lib/client-api';
import {
  clearDraft,
  deleteJob as removeJob,
  loadDraft,
  loadJobs,
  saveDraft,
  saveJob,
  type JobDraft,
  type SavedJob,
} from '@/lib/storage';
import { buildMixedAudio, decodeAudio } from '@/lib/render/audio';
import { checkSupport, renderClip } from '@/lib/render/encode';
import { buildTimeline, voiceLines } from '@/lib/render/timeline';
import { clampDuration, durationRange, TEMPLATES } from '@/lib/templates';
import {
  DEFAULT_RENDER,
  DEFAULT_THEME,
  type FormatTemplate,
  type GeneratedScript,
  type TrendCard,
  type Platform,
  type ProductInput,
  type RenderOptions,
  type TrendReport,
  type VoiceSegment,
} from '@/lib/types';

const EMPTY_PRODUCT: ProductInput = {
  name: '',
  price: '',
  sellingPoints: ['', '', ''],
  category: '',
  url: '',
  audience: '',
};

export default function StudioPage() {
  // ── ขั้นที่ 1–2
  const [product, setProduct] = useState<ProductInput>(EMPTY_PRODUCT);
  const [platform, setPlatform] = useState<Platform>('tiktok');
  const [template, setTemplate] = useState<FormatTemplate | null>(null);
  const [targetSec, setTargetSec] = useState(15);

  // ── ขั้นที่ 3
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [hookIndex, setHookIndex] = useState(0);
  const [scriptBusy, setScriptBusy] = useState(false);

  // ── ขั้นที่ 4
  const [voiceName, setVoiceName] = useState('Kore');
  const [styleId, setStyleId] = useState('natural');
  const [bodyVoice, setBodyVoice] = useState<VoiceSegment[]>([]);
  const [hookVoice, setHookVoice] = useState<Record<number, VoiceSegment>>({});
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState<{ done: number; total: number; current: string } | null>(null);

  // ── ขั้นที่ 5
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetError, setAssetError] = useState('');

  // ── ขั้นที่ 6
  const [showGuides, setShowGuides] = useState(true);
  const [music, setMusic] = useState<{ name: string; buffer: AudioBuffer } | null>(null);
  const [results, setResults] = useState<RenderedClip[]>([]);
  const [renderBusy, setRenderBusy] = useState(false);
  const [renderLabel, setRenderLabel] = useState('');
  const [renderRatio, setRenderRatio] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [parseBusy, setParseBusy] = useState(false);
  const [trendReport, setTrendReport] = useState<TrendReport | null>(null);
  const [trendBusy, setTrendBusy] = useState(false);
  const [trendError, setTrendError] = useState('');
  const [restored, setRestored] = useState(false);

  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  // ตรวจความสามารถของเบราว์เซอร์หลัง mount เท่านั้น ไม่งั้น HTML ที่ prerender ฝั่งเซิร์ฟเวอร์จะไม่ตรงกับฝั่ง client
  const [support, setSupport] = useState<{ ok: boolean; reasonTh?: string }>({ ok: true });

  useEffect(() => {
    setSupport(checkSupport());
    setJobs(loadJobs());

    const draft = loadDraft();
    if (draft && draft.product?.name) {
      setProduct(draft.product);
      setPlatform(draft.platform);
      setTargetSec(draft.targetSec);
      setScript(draft.script);
      setHookIndex(draft.hookIndex);
      setVoiceName(draft.voiceName);
      setStyleId(draft.styleId);
      if (draft.templateId) {
        const t = TEMPLATES.find((x) => x.id === draft.templateId);
        if (t) setTemplate(t);
      }
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d: { hasKey: boolean }) => setHasKey(d.hasKey))
      .catch(() => setHasKey(null));
  }, []);

  // ล้างเสียงพากย์ทั้งหมดพร้อมคืนหน่วยความจำ — ใช้ทุกครั้งที่เสียงเดิมใช้ไม่ได้แล้ว
  const clearVoice = useCallback(() => {
    setBodyVoice((prev) => {
      revokeSegments(prev);
      return [];
    });
    setHookVoice((prev) => {
      revokeSegments(Object.values(prev));
      return {};
    });
  }, []);

  // เปลี่ยนเสียงหรือโทนการพูด ไฟล์เสียงเดิมก็ใช้ไม่ได้แล้ว
  const voiceSettingsRef = useRef(`${voiceName}/${styleId}`);
  useEffect(() => {
    const key = `${voiceName}/${styleId}`;
    if (voiceSettingsRef.current !== key) {
      voiceSettingsRef.current = key;
      clearVoice();
    }
  }, [voiceName, styleId, clearVoice]);

  const draft = useMemo<JobDraft>(
    () => ({
      product,
      templateId: template?.id ?? null,
      platform,
      targetSec,
      script,
      hookIndex,
      voiceName,
      styleId,
    }),
    [product, template?.id, platform, targetSec, script, hookIndex, voiceName, styleId],
  );

  // บันทึกงานที่ค้างอยู่แบบหน่วงเวลา กันเขียน localStorage ถี่เกินไปตอนพิมพ์
  useEffect(() => {
    if (!draft.product.name.trim()) return;
    const id = setTimeout(() => saveDraft(draft), 800);
    return () => clearTimeout(id);
  }, [draft]);

  const audioless = template?.audio === 'music-only';
  const hasCta = Boolean(template && template.audio !== 'music-only');

  // ── รวมเสียงพากย์ของ hook ที่เลือกอยู่ เข้ากับเสียงส่วนเนื้อหา
  const voice = useMemo<VoiceSegment[]>(() => {
    const hook = hookVoice[hookIndex];
    return hook ? [hook, ...bodyVoice] : bodyVoice;
  }, [hookVoice, hookIndex, bodyVoice]);

  const timeline = useMemo(() => {
    if (!script || !template) return { shots: [], totalSec: 0, lines: [] };
    return buildTimeline({ script, hookIndex, template, voice, imageCount: assets.length });
  }, [script, template, hookIndex, voice, assets.length]);

  const renderOptions = useMemo<RenderOptions>(
    () => ({
      ...DEFAULT_RENDER,
      headline: script?.headline ?? '',
      showSafeGuides: showGuides,
      titleCard: template?.visual.titleCard ?? false,
      kenBurns: template?.visual.kenBurns ?? 'alternate',
      theme: DEFAULT_THEME,
    }),
    [script?.headline, showGuides, template?.visual.titleCard, template?.visual.kenBurns],
  );

  const cues = useMemo<VoiceCue[]>(() => {
    if (!voice.length) return [];
    const byKey = new Map(voice.map((v) => [v.key, v]));
    return timeline.lines
      .map((line) => {
        const seg = byKey.get(line.key);
        return seg ? { startSec: line.startSec, url: seg.url } : null;
      })
      .filter((c): c is VoiceCue => c !== null);
  }, [voice, timeline]);

  const bitmaps = useMemo(() => assets.map((a) => a.bitmap), [assets]);

  // ── ขั้นที่ 2: เลือกสูตร
  const selectTemplate = useCallback((t: FormatTemplate) => {
    setTemplate(t);
    setTargetSec(clampDuration(t, platform, t.targetSec));
    setScript(null);
    setHookIndex(0);
    clearVoice();
  }, [clearVoice, platform]);

  const searchTrends = useCallback(
    async (query: string) => {
      if (!query) return;
      setTrendError('');
      setTrendBusy(true);
      try {
        setTrendReport(await requestTrends({ query, platform }));
      } catch (e) {
        setTrendError(e instanceof Error ? e.message : 'ค้นเทรนด์ไม่สำเร็จ');
      } finally {
        setTrendBusy(false);
      }
    },
    [platform],
  );

  // เอาเทรนด์มาตั้งต้นงานใหม่ — เติมหมวด กลุ่มลูกค้า และเลือกสูตรที่แนะนำให้เลย
  const useTrend = useCallback(
    (trend: TrendCard) => {
      clearVoice();
      setScript(null);
      setHookIndex(0);
      setProduct((prev) => ({
        ...prev,
        category: prev.category || trendReport?.queryTh || '',
        sellingPoints: prev.sellingPoints.some((p) => p.trim())
          ? prev.sellingPoints
          : [trend.angleTh, ...trend.productIdeas.slice(0, 2)].filter(Boolean),
      }));
      if (trend.templateId) {
        const t = TEMPLATES.find((x) => x.id === trend.templateId);
        if (t && t.platforms.includes(platform)) {
          setTemplate(t);
          setTargetSec(clampDuration(t, platform, t.targetSec));
        }
      }
      setWarning(
        `ตั้งต้นจากเทรนด์ “${trend.title}” แล้ว — กรอกชื่อสินค้าจริงที่จะขาย แล้วเขียนสคริปต์ต่อได้เลย`,
      );
      document.getElementById('p-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [clearVoice, platform, trendReport?.queryTh],
  );

  const importPasted = useCallback(async (raw: string) => {
    setError('');
    setParseBusy(true);
    try {
      const p = await requestParse(raw);
      setProduct((prev) => ({
        ...prev,
        ...p,
        sellingPoints: p.sellingPoints.length ? p.sellingPoints : prev.sellingPoints,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'แยกข้อมูลสินค้าไม่สำเร็จ');
    } finally {
      setParseBusy(false);
    }
  }, []);

  const saveCurrent = useCallback(() => {
    const res = saveJob(draft, currentJobId ?? undefined);
    setJobs(res.jobs);
    setCurrentJobId(res.id);
    setSaveError(res.ok ? '' : 'บันทึกไม่สำเร็จ — พื้นที่เก็บข้อมูลของเบราว์เซอร์อาจเต็ม');
  }, [draft, currentJobId]);

  const loadJob = useCallback(
    (job: SavedJob) => {
      clearVoice();
      setProduct(job.product);
      setPlatform(job.platform);
      setTargetSec(job.targetSec);
      setScript(job.script);
      setHookIndex(job.hookIndex);
      setVoiceName(job.voiceName);
      setStyleId(job.styleId);
      setTemplate(job.templateId ? (TEMPLATES.find((t) => t.id === job.templateId) ?? null) : null);
      setCurrentJobId(job.id);
      setRestored(false);
      setWarning('');
    },
    [clearVoice],
  );

  const startNew = useCallback(() => {
    clearVoice();
    setProduct(EMPTY_PRODUCT);
    setTemplate(null);
    setScript(null);
    setHookIndex(0);
    setCurrentJobId(null);
    setRestored(false);
    setWarning('');
    clearDraft();
  }, [clearVoice]);

  const exportShotList = useCallback(() => {
    if (!script || !template) return;
    const text = buildShotList({ productName: product.name, template, script, hookIndex, timeline });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, safeFilename(product.name, 'script').replace(/\.mp4$/, '.txt'));
  }, [script, template, product.name, hookIndex, timeline]);

  // ── ขั้นที่ 3: สร้างสคริปต์
  const generateScript = useCallback(async () => {
    if (!template) return;
    setError('');
    setScriptBusy(true);
    try {
      const s = await requestScript({ product, templateId: template.id, platform, targetSec });
      setScript(s);
      setHookIndex(0);
      clearVoice();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สร้างสคริปต์ไม่สำเร็จ');
    } finally {
      setScriptBusy(false);
    }
  }, [product, template, platform, targetSec, clearVoice]);

  // แก้สคริปต์แล้วเสียงเดิมใช้ไม่ได้ ต้องล้างทิ้งเพื่อไม่ให้เสียงกับซับไม่ตรงกัน
  const updateScript = useCallback(
    (next: GeneratedScript) => {
      if (!script) return;
      const hookChanged = next.hooks.some((h, i) => h !== script.hooks[i]);
      // caption เป็นต้นทางของเสียงพากย์เมื่อ vo ว่าง จึงต้องนับเป็นการเปลี่ยนแปลงด้วย
      const bodyChanged =
        next.cta !== script.cta ||
        next.scenes.length !== script.scenes.length ||
        next.scenes.some((s, i) => s.vo !== script.scenes[i]?.vo || s.caption !== script.scenes[i]?.caption);
      if (hookChanged)
        setHookVoice((prev) => {
          revokeSegments(Object.values(prev));
          return {};
        });
      if (bodyChanged)
        setBodyVoice((prev) => {
          revokeSegments(prev);
          return [];
        });
      setScript(next);
    },
    [script],
  );

  // ── ขั้นที่ 4: สร้างเสียงพากย์
  const generateVoice = useCallback(async () => {
    if (!script || !template) return;
    setError('');
    setVoiceBusy(true);
    setVoiceProgress({ done: 0, total: 0, current: '' });
    try {
      const lines = voiceLines(script, hookIndex, template);
      const segs = await synthesizeLines({
        lines,
        voiceName,
        styleId,
        onProgress: (done, total, current) => setVoiceProgress({ done, total, current }),
      });
      const hook = segs.find((s) => s.key === 'hook');
      setBodyVoice((prev) => {
        revokeSegments(prev);
        return segs.filter((s) => s.key !== 'hook');
      });
      setHookVoice((prev) => {
        if (!hook) return prev;
        const old = prev[hookIndex];
        if (old) revokeSegments([old]);
        return { ...prev, [hookIndex]: hook };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สร้างเสียงพากย์ไม่สำเร็จ');
    } finally {
      setVoiceBusy(false);
      setVoiceProgress(null);
    }
  }, [script, template, hookIndex, voiceName, styleId]);

  // ── ขั้นที่ 5: รูปภาพ
  const addAssets = useCallback(async (files: FileList) => {
    setAssetError('');
    const added: Asset[] = [];
    for (const file of Array.from(files)) {
      try {
        const bitmap = await createImageBitmap(file);
        added.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          url: URL.createObjectURL(file),
          bitmap,
        });
      } catch {
        setAssetError(`เปิดไฟล์ ${file.name} ไม่ได้ ลองบันทึกเป็น jpg หรือ png แล้วอัปโหลดใหม่`);
      }
    }
    if (added.length) setAssets((prev) => [...prev, ...added]);
  }, []);

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        target.bitmap.close();
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // คืนหน่วยความจำของรูปและไฟล์เสียงทั้งหมดเมื่อออกจากหน้า
  const assetsRef = useRef(assets);
  assetsRef.current = assets;
  useEffect(
    () => () => {
      for (const a of assetsRef.current) {
        URL.revokeObjectURL(a.url);
        a.bitmap.close();
      }
    },
    [],
  );

  const moveAsset = useCallback((id: string, dir: -1 | 1) => {
    setAssets((prev) => {
      const i = prev.findIndex((a) => a.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const pickMusic = useCallback(async (file: File) => {
    try {
      const buffer = await decodeAudio(await file.arrayBuffer());
      setMusic({ name: file.name, buffer });
    } catch {
      setError('อ่านไฟล์เพลงไม่ได้ ลองใช้ไฟล์ mp3 หรือ m4a');
    }
  }, []);

  // ── ขั้นที่ 6: เรนเดอร์
  const renderOne = useCallback(
    async (index: number, controller: AbortController, labelPrefix: string): Promise<RenderedClip | null> => {
      if (!script || !template) return null;

      // hook แต่ละเวอร์ชันต้องมีเสียงของตัวเอง — สร้างเพิ่มเฉพาะตัวที่ยังไม่มี
      let hookSeg = hookVoice[index];
      if (!hookSeg && !audioless) {
        setRenderLabel(`${labelPrefix} · กำลังสร้างเสียง hook`);
        const [seg] = await synthesizeLines({
          lines: [{ key: 'hook', text: script.hooks[index]?.trim() || script.headline }],
          voiceName,
          styleId,
          signal: controller.signal,
        });
        hookSeg = seg;
        setHookVoice((prev) => ({ ...prev, [index]: seg }));
      }

      const variantVoice = hookSeg ? [hookSeg, ...bodyVoice] : bodyVoice;
      const variantTimeline = buildTimeline({
        script,
        hookIndex: index,
        template,
        voice: variantVoice,
        imageCount: assets.length,
      });

      setRenderLabel(`${labelPrefix} · กำลังผสมเสียง`);
      const mixed = await buildMixedAudio({
        timeline: variantTimeline,
        voice: variantVoice,
        music: music?.buffer ?? null,
        allowMusic: template.audio !== 'voice-only',
      });

      const { blob, warningTh } = await renderClip({
        timeline: variantTimeline,
        images: bitmaps,
        options: { ...renderOptions, showSafeGuides: false },
        audio: mixed,
        productName: product.name,
        signal: controller.signal,
        onProgress: (p) => {
          setRenderLabel(`${labelPrefix} · ${p.labelTh}`);
          setRenderRatio(p.phase === 'video' ? p.ratio * 0.85 : 0.85 + p.ratio * 0.15);
        },
      });
      if (warningTh) setWarning(warningTh);

      const stamp = new Date().toLocaleTimeString('en-GB', { hour12: false }).replace(/:/g, '');
      return {
        id: `${Date.now()}-${index}`,
        hookIndex: index,
        fileName: safeFilename(product.name, `hook${index + 1}-${stamp}`),
        labelTh: `${template.nameTh} · hook ${index + 1}`,
        hookText: script.hooks[index] ?? '',
        blob,
        url: URL.createObjectURL(blob),
        sizeMB: (blob.size / 1024 / 1024).toFixed(1),
        durationSec: variantTimeline.totalSec,
      };
    },
    [
      script,
      template,
      hookVoice,
      bodyVoice,
      assets.length,
      music,
      hasCta,
      bitmaps,
      renderOptions,
      product.name,
      voiceName,
      styleId,
      audioless,
    ],
  );

  const runRender = useCallback(
    async (indices: number[]) => {
      if (!script || !template) return;
      setError('');
      setRenderBusy(true);
      setRenderRatio(0);

      // เตือนก่อนได้คลิปเงียบไปโดยไม่รู้ตัว
      if (template.audio === 'music-only' && !music) {
        setWarning('สูตรนี้ใช้เพลงเป็นเสียงทั้งหมด แต่ยังไม่ได้แนบไฟล์เพลง — คลิปที่ได้จะเงียบสนิท');
      } else if (template.audio !== 'music-only' && bodyVoice.length === 0) {
        setWarning('ยังไม่ได้สร้างเสียงพากย์ในขั้นที่ 5 — คลิปที่ได้จะมีแต่ภาพและข้อความ ไม่มีเสียงพูด');
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const out: RenderedClip[] = [];
        for (let n = 0; n < indices.length; n++) {
          const prefix = indices.length > 1 ? `คลิป ${n + 1}/${indices.length}` : 'กำลังเรนเดอร์';
          const clip = await renderOne(indices[n], controller, prefix);
          if (clip) {
            out.push(clip);
            setResults((prev) => [clip, ...prev]);
          }
        }
        if (out.length) setRenderLabel(`เสร็จแล้ว ${out.length} คลิป`);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') setRenderLabel('ยกเลิกแล้ว');
        else setError(e instanceof Error ? e.message : 'เรนเดอร์ไม่สำเร็จ');
      } finally {
        setRenderBusy(false);
        setRenderRatio(0);
        abortRef.current = null;
      }
    },
    [renderOne, script, template, bodyVoice.length, music],
  );

  const canScript = product.name.trim().length > 0 && Boolean(template);
  const voiceLineCount = script && template ? voiceLines(script, hookIndex, template).length : 0;
  const recommendedImages = template ? Math.max(3, template.sceneCount[0]) : 4;

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-[var(--color-line)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
              ClipFactory
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">หาเทรนด์ แล้วทำคลิปตามกระแส</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-soft)]">
              ค้นว่าตอนนี้อะไรกำลังมาแรงในไทย เลือกสูตรที่พิสูจน์แล้วว่าขายได้ ระบบเขียนสคริปต์
              พากย์เสียงไทย และเรนเดอร์ mp4 แนวตั้งให้พร้อมอัปโหลด
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="accent">{TEMPLATES.length} สูตรจากคลิปจริง</Pill>
            <Pill>เรนเดอร์ในเครื่อง ไม่อัปโหลดวิดีโอขึ้นเซิร์ฟเวอร์</Pill>
          </div>
        </div>

        {hasKey === false ? (
          <ErrorNote message="ยังไม่ได้ตั้งค่า GEMINI_API_KEY — คัดลอกไฟล์ .env.example เป็น .env.local แล้วใส่คีย์จาก aistudio.google.com/apikey ก่อนใช้งาน" />
        ) : null}
        {!support.ok ? <ErrorNote message={support.reasonTh!} /> : null}
        {restored ? (
          <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2.5 text-xs text-[var(--color-ink-soft)]">
            <span>กู้คืนงานที่ค้างไว้ให้แล้ว — เสียงพากย์และรูปต้องทำใหม่</span>
            <button type="button" onClick={() => setRestored(false)} className="flex-none font-bold" aria-label="ปิด">
              ✕
            </button>
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <Section
            step={1}
            title="หาเทรนด์ที่กำลังมาแรง"
            hint="ดูว่าตอนนี้คนไทยกำลังสนใจอะไร แล้วค่อยเลือกสินค้าให้ตรงกระแส"
            done={Boolean(trendReport)}
          >
            <TrendRadar
              report={trendReport}
              busy={trendBusy}
              error={trendError}
              onSearch={searchTrends}
              onUseTrend={useTrend}
              onDismissError={() => setTrendError('')}
            />
          </Section>

          <Section step={2} title="ข้อมูลสินค้า" hint="ยิ่งจุดขายชัด สคริปต์ยิ่งตรง" done={product.name.trim().length > 0}>
            <div className="grid gap-4">
              <PasteImport busy={parseBusy} onImport={importPasted} />
              <ProductForm value={product} onChange={setProduct} />
            </div>
          </Section>

          <Section
            step={3}
            title="เลือกแพลตฟอร์มและสูตรคลิป"
            hint="ตัวเลขสีทองคือยอดวิวเทียบค่ากลางของบัญชีนั้น"
            done={Boolean(template)}
            action={
              <div className="flex gap-1 rounded-lg border border-[var(--color-line)] p-1">
                {(['tiktok', 'shopee'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    data-testid={`platform-${p}`}
                    className={`rounded px-3 py-1 text-xs font-semibold transition ${
                      platform === p
                        ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {p === 'tiktok' ? 'TikTok' : 'Shopee'}
                  </button>
                ))}
              </div>
            }
          >
            <TemplatePicker
              category={product.category}
              platform={platform}
              selected={template?.id ?? null}
              onSelect={selectTemplate}
            />
          </Section>

          <Section
            step={4}
            title="สคริปต์และ hook"
            hint={
              template
                ? `สูตรนี้ยาว ${durationRange(template, platform)[0]}–${durationRange(template, platform)[1]} วินาที` +
                  (platform === 'shopee' ? ' (Shopee แนะนำ 10–30 วิ)' : '')
                : undefined
            }
            done={Boolean(script)}
            action={
              template ? (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-[var(--color-muted)]" htmlFor="dur">
                    ยาว
                  </label>
                  <input
                    id="dur"
                    type="number"
                    className="field w-16 px-2 py-1 text-xs"
                    min={durationRange(template, platform)[0]}
                    max={durationRange(template, platform)[1]}
                    value={targetSec}
                    onChange={(e) => setTargetSec(clampDuration(template, platform, Number(e.target.value)))}
                  />
                  <span className="text-[11px] text-[var(--color-muted)]">วิ</span>
                </div>
              ) : null
            }
          >
            <button type="button" className="btn-primary" onClick={generateScript} disabled={!canScript || scriptBusy}>
              {scriptBusy ? 'กำลังเขียน…' : script ? 'เขียนสคริปต์ใหม่' : 'เขียนสคริปต์ด้วย Gemini'}
            </button>
            {!canScript ? (
              <p className="mt-2 text-[11px] text-[var(--color-muted)]">กรอกชื่อสินค้าและเลือกสูตรคลิปก่อน</p>
            ) : null}

            {script ? (
              <div className="mt-5">
                <ScriptPanel
                  script={script}
                  hookIndex={hookIndex}
                  onHookIndex={setHookIndex}
                  onChange={updateScript}
                  audioless={Boolean(audioless)}
                  onExport={exportShotList}
                />
              </div>
            ) : null}
          </Section>

          {script && !audioless ? (
            <Section step={5} title="เสียงพากย์ไทย" hint="สำหรับคนที่ไม่อยากพูดเอง" done={voice.length > 0}>
              <VoicePanel
                voiceName={voiceName}
                styleId={styleId}
                segments={voice}
                busy={voiceBusy || renderBusy}
                progress={voiceProgress}
                onVoice={setVoiceName}
                onStyle={setStyleId}
                onGenerate={generateVoice}
                lineCount={voiceLineCount}
              />
            </Section>
          ) : null}

          <Section step={audioless ? 5 : 6} title="รูปสินค้า" done={assets.length > 0}>
            <AssetPanel
              assets={assets}
              onAdd={addAssets}
              onRemove={removeAsset}
              onMove={moveAsset}
              recommended={recommendedImages}
              error={assetError}
              onError={setAssetError}
            />
          </Section>

          <Section step={audioless ? 6 : 7} title="เรนเดอร์และดาวน์โหลด" done={results.length > 0}>
            <RenderPanel
              supportReason={support.ok ? null : support.reasonTh!}
              musicAllowed={template?.audio !== 'voice-only'}
              busy={renderBusy || voiceBusy}
              progressLabel={voiceBusy && !renderBusy ? 'กำลังสร้างเสียงพากย์ รอสักครู่' : renderLabel}
              progressRatio={renderRatio}
              hookCount={script?.hooks.length ?? 0}
              showGuides={showGuides}
              musicName={music?.name ?? null}
              results={results}
              onToggleGuides={setShowGuides}
              onPickMusic={pickMusic}
              onClearMusic={() => setMusic(null)}
              onRenderOne={() => runRender([hookIndex])}
              onRenderAll={() => runRender((script?.hooks ?? []).map((_, i) => i))}
              onCancel={() => abortRef.current?.abort()}
              onDownload={(c) => downloadBlob(c.blob, c.fileName)}
              onDownloadAll={() =>
                results.forEach((c, i) => setTimeout(() => downloadBlob(c.blob, c.fileName), i * 350))
              }
            />
          </Section>

          <ErrorNote message={error} onDismiss={() => setError('')} />
          {warning ? (
            <div
              role="status"
              className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-accent)]/45 bg-[var(--color-accent)]/10 px-3 py-2.5 text-xs leading-relaxed text-[var(--color-accent)]"
            >
              <span>{warning}</span>
              <button type="button" onClick={() => setWarning('')} className="flex-none font-bold" aria-label="ปิด">
                ✕
              </button>
            </div>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <div className="panel p-4">
            <h2 className="mb-3 text-sm font-bold">พรีวิว 9:16</h2>
            {script && timeline.shots.length ? (
              <PreviewStage
                timeline={timeline}
                images={bitmaps}
                options={renderOptions}
                productName={product.name}
                cues={cues}
              />
            ) : (
              <div className="mx-auto flex aspect-[9/16] w-full max-w-[300px] items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] px-6 text-center text-xs leading-relaxed text-[var(--color-muted)]">
                เขียนสคริปต์ก่อน แล้วพรีวิวจะขึ้นที่นี่
              </div>
            )}

            {template ? (
              <dl className="mt-4 grid gap-2 border-t border-[var(--color-line-soft)] pt-3 text-[11px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--color-muted)]">สูตร</dt>
                  <dd className="text-right">{template.nameTh}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--color-muted)]">ความยาวจริง</dt>
                  <dd className="mono text-right">{timeline.totalSec.toFixed(1)} วิ</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--color-muted)]">จำนวนช็อต</dt>
                  <dd className="mono text-right">{timeline.shots.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--color-muted)]">เขตปลอดภัย</dt>
                  <dd className="mono text-right">ล่าง 25% · ขวา 15%</dd>
                </div>
              </dl>
            ) : null}
          </div>

          <div className="panel mt-4 p-4">
            <h2 className="mb-3 text-sm font-bold">งานของฉัน</h2>
            <JobLibrary
              jobs={jobs}
              currentId={currentJobId}
              canSave={product.name.trim().length > 0}
              onSave={saveCurrent}
              onLoad={loadJob}
              onDelete={(id) => {
                setJobs(removeJob(id));
                if (id === currentJobId) setCurrentJobId(null);
              }}
              onNew={startNew}
              saveError={saveError}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
