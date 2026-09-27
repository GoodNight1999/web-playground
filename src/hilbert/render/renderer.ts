// 把时间 t 渲染成一帧：当前场景 → 转场闪白 → 重拍提亮 → 胶片颗粒与暗角 → 首尾黑场。

import { pulseAt, sampleArray, type AudioAnalysis, type Onset } from '../audio/analyze'
import { SONG, buildTimeline, sceneAt, type SceneId, type Sizes, type Timeline } from '../timeline'
import { BG, H, W, easeOut, hash2, smoothstep } from './draw'
import type { Ctx, Fx, Note, NoteKind } from './ctx'
import type { FormulaCache } from './formulas'
import { drawCutting } from './scenes/cutting'
import { drawFluid } from './scenes/fluid'
import { drawGas } from './scenes/gas'
import { drawIntro } from './scenes/intro'
import { drawKinetic } from './scenes/kinetic'
import { drawLanford } from './scenes/lanford'
import { drawLayers } from './scenes/layers'
import { drawOutro } from './scenes/outro'
import { drawRest } from './scenes/rest'
import { drawSpacetime } from './scenes/spacetime'
import { drawTorus } from './scenes/torus'
import { GAS_A, buildVisuals, type Visuals } from './visuals'

const DRAW: Record<SceneId, (c: Ctx) => void> = {
  intro: drawIntro,
  gas: drawGas,
  spacetime: drawSpacetime,
  lanford: drawLanford,
  layers: drawLayers,
  cutting: drawCutting,
  torus: drawTorus,
  rest: drawRest,
  kinetic: drawKinetic,
  fluid: drawFluid,
  outro: drawOutro,
}

/** 大段落进入时整屏闪白的强度 */
const FLASH: [number, number][] = [
  [SONG.verse, 0.9],
  [SONG.theme2, 0.45],
  [SONG.chorus1, 0.8],
  [SONG.chorus1b, 0.5],
  [SONG.chorus2, 0.95],
  [SONG.chorus2b, 0.85],
]

function sizes(v: Visuals): Sizes {
  return {
    atomTimes: v.mol.atoms.map((a) => a.t),
    simT0: GAS_A.t0,
    simT: GAS_A.T,
    cutSteps: v.steps.length,
    particleLines: v.mol.lines.size,
  }
}

let sharedVisuals: Visuals | null = null

export class Renderer {
  private g: CanvasRenderingContext2D
  private f: FormulaCache
  private a: AudioAnalysis
  private tl: Timeline
  private v: Visuals
  private notes: Note[] = []
  private vignette: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, f: FormulaCache, a: AudioAnalysis) {
    canvas.width = W
    canvas.height = H
    this.g = canvas.getContext('2d', { alpha: false })!
    this.f = f
    this.a = a
    // 硬球模拟与流场约 1 秒，多个渲染器（预览与导出）共用一份
    sharedVisuals ??= buildVisuals()
    this.v = sharedVisuals
    this.tl = buildTimeline(a, sizes(this.v))
    this.notes = classify(a)
    this.vignette = makeVignette()
  }

  setAnalysis(a: AudioAnalysis) {
    if (a === this.a) return
    this.a = a
    this.tl = buildTimeline(a, sizes(this.v))
    this.notes = classify(a)
  }

  get timeline(): Timeline {
    return this.tl
  }

  render(t: number) {
    const g = this.g
    const { a, tl } = this
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    g.fillStyle = BG
    g.fillRect(0, 0, W, H)

    const fx: Fx = {
      energy: sampleArray(a.energy, a.fps, t),
      pulse: pulseAt(a.onsets, t, 0.14),
      low: pulseAt(a.lowOnsets, t, 0.16, 0.5),
      strong: pulseAt(a.onsets, t, 0.25, 0.8),
    }
    const i = sceneAt(tl, t)
    const sc = tl.scenes[i]
    const fadeIn = i === 0 ? 1 : easeOut((t - sc.start) / 0.12)
    const fadeOut = i === tl.scenes.length - 1 ? 1 : 1 - smoothstep(sc.end - 0.1, sc.end, t)
    DRAW[sc.id]({
      g,
      t,
      lt: t - sc.start,
      start: sc.start,
      end: sc.end,
      alpha: Math.max(0, Math.min(fadeIn, fadeOut)),
      fx,
      tl,
      a,
      f: this.f,
      v: this.v,
      notes: this.notes,
    })

    // 段落进入时闪白
    for (const [at, s] of FLASH) {
      const age = t - at
      if (age < 0 || age > 0.6) continue
      g.fillStyle = `rgba(255,255,255,${s * Math.exp(-age / 0.13)})`
      g.fillRect(0, 0, W, H)
    }
    // 重拍时整体轻微提亮
    if (fx.strong > 0.02 && sc.id !== 'rest') {
      g.globalCompositeOperation = 'lighter'
      g.fillStyle = `rgba(255,255,255,${0.035 * fx.strong})`
      g.fillRect(0, 0, W, H)
      g.globalCompositeOperation = 'source-over'
    }

    this.grain(t, sc.id === 'rest')
    if (sc.id !== 'rest') g.drawImage(this.vignette, 0, 0)

    // 开头从黑场淡入，结尾淡出到黑场
    const black = Math.max(1 - smoothstep(0, 0.5, t), smoothstep(tl.duration - 3, tl.duration - 0.3, t))
    if (black > 0.001) {
      g.fillStyle = `rgba(0,0,0,${black})`
      g.fillRect(0, 0, W, H)
    }
  }

  /** 胶片颗粒：每秒换 24 次，偏移由帧号决定，保证可复现 */
  private grain(t: number, onWhite: boolean) {
    const g = this.g
    const frame = Math.floor(t * 24)
    const tex = this.v.grain[frame % this.v.grain.length]
    const ox = Math.floor(hash2(frame, 1) * tex.width)
    const oy = Math.floor(hash2(frame, 2) * tex.height)
    g.save()
    g.globalAlpha = onWhite ? 0.09 : 0.055
    g.globalCompositeOperation = onWhite ? 'multiply' : 'screen'
    for (let y = -oy; y < H; y += tex.height) for (let x = -ox; x < W; x += tex.width) g.drawImage(tex, x, y)
    g.restore()
  }
}

/** 按频段把起音分成低、中、高三类，决定画成什么几何体 */
function classify(a: AudioAnalysis): Note[] {
  const near = (list: Onset[], t: number) => {
    let lo = 0
    let hi = list.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (Math.abs(list[mid].t - t) <= 0.035) return list[mid].s
      if (list[mid].t < t) lo = mid + 1
      else hi = mid - 1
    }
    return 0
  }
  return a.onsets
    .filter((o) => o.s >= 0.25)
    .map((o, i) => {
      const lo = near(a.lowOnsets, o.t)
      const hiS = near(a.highOnsets, o.t)
      const kind: NoteKind = lo >= 0.45 ? 'low' : hiS >= 0.5 && lo < 0.2 ? 'high' : 'mid'
      return { ...o, kind, i }
    })
}

function makeVignette() {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 1.0)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.6)')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  return c
}
