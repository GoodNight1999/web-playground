import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzeAudio, syntheticAnalysis, type AudioAnalysis } from './audio/analyze'
import { AudioEngine } from './audio/engine'
import { SOURCES } from './content'
import { exportVideo } from './export'
import { loadFonts } from './fonts'
import { FormulaCache } from './render/formulas'
import { Renderer } from './render/renderer'
import { SONG } from './timeline'

/** 在不能下载文件的环境（如内嵌预览）里构建时设为 1，隐藏导出功能 */
const PREVIEW_ONLY = import.meta.env.VITE_PREVIEW_ONLY === '1'

/** 构建时预置的音乐文件（相对页面的地址）与显示名；不设则需要用户自己选择文件 */
const PRELOAD_AUDIO: string = import.meta.env.VITE_PRELOAD_AUDIO ?? ''
const PRELOAD_NAME: string = import.meta.env.VITE_PRELOAD_AUDIO_NAME ?? '预置音乐'

/** 没有载入音乐时的无声预览，时长与原曲一致 */
const PREVIEW = syntheticAnalysis(246.02, 128)

/** 按歌曲结构划分的段落，点击可跳转 */
const CHAPTERS: [string, number][] = [
  ['前奏 · 问答', 0],
  ['主歌 · 临界线', SONG.verse],
  ['ζ(½+it) 的轨迹', SONG.theme2],
  ['副歌 · 相位', SONG.chorus1],
  ['歇息 · 阶段总结', SONG.rest],
  ['副歌 · 素数之音', SONG.chorus2],
  ['尾声', SONG.outro],
]

