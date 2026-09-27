import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { analyzeAudio, syntheticAnalysis, type AudioAnalysis } from './audio/analyze'
import { AudioEngine } from './audio/engine'
import { SCENES, SOURCES, type SceneId } from './content'
import { exportVideo } from './export'
import { loadFonts } from './fonts'
import { FormulaCache } from './render/formulas'
import { Renderer } from './render/renderer'
import { planTimeline } from './timeline'

const SCENE_NAMES: Record<SceneId, string> = {
  open: '序',
  title: '标题',
  equations: '方程',
  millennium: '千禧年难题',
  question: '问题',
  history: '部分答案',
  announce: '发布',
  theorem: '定理',
  mechanism: '机制',
  blowup: '爆破',
  verify: '形式化验证',
  status: '现状',
  credits: '致谢',
  end: '片尾',
}

/** 在不能下载文件的环境（如内嵌预览）里构建时设为 1，隐藏导出功能 */
const PREVIEW_ONLY = import.meta.env.VITE_PREVIEW_ONLY === '1'

/** 没有载入音乐时的无声预览 */
const PREVIEW = syntheticAnalysis()

const fmt = (t: number) => {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

const cutsKey = (name: string, duration: number) => `ns-blowup:cuts:${name}:${duration.toFixed(2)}`

function loadCuts(key: string): number[] | null {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as number[]) : null
  } catch {
    return null
  }
}

function saveCuts(key: string, cuts: number[] | null) {
  try {
    if (cuts) localStorage.setItem(key, JSON.stringify(cuts))
    else localStorage.removeItem(key)
  } catch {
    // 浏览器禁用存储时只是不记忆，不影响使用
  }
}

