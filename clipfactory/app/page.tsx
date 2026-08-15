'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProductForm } from '@/components/ProductForm';
import { TemplatePicker } from '@/components/TemplatePicker';
import { ScriptPanel } from '@/components/ScriptPanel';
import { VoicePanel } from '@/components/VoicePanel';
import { AssetPanel, type Asset } from '@/components/AssetPanel';
import { PreviewStage, type VoiceCue } from '@/components/PreviewStage';
import { RenderPanel, type RenderedClip } from '@/components/RenderPanel';
import { ErrorNote, Pill, Section } from '@/components/ui';
import { downloadBlob, requestScript, safeFilename, synthesizeLines } from '@/lib/client-api';
import { buildMixedAudio, decodeAudio } from '@/lib/render/audio';
import { checkSupport, renderClip } from '@/lib/render/encode';
import { buildTimeline, lineStarts, orderedVoiceKeys, voiceLines } from '@/lib/render/timeline';
import { TEMPLATES } from '@/lib/templates';
import {
  DEFAULT_RENDER,
  DEFAULT_THEME,
  type FormatTemplate,
  type GeneratedScript,
  type Platform,
  type ProductInput,
  type RenderOptions,
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

  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const support = useMemo(() => checkSupport(), []);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d: { hasKey: boolean }) => setHasKey(d.hasKey))
      .catch(() => setHasKey(null));
  }, []);

  const audioless = template?.audio === 'music-only';
  const hasCta = Boolean(template && template.audio !== 'music-only');

  // ── รวมเสียงพากย์ของ hook ที่เลือกอยู่ เข้ากับเสียงส่วนเนื้อหา
  const voice = useMemo<VoiceSegment[]>(() => {
    const hook = hookVoice[hookIndex];
    return hook ? [hook, ...bodyVoice] : bodyVoice;
  }, [hookVoice, hookIndex, bodyVoice]);

  const timeline = useMemo(() => {
    if (!script || !template) return { shots: [], totalSec: 0 };
    return buildTimeline({ script, hookIndex, template, voice, imageCount: assets.length });
  }, [script, template, hookIndex, voice, assets.length]);

  const renderOptions = useMemo<RenderOptions>(
    () => ({
      ...DEFAULT_RENDER,
      headline: script?.headline ?? '',
      showSafeGuides: showGuides,
      theme: DEFAULT_THEME,
    }),
    [script?.headline, showGuides],
  );

  const cues = useMemo<VoiceCue[]>(() => {
    if (!script || !template || voice.length === 0) return [];
    const keys = orderedVoiceKeys(script.scenes.length, hasCta);
    const starts = lineStarts(timeline);
    const byKey = new Map(voice.map((v) => [v.key, v]));
    const out: VoiceCue[] = [];
    keys.forEach((k, i) => {
      const seg = byKey.get(k);
      if (seg && starts[i] !== undefined) out.push({ startSec: starts[i], url: seg.url });
    });
    return out;
  }, [script, template, voice, timeline, hasCta]);

  const bitmaps = useMemo(() => assets.map((a) => a.bitmap), [assets]);

  // ── ขั้นที่ 2: เลือกสูตร
  const selectTemplate = useCallback((t: FormatTemplate) => {
    setTemplate(t);
    setTargetSec(t.targetSec);
    setScript(null);
    setHookIndex(0);
    setBodyVoice([]);
    setHookVoice({});
  }, []);

  // ── ขั้นที่ 3: สร้างสคริปต์
  const generateScript = useCallback(async () => {
    if (!template) return;
    setError('');
    setScriptBusy(true);
    try {
      const s = await requestScript({ product, templateId: template.id, platform, targetSec });
      setScript(s);
      setHookIndex(0);
      setBodyVoice([]);
      setHookVoice({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สร้างสคริปต์ไม่สำเร็จ');
    } finally {
      setScriptBusy(false);
    }
  }, [product, template, platform, targetSec]);

  // แก้สคริปต์แล้วเสียงเดิมใช้ไม่ได้ ต้องล้างทิ้งเพื่อไม่ให้เสียงกับซับไม่ตรงกัน
  const updateScript = useCallback(
    (next: GeneratedScript) => {
      if (!script) return;
      const hookChanged = next.hooks.some((h, i) => h !== script.hooks[i]);
      const bodyChanged =
        next.cta !== script.cta ||
        next.scenes.some((s, i) => s.vo !== script.scenes[i]?.vo) ||
        next.scenes.length !== script.scenes.length;
      if (hookChanged) setHookVoice({});
      if (bodyChanged) setBodyVoice([]);
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
      setBodyVoice(segs.filter((s) => s.key !== 'hook'));
      setHookVoice((prev) => (hook ? { ...prev, [hookIndex]: hook } : prev));
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
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

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
          lines: [{ key: 'hook', text: script.hooks[index] ?? script.headline }],
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
        sceneCount: script.scenes.length,
        hasCta,
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

      return {
        id: `${Date.now()}-${index}`,
        hookIndex: index,
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
    [renderOne, script, template],
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
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">โรงงานคลิปปักตะกร้า</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-soft)]">
              ป้อนข้อมูลสินค้า เลือกสูตรที่พิสูจน์แล้วว่าขายได้ ระบบเขียนสคริปต์ พากย์เสียงไทย
              และเรนเดอร์ mp4 แนวตั้งพร้อมโพสต์ให้ในที่เดียว
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
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <Section step={1} title="ข้อมูลสินค้า" hint="ยิ่งจุดขายชัด สคริปต์ยิ่งตรง" done={product.name.trim().length > 0}>
            <ProductForm value={product} onChange={setProduct} />
          </Section>

          <Section
            step={2}
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
            step={3}
            title="สคริปต์และ hook"
            hint={template ? `สูตรนี้ยาว ${template.durationSec[0]}–${template.durationSec[1]} วินาที` : undefined}
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
                    min={template.durationSec[0]}
                    max={template.durationSec[1]}
                    value={targetSec}
                    onChange={(e) => setTargetSec(Number(e.target.value))}
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
                />
              </div>
            ) : null}
          </Section>

          {script && !audioless ? (
            <Section step={4} title="เสียงพากย์ไทย" hint="สำหรับคนที่ไม่อยากพูดเอง" done={voice.length > 0}>
              <VoicePanel
                voiceName={voiceName}
                styleId={styleId}
                segments={voice}
                busy={voiceBusy}
                progress={voiceProgress}
                onVoice={setVoiceName}
                onStyle={setStyleId}
                onGenerate={generateVoice}
                lineCount={voiceLineCount}
              />
            </Section>
          ) : null}

          <Section step={audioless ? 4 : 5} title="รูปสินค้า" done={assets.length > 0}>
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

          <Section step={audioless ? 5 : 6} title="เรนเดอร์และดาวน์โหลด" done={results.length > 0}>
            <RenderPanel
              supportReason={support.ok ? null : support.reasonTh!}
              busy={renderBusy}
              progressLabel={renderLabel}
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
              onDownload={(c) => downloadBlob(c.blob, safeFilename(product.name, `hook${c.hookIndex + 1}`))}
              onDownloadAll={() =>
                results.forEach((c, i) =>
                  setTimeout(
                    () => downloadBlob(c.blob, safeFilename(product.name, `hook${c.hookIndex + 1}`)),
                    i * 350,
                  ),
                )
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
        </aside>
      </div>
    </main>
  );
}
