// 把时间 t 渲染成一帧：背景流线 → 当前场景 → 章节标记 → 双语字幕 → 转场与淡入淡出。

import { pulseAt, sampleArray, type AudioAnalysis } from '../audio/analyze'
import type { Bi } from '../content'
import { sceneAt, type ScenePlan, type Timeline } from '../timeline'
import { BG, H, W, appear, balancedWrap, easeOut, gold, hline, ink, lerp, richText, smoothstep, text, type TextOpts } from './draw'
import { FlowField } from './flow'
import type { FormulaCache } from './formulas'
import { SCENE_DRAW, type Fx } from './scenes'
import { Vortex, makePulses, type Pulse } from './vortex'

const SUB_ZH: TextOpts = { size: 42, zh: true, weight: 600 }
const SUB_EN: TextOpts = { size: 27, italic: true }

export class Renderer {
  private g: CanvasRenderingContext2D
  private f: FormulaCache
  private a: AudioAnalysis
  private tl: Timeline
  private flow: FlowField
  private vortex = new Vortex(1000)
  private pulses: Pulse[] = []
  private vignette: HTMLCanvasElement
  private wrapCache = new Map<string, string[]>()

  constructor(canvas: HTMLCanvasElement, f: FormulaCache, a: AudioAnalysis, tl: Timeline) {
    canvas.width = W
    canvas.height = H
    this.g = canvas.getContext('2d', { alpha: false })!
    this.f = f
    this.a = a
    this.tl = tl
    this.flow = this.makeFlow()
    this.vignette = makeVignette()
    this.setTimeline(tl)
  }

  private makeFlow() {
    const a = this.a
    return new FlowField(1400, (t) => 0.55 + 0.9 * sampleArray(a.energy, a.fps, t) + 0.4 * pulseAt(a.onsets, t, 0.14))
  }

  /** 音乐或切点变化时调用；音乐变了才重建依赖能量包络的背景流场 */
  update(a: AudioAnalysis, tl: Timeline) {
    if (a !== this.a) {
      this.a = a
      this.flow = this.makeFlow()
    }
    this.setTimeline(tl)
  }

  private setTimeline(tl: Timeline) {
    this.tl = tl
    const mech = tl.scenes.find((s) => s.id === 'mechanism')
    if (mech) {
      this.vortex.setDuration(mech.end - mech.start)
      // 第 4 句字幕（讲脉冲）之后，每个较强的起音生成一个环状脉冲
      const from = mech.cues[3] ?? mech.start
      const times: number[] = []
      for (const o of this.a.onsets) {
        if (o.t < from || o.t > mech.end - 0.4 || o.s < 0.45) continue
        if (times.length && o.t - times[times.length - 1] < 0.22) continue
        times.push(o.t)
      }
      this.pulses = makePulses(times)
    }
  }