export default function Player() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [formulas] = useState(() => new FormulaCache())
  const rendererRef = useRef<Renderer | null>(null)
  const offsetRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [analysis, setAnalysis] = useState<AudioAnalysis>(PREVIEW)
  const [audioBuf, setAudioBuf] = useState<AudioBuffer | null>(null)
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('未载入音乐：当前为无声预览（按 120 BPM 的虚拟节拍卡点）')
  const [busy, setBusy] = useState(false)
  const [override, setOverride] = useState<number[] | null>(null)
  const [playing, setPlaying] = useState(false)
  const [engine] = useState(() => new AudioEngine(PREVIEW.duration, () => setPlaying(false)))
  const [time, setTime] = useState(0)
  const [offsetMs, setOffsetMs] = useState(0)
  const [fps, setFps] = useState(60)
  const [exportProgress, setExportProgress] = useState<number | null>(null)
  const [isFull, setIsFull] = useState(false)
  // 手机（尤其 iPhone）不支持元素全屏，退回到铺满视口的放映模式
  const [pseudoFull, setPseudoFull] = useState(false)
  const [idle, setIdle] = useState(false)

  const timeline = useMemo(() => planTimeline(analysis, override), [analysis, override])
  const cuts = timeline.scenes.slice(1).map((s) => s.start)

  useEffect(() => {
    offsetRef.current = offsetMs
  }, [offsetMs])

  // 字体与公式准备好之后才开始画
  useEffect(() => {
    let cancelled = false
    Promise.all([loadFonts(), formulas.prepare()])
      .then(() => !cancelled && setReady(true))
      .catch((e: unknown) => !cancelled && setLoadError(String(e)))
    return () => {
      cancelled = true
    }
  }, [formulas])

  useEffect(() => () => engine.pause(), [engine])

  useEffect(() => {
    if (!ready || !canvasRef.current) return
    if (!rendererRef.current) rendererRef.current = new Renderer(canvasRef.current, formulas, analysis, timeline)
    else rendererRef.current.update(analysis, timeline)
  }, [ready, formulas, analysis, timeline])

  // 渲染循环
  useEffect(() => {
    if (!ready) return
    let raf = 0
    let lastUi = 0
    const loop = (now: number) => {
      const t = engine.time()
      rendererRef.current?.render(Math.max(0, t - offsetRef.current / 1000))
      if (now - lastUi > 100) {
        lastUi = now
        setTime(t)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [ready, engine])

  const togglePlay = useCallback(async () => {
    if (engine.playing) {
      engine.pause()
      setPlaying(false)
    } else {
      await engine.play()
      setPlaying(true)
    }
  }, [engine])

  const seek = useCallback(
    (t: number) => {
      void engine.seek(t)
      setTime(engine.time())
    },
    [engine],
  )

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    if (pseudoFull) {
      setPseudoFull(false)
      return
    }
    const el = stageRef.current
    if (el && typeof el.requestFullscreen === 'function') el.requestFullscreen().catch(() => setPseudoFull(true))
    else setPseudoFull(true)
  }, [pseudoFull])

  useEffect(() => {
    const onFs = () => setIsFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // 全屏时鼠标静止 2 秒自动隐藏
  useEffect(() => {
    if (!isFull && !pseudoFull) return
    let timer = window.setTimeout(() => setIdle(true), 2000)
    const onMove = () => {
      setIdle(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), 2000)
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', onMove)
      setIdle(false)
    }
  }, [isFull, pseudoFull])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        void togglePlay()
      } else if (e.key === 'f' || e.key === 'F') toggleFull()
      else if (e.key === 'Escape') setPseudoFull(false)
      else if (e.key === 'ArrowLeft') seek(engine.time() - 5)
      else if (e.key === 'ArrowRight') seek(engine.time() + 5)
      else if (e.key === 'Home') seek(0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [engine, seek, toggleFull, togglePlay])

  const onFile = async (file: File) => {
    setBusy(true)
    engine.pause()
    setPlaying(false)
    try {
      setStatus('正在解码音频…')
      const buf = await engine.decode(await file.arrayBuffer())
      setStatus('正在分析节拍与段落…')
      const a = await analyzeAudio(buf, (p) => setStatus(`正在分析节拍与段落… ${Math.round(p * 100)}%`))
      engine.setBuffer(buf, buf.duration)
      setAudioBuf(buf)
      setFileName(file.name)
      setOverride(loadCuts(cutsKey(file.name, buf.duration)))
      setAnalysis(a)
      setTime(0)
      setStatus(`时长 ${fmt(buf.duration)} · 速度约 ${Math.round(a.bpm)} BPM · ${a.onsets.length} 个起音 · ${a.sections.length} 处段落变化`)
    } catch (e) {
      setStatus(`载入失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const updateCuts = (next: number[] | null) => {
    setOverride(next)
    if (fileName) saveCuts(cutsKey(fileName, analysis.duration), next)
  }

  const nudge = (i: number, dir: -1 | 1) => {
    const cur = [...cuts]
    const beats = analysis.beats
    const t = cur[i]
    const candidates = dir > 0 ? beats.filter((b) => b > t + 0.02) : beats.filter((b) => b < t - 0.02)
    const next = candidates.length ? (dir > 0 ? candidates[0] : candidates[candidates.length - 1]) : t + dir * 0.5
    const lo = i > 0 ? cur[i - 1] + 1 : 1
    const hi = i < cur.length - 1 ? cur[i + 1] - 1 : analysis.duration - 1
    cur[i] = Math.max(lo, Math.min(hi, next))
    updateCuts(cur)
    seek(Math.max(0, cur[i] - 2))
  }

  const onExport = async () => {
    engine.pause()
    setPlaying(false)
    const canvas = document.createElement('canvas')
    const renderer = new Renderer(canvas, formulas, analysis, timeline)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setExportProgress(0)
    try {
      const { blob, ext } = await exportVideo({
        canvas,
        renderer,
        duration: timeline.duration,
        audio: audioBuf,
        fps,
        onProgress: setExportProgress,
        signal: ctrl.signal,
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `navier-stokes-finite-time-blowup${ext}`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setStatus(`已导出 ${link.download}（${(blob.size / 1024 / 1024).toFixed(1)} MB）`)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setStatus(`导出失败：${e instanceof Error ? e.message : String(e)}`)
      }
    } finally {
      abortRef.current = null
      setExportProgress(null)
    }
  }

  const exporting = exportProgress !== null

  return (
    <main className="min-h-screen bg-[#05070a] px-4 py-8 text-slate-200">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="font-['Noto_Serif_SC_Variable',serif] text-2xl font-semibold tracking-wide text-[#ece8df] sm:text-3xl">纳维–斯托克斯方程的有限时间爆破 · 发布会视频</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            1920×1080 动态视频，画面在浏览器里实时渲染。载入音乐后自动分析节拍与段落，场景切换和动画重音随之卡点；可直接全屏放映，也可逐帧导出成视频文件。
          </p>
        </header>

        <div
          ref={stageRef}
          className={`${pseudoFull ? 'fixed inset-0 z-50' : 'relative aspect-video w-full rounded-lg ring-1 ring-white/10'} overflow-hidden bg-black [&:fullscreen]:rounded-none [&:fullscreen]:ring-0 ${(isFull || pseudoFull) && idle ? 'cursor-none' : ''}`}
        >
          <canvas ref={canvasRef} className="h-full w-full object-contain" onClick={() => void togglePlay()} />
          {!ready && (
            <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">
              {loadError ? `加载失败：${loadError}` : '正在加载字体与公式…'}
            </div>
          )}
          {pseudoFull && (
            <button
              type="button"
              onClick={() => setPseudoFull(false)}
              style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
              className={`absolute right-3 rounded-md bg-black/60 px-3 py-1.5 text-sm text-slate-200 ring-1 ring-white/20 transition-opacity ${idle ? 'opacity-0' : 'opacity-100'}`}
            >
              退出放映
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void togglePlay()}
            disabled={!ready || exporting}
            className="rounded-md bg-[#d2b273] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#e0c48a] disabled:opacity-40"
          >
            {playing ? '暂停' : '播放'}
          </button>
          <button
            type="button"
            onClick={toggleFull}
            disabled={!ready}
            className="rounded-md px-3 py-2 text-sm text-slate-300 ring-1 ring-white/15 transition hover:bg-white/5 disabled:opacity-40"
          >
            全屏放映
          </button>
          <span className="w-28 font-mono text-xs tabular-nums text-slate-400">
            {fmt(time)} / {fmt(timeline.duration)}
          </span>
          <input
            type="range"
            min={0}
            max={timeline.duration}
            step={0.01}
            value={Math.min(time, timeline.duration)}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={exporting}
            className="min-w-40 flex-1 accent-[#d2b273]"
            aria-label="进度"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          点画面也可播放/暂停。快捷键：空格 播放/暂停 · F 全屏 · ← → 快退/快进 5 秒 · Home 回到开头。手机上横屏观看效果更好。
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-lg p-5 ring-1 ring-white/10">
            <h2 className="text-base font-semibold text-[#ece8df]">1. 载入音乐</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              选择你合法持有的 ハイスイノナサ「地下鉄の動態」音频文件（MP3 / AAC / WAV / FLAC 等）。本页面不附带、也不上传任何音乐，分析全部在本机浏览器里完成。
            </p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 ring-1 ring-white/20 transition hover:bg-white/5">
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                disabled={busy || exporting}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onFile(file)
                  e.target.value = ''
                }}
              />
              {busy ? '处理中…' : fileName ? '换一个文件' : '选择音频文件'}
            </label>
            {fileName && <p className="mt-3 truncate text-sm text-slate-300">{fileName}</p>}
            <p className="mt-2 text-sm text-slate-400">{status}</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              在发布会等公开场合播放这首歌，需要取得相应的公开演奏/同步使用授权（日本地区一般经 JASRAC 或唱片公司）。
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">iPhone 上网页音频受静音开关控制，没有声音时请关闭静音模式。</p>
          </section>

          <section className="rounded-lg p-5 ring-1 ring-white/10">
            <h2 className="text-base font-semibold text-[#ece8df]">2. 导出视频</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              逐帧离线渲染并编码为 1920×1080 视频（优先 MP4：H.264 + AAC；浏览器不支持 AAC 编码时导出 WebM）。导出耗时取决于电脑性能，期间请保持此标签页在前台。
            </p>
            {PREVIEW_ONLY ? (
              <p className="mt-3 text-sm leading-relaxed text-[#d2b273]">
                这个预览版不能保存文件。导出请在电脑上用 Chrome 或 Edge 打开正式页面，或在本地运行项目。
              </p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="text-sm text-slate-300">
                    帧率{' '}
                    <select
                      value={fps}
                      onChange={(e) => setFps(Number(e.target.value))}
                      disabled={exporting}
                      className="ml-1 rounded bg-white/5 px-2 py-1 text-sm ring-1 ring-white/15"
                    >
                      <option value={60}>60 fps</option>
                      <option value={30}>30 fps</option>
                    </select>
                  </label>
                  {exporting ? (
                    <button
                      type="button"
                      onClick={() => abortRef.current?.abort()}
                      className="rounded-md px-3 py-2 text-sm text-slate-200 ring-1 ring-white/20 hover:bg-white/5"
                    >
                      取消导出
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onExport()}
                      disabled={!ready || busy}
                      className="rounded-md bg-[#d2b273] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#e0c48a] disabled:opacity-40"
                    >
                      导出视频
                    </button>
                  )}
                </div>
                {exporting && (
                  <div className="mt-4">
                    <div className="h-1.5 overflow-hidden rounded bg-white/10">
                      <div className="h-full bg-[#d2b273]" style={{ width: `${(exportProgress ?? 0) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-slate-400">{((exportProgress ?? 0) * 100).toFixed(1)}%</p>
                  </div>
                )}
                {!audioBuf && <p className="mt-3 text-xs text-slate-500">未载入音乐时导出的是无声版本。</p>}
              </>
            )}
          </section>

          <section className="rounded-lg p-5 ring-1 ring-white/10 md:col-span-2">
            <h2 className="text-base font-semibold text-[#ece8df]">3. 卡点微调</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              场景切点已自动吸附到音乐的段落变化和节拍上。觉得某个切点不够准，可以按拍前后移动；修改会按文件名记在本机浏览器里。
            </p>
            <label className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              现场放映画面延后
              <input
                type="range"
                min={-300}
                max={300}
                step={5}
                value={offsetMs}
                onChange={(e) => setOffsetMs(Number(e.target.value))}
                className="w-56 accent-[#d2b273]"
              />
              <span className="w-16 tabular-nums text-slate-400">{offsetMs} ms</span>
              <span className="text-xs text-slate-500">补偿音箱/蓝牙延迟，只影响实时播放，不影响导出</span>
            </label>
            <div className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {cuts.map((c, i) => (
                <div key={SCENES[i + 1].id} className="flex items-center gap-2 py-1 text-sm">
                  <button type="button" onClick={() => seek(Math.max(0, c - 2))} className="min-w-0 flex-1 truncate text-left text-slate-300 hover:text-[#d2b273]">
                    {SCENE_NAMES[SCENES[i].id]} → {SCENE_NAMES[SCENES[i + 1].id]}
                  </button>
                  <span className="w-14 text-right font-mono text-xs tabular-nums text-slate-400">{fmt(c)}</span>
                  <button type="button" onClick={() => nudge(i, -1)} className="rounded px-1.5 text-slate-400 ring-1 ring-white/15 hover:bg-white/5" aria-label="提前一拍">
                    −拍
                  </button>
                  <button type="button" onClick={() => nudge(i, 1)} className="rounded px-1.5 text-slate-400 ring-1 ring-white/15 hover:bg-white/5" aria-label="推后一拍">
                    +拍
                  </button>
                </div>
              ))}
            </div>
            {override && (
              <button type="button" onClick={() => updateCuts(null)} className="mt-3 text-sm text-[#d2b273] hover:underline">
                恢复自动切点
              </button>
            )}
          </section>

          <section className="rounded-lg p-5 ring-1 ring-white/10 md:col-span-2">
            <h2 className="text-base font-semibold text-[#ece8df]">内容说明与出处</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-400">
              <li>定理陈述、尺度律和论文目录逐字取自 OpenAI 论文；问题的四种表述取自 Fefferman 撰写的克雷研究所官方问题陈述。</li>
              <li>
                措辞按数学界规范区分“论文声称”与“已获认定”：截至 2026 年 9 月，该证明尚未经同行评审发表，克雷研究所的问题状态为 “Active”；按其规则，解答须在合格刊物发表满两年并获普遍认可才会被认定。
              </li>
              <li>无外力（f ≡ 0）情形下光滑解能否爆破仍是开放问题，片中如实说明。</li>
              <li>流场与涡旋画面是示意动画（比例经过夸张），不是数值模拟；片中相应位置有标注。</li>
              <li>致谢页列出论文引用的前人工作，以及 Alpöge 与 Buckmaster 同期公开的相关独立工作。</li>
            </ul>
            <ul className="mt-4 space-y-1 text-sm">
              {SOURCES.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-[#d2b273] hover:underline">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  )
}