const fmt = (t: number) => {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
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
  const [status, setStatus] = useState('未载入音乐：当前为无声预览')
  const [busy, setBusy] = useState(false)
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
    if (!rendererRef.current) rendererRef.current = new Renderer(canvasRef.current, formulas, analysis)
    else rendererRef.current.setAnalysis(analysis)
  }, [ready, formulas, analysis])

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

  const loadAudio = useCallback(
    async (name: string, read: () => Promise<ArrayBuffer>) => {
      setBusy(true)
      engine.pause()
      setPlaying(false)
      try {
        setStatus('正在解码音频…')
        const buf = await engine.decode(await read())
        setStatus('正在分析起音…')
        const a = await analyzeAudio(buf, (p) => setStatus(`正在分析起音… ${Math.round(p * 100)}%`))
        engine.setBuffer(buf, buf.duration)
        setAudioBuf(buf)
        setFileName(name)
        setAnalysis(a)
        setTime(0)
        const off = Math.abs(buf.duration - PREVIEW.duration) > 2
        setStatus(
          off
            ? `时长 ${fmt(buf.duration)}：与原曲（${fmt(PREVIEW.duration)}）不一致，段落是按原曲编排的，画面可能对不上。`
            : `时长 ${fmt(buf.duration)} · ${a.onsets.length} 个起音，已按原曲结构卡点`,
        )
      } catch (e) {
        setStatus(`载入失败：${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setBusy(false)
      }
    },
    [engine],
  )

  const onFile = (file: File) => loadAudio(file.name, () => file.arrayBuffer())

  // 构建时预置了音乐（VITE_PRELOAD_AUDIO）就自动载入，免去手动选文件
  useEffect(() => {
    if (!PRELOAD_AUDIO) return
    const timer = window.setTimeout(() => {
      void loadAudio(PRELOAD_NAME, async () => {
        const res = await fetch(PRELOAD_AUDIO)
        if (!res.ok) throw new Error(`预置音乐读取失败（HTTP ${res.status}）`)
        return res.arrayBuffer()
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadAudio])

  const onExport = async () => {
    engine.pause()
    setPlaying(false)
    const canvas = document.createElement('canvas')
    const renderer = new Renderer(canvas, formulas, analysis)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setExportProgress(0)
    try {
      const { blob, ext } = await exportVideo({
        canvas,
        renderer,
        duration: analysis.duration,
        audio: audioBuf,
        fps,
        onProgress: setExportProgress,
        signal: ctrl.signal,
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `riemann-hypothesis${ext}`
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
  const duration = analysis.duration

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-neutral-300">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="font-['Noto_Serif_SC_Variable',serif] text-2xl font-light tracking-[0.2em] text-white sm:text-3xl">黎曼猜想</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            配乐 ハイスイノナサ「地下鉄の動態」。画面在浏览器里实时渲染，所有零点与曲线都是数值计算结果；段落按原曲结构编排，每个音都对应一个几何体。
          </p>
        </header>

        <div
          ref={stageRef}
          className={`${pseudoFull ? 'fixed inset-0 z-50' : 'relative aspect-video w-full ring-1 ring-white/10'} overflow-hidden bg-black [&:fullscreen]:ring-0 ${(isFull || pseudoFull) && idle ? 'cursor-none' : ''}`}
        >
          <canvas ref={canvasRef} className="h-full w-full object-contain" onClick={() => void togglePlay()} />
          {!ready && (
            <div className="absolute inset-0 grid place-items-center text-sm text-neutral-500">
              {loadError ? `加载失败：${loadError}` : '正在加载字体、公式与 ζ 函数数据…'}
            </div>
          )}
          {pseudoFull && (
            <button
              type="button"
              onClick={() => setPseudoFull(false)}
              style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
              className={`absolute right-3 bg-black/60 px-3 py-1.5 text-sm text-neutral-200 ring-1 ring-white/20 transition-opacity ${idle ? 'opacity-0' : 'opacity-100'}`}
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
            className="bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-40"
          >
            {playing ? '暂停' : '播放'}
          </button>
          <button
            type="button"
            onClick={toggleFull}
            disabled={!ready}
            className="px-3 py-2 text-sm text-neutral-300 ring-1 ring-white/20 transition hover:bg-white/5 disabled:opacity-40"
          >
            全屏放映
          </button>
          <span className="w-28 font-mono text-xs tabular-nums text-neutral-500">
            {fmt(time)} / {fmt(duration)}
          </span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={Math.min(time, duration)}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={exporting}
            className="min-w-40 flex-1 accent-white"
            aria-label="进度"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
          {CHAPTERS.map(([name, at]) => (
            <button key={name} type="button" onClick={() => seek(at)} className="hover:text-white">
              <span className="font-mono tabular-nums">{fmt(at)}</span> {name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-600">点画面播放/暂停 · 空格 播放/暂停 · F 全屏 · ← → 快退/快进 5 秒 · 手机上横屏观看效果更好</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="p-5 ring-1 ring-white/10">
            <h2 className="text-base font-medium text-white">音乐</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              {PRELOAD_AUDIO
                ? `这个页面已预置 ${PRELOAD_NAME}，打开后自动载入，直接点播放即可。`
                : '选择你合法持有的 ハイスイノナサ「地下鉄の動態」音频文件。页面不附带、也不上传任何音乐，分析全部在本机浏览器里完成。'}
            </p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-neutral-200 ring-1 ring-white/20 transition hover:bg-white/5">
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
            {fileName && <p className="mt-3 truncate text-sm text-neutral-300">{fileName}</p>}
            <p className="mt-2 text-sm text-neutral-500">{status}</p>
            <label className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-400">
              现场放映画面延后
              <input
                type="range"
                min={-300}
                max={300}
                step={5}
                value={offsetMs}
                onChange={(e) => setOffsetMs(Number(e.target.value))}
                className="w-40 accent-white"
              />
              <span className="w-16 tabular-nums">{offsetMs} ms</span>
            </label>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600">
              补偿音箱或蓝牙的延迟，只影响实时播放。iPhone 的静音开关会让网页没有声音。公开场合播放这首歌需要取得相应授权。
            </p>
          </section>

          <section className="p-5 ring-1 ring-white/10">
            <h2 className="text-base font-medium text-white">导出视频</h2>
            {PREVIEW_ONLY ? (
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">这个预览版不能保存文件。导出请在电脑上用 Chrome 或 Edge 打开正式页面，或在本地运行项目。</p>
            ) : (
              <>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  逐帧离线渲染为 1920×1080 视频（优先 MP4：H.264 + AAC；浏览器不支持 AAC 编码时导出 WebM）。导出期间请保持此标签页在前台。
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="text-sm text-neutral-300">
                    帧率{' '}
                    <select
                      value={fps}
                      onChange={(e) => setFps(Number(e.target.value))}
                      disabled={exporting}
                      className="ml-1 bg-white/5 px-2 py-1 text-sm ring-1 ring-white/15"
                    >
                      <option value={60}>60 fps</option>
                      <option value={30}>30 fps</option>
                    </select>
                  </label>
                  {exporting ? (
                    <button type="button" onClick={() => abortRef.current?.abort()} className="px-3 py-2 text-sm text-neutral-200 ring-1 ring-white/20 hover:bg-white/5">
                      取消导出
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onExport()}
                      disabled={!ready || busy}
                      className="bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-40"
                    >
                      导出视频
                    </button>
                  )}
                </div>
                {exporting && (
                  <div className="mt-4">
                    <div className="h-1 overflow-hidden bg-white/10">
                      <div className="h-full bg-white" style={{ width: `${(exportProgress ?? 0) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-neutral-500">{((exportProgress ?? 0) * 100).toFixed(1)}%</p>
                  </div>
                )}
                {!audioBuf && <p className="mt-3 text-xs text-neutral-600">未载入音乐时导出的是无声版本。</p>}
              </>
            )}
          </section>

          <section className="p-5 ring-1 ring-white/10 md:col-span-2">
            <h2 className="text-base font-medium text-white">内容说明与出处</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-500">
              <li>ζ 函数用 Borwein 加速级数与函数方程计算，并与 mpmath 逐点对照；零点取自 mpmath 的 30 位精度计算；片中数值一律截断并加省略号。</li>
              <li>素数之音一段用的是冯·曼戈尔特显式公式，只取前 500 个零点，因此曲线在台阶附近会有细小的振荡，这是截断求和的真实结果。</li>
              <li>黎曼猜想至今（2026 年 9 月）未被证明。片中所列已知结果：Hardy（1914）、Conrey（1989）、Platt 与 Trudgian（2021）。</li>
              <li>视觉风格参考大西景太为原曲制作的 MV：黑白几何图形，每个音对应一个几何体。</li>
            </ul>
            <ul className="mt-4 space-y-1 text-sm">
              {SOURCES.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-neutral-300 underline decoration-white/20 hover:text-white">
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