  render(t: number) {
    const g = this.g
    const { a, tl } = this
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    g.fillStyle = BG
    g.fillRect(0, 0, W, H)

    const fx: Fx = {
      energy: sampleArray(a.energy, a.fps, t),
      pulse: pulseAt(a.onsets, t, 0.16),
      strong: pulseAt(a.onsets, t, 0.3, 0.7),
    }

    const i = sceneAt(tl, t)
    const plan = tl.scenes[i]
    const last = i === tl.scenes.length - 1

    this.flow.draw(g, t, this.flowAlpha(i, t), 0.6 * fx.pulse + 0.4 * fx.energy)

    const fadeIn = i === 0 ? 1 : easeOut((t - plan.start) / 0.4)
    const fadeOut = last ? 1 : easeOut((plan.end - t) / 0.35)
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut))
    SCENE_DRAW[plan.id]({
      g,
      t,
      lt: t - plan.start,
      dur: plan.end - plan.start,
      plan,
      alpha,
      fx,
      f: this.f,
      vortex: this.vortex,
      pulses: this.pulses,
      beats: a.beats,
    })

    if (plan.spec.marker) this.drawMarker(plan.spec.marker, alpha * appear(t, plan.start, 0.8))
    this.drawSubs(plan, t, alpha)
    this.drawCut(t, i)

    g.drawImage(this.vignette, 0, 0)
    // 开头从黑场淡入，结尾淡出到黑场
    const black = Math.max(1 - smoothstep(0, 1.2, t), smoothstep(tl.duration - 3, tl.duration - 0.2, t))
    if (black > 0.001) {
      g.globalAlpha = black
      g.fillStyle = BG
      g.fillRect(0, 0, W, H)
      g.globalAlpha = 1
    }
  }

  private flowAlpha(i: number, t: number) {
    const s = this.tl.scenes
    const cur = s[i]
    let fa = cur.spec.flow
    if (i > 0) fa = lerp(s[i - 1].spec.flow, fa, smoothstep(cur.start - 0.6, cur.start + 0.6, t))
    if (i < s.length - 1) fa = lerp(fa, s[i + 1].spec.flow, smoothstep(cur.end - 0.6, cur.end + 0.6, t))
    return fa * smoothstep(0, 5, t)
  }

  private drawMarker(m: Bi, a: number) {
    if (a <= 0.01) return
    const g = this.g
    g.globalAlpha = a
    hline(g, 80, 112, 70, gold(0.8), 1.5)
    const w = text(g, m.zh, 80, 108, { size: 22, zh: true, weight: 600, color: ink(0.78) })
    text(g, m.en, 80 + w + 16, 107, { size: 15, color: ink(0.45), tracking: 3, caps: true })
    g.globalAlpha = 1
  }

  private wrapped(s: string, width: number, o: TextOpts) {
    const key = `${o.zh ? 'z' : 'e'}|${width}|${s}`
    let v = this.wrapCache.get(key)
    if (!v) {
      v = balancedWrap(this.g, s, width, o)
      this.wrapCache.set(key, v)
    }
    return v
  }

  private drawSubs(plan: ScenePlan, t: number, sceneAlpha: number) {
    const subs = plan.spec.subs
    let k = -1
    for (let j = 0; j < subs.length; j++) if (plan.cues[subs[j].cue] <= t) k = j
    if (k < 0) return
    const s = subs[k]
    const start = plan.cues[s.cue]
    const endT = k + 1 < subs.length ? plan.cues[subs[k + 1].cue] - 0.08 : plan.end - 0.25
    const a = smoothstep(start, start + 0.35, t) * (1 - smoothstep(endT - 0.3, endT, t)) * sceneAlpha
    if (a <= 0.01) return
    const g = this.g
    const band = g.createLinearGradient(0, 840, 0, H)
    band.addColorStop(0, 'rgba(5,7,10,0)')
    band.addColorStop(1, `rgba(5,7,10,${0.78 * a})`)
    g.fillStyle = band
    g.fillRect(0, 840, W, H - 840)

    const zh = this.wrapped(s.zh, 1500, SUB_ZH)
    const en = this.wrapped(s.en, 1560, SUB_EN)
    const rise = (1 - smoothstep(start, start + 0.45, t)) * 8
    let y = 1034 + rise - (en.length - 1) * 36
    g.globalAlpha = a
    en.forEach((line, j) => richText(g, line, W / 2, y + j * 36, { ...SUB_EN, align: 'center', color: ink(0.72) }))
    y -= 50 + (zh.length - 1) * 54
    zh.forEach((line, j) => richText(g, line, W / 2, y + j * 54, { ...SUB_ZH, align: 'center', color: ink(0.97) }))
    g.globalAlpha = 1
  }

  /** 场景切换点上的一道细金线，从左扫到右 */
  private drawCut(t: number, i: number) {
    if (i === 0) return
    const b = this.tl.scenes[i].start
    const age = t - b
    if (age < 0 || age > 0.9) return
    const g = this.g
    const k = easeOut(age / 0.5)
    hline(g, 0, W * k, H - 26, gold(0.55 * (1 - smoothstep(0.3, 0.9, age))), 1.2)
  }
}

function makeVignette() {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.55)')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  return c
}
