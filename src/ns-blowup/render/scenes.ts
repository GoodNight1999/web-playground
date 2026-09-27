// 各场景的绘制。每个函数只依赖时间 t 与卡点时间，画面可任意跳转、逐帧导出。

import {
  ALTERNATIVES,
  ANNOUNCE,
  CREDITS,
  CREDITS_MORE,
  END_NOTE,
  END_REFS,
  EQUATION_TERMS,
  HISTORY,
  MILLENNIUM,
  MUSIC_CREDIT,
  PAPER_TOC,
  SCHEMATIC,
  SCHEMATIC_CURVE,
  STATUS,
  STATUS_HEAD,
  TITLE,
  type Bi,
  type SceneId,
} from '../content'
import type { FormulaId } from '../formulas.gen'
import type { ScenePlan } from '../timeline'
import { appear, blue, clamp01, easeInOut, easeOut, gold, hline, ink, measure, richText, smoothstep, text, withAlpha } from './draw'
import type { FormulaCache } from './formulas'
import type { Pulse, Vortex } from './vortex'

export type Fx = {
  energy: number
  /** 任意起音的瞬时冲击 0..1 */
  pulse: number
  /** 强起音（重拍）的冲击 0..1 */
  strong: number
}

export type SceneCtx = {
  g: CanvasRenderingContext2D
  t: number
  lt: number
  dur: number
  plan: ScenePlan
  alpha: number
  fx: Fx
  f: FormulaCache
  vortex: Vortex
  pulses: Pulse[]
  /** 场景内相邻节拍，用于逐拍出现的列表 */
  beats: number[]
}

const cueP = (c: SceneCtx, i: number, d = 0.6) => (i < c.plan.cues.length ? appear(c.t, c.plan.cues[i], d) : 0)
const since = (c: SceneCtx, i: number) => c.t - c.plan.cues[i]
/** 刚出现时的金色高亮，随后回落 */
const highlight = (c: SceneCtx, i: number, hold = 1.3) => {
  const s = since(c, i)
  return s < 0 ? 0 : appear(c.t, c.plan.cues[i], 0.25) * (1 - smoothstep(hold, hold + 0.9, s))
}

function frame(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  g.strokeStyle = color
  g.lineWidth = 1
  g.strokeRect(x + 0.5, y + 0.5, w, h)
}

function grid(g: CanvasRenderingContext2D, alpha: number) {
  if (alpha <= 0.01) return
  g.strokeStyle = ink(0.035 * alpha)
  g.lineWidth = 1
  g.beginPath()
  for (let x = 0; x <= 1920; x += 60) {
    g.moveTo(x + 0.5, 0)
    g.lineTo(x + 0.5, 1080)
  }
  for (let y = 0; y <= 1080; y += 60) {
    g.moveTo(0, y + 0.5)
    g.lineTo(1920, y + 0.5)
  }
  g.stroke()
}

function tag(g: CanvasRenderingContext2D, b: Bi, x: number, y: number, alpha: number) {
  text(g, `${b.zh}  ·  ${b.en}`, x, y, { size: 17, zh: true, weight: 400, color: ink(0.42 * alpha) })
}

// ---------------------------------------------------------------- 各场景

function open(c: SceneCtx) {
  const { g } = c
  const k = cueP(c, 0, 1.8)
  const fadeOut = 1 - 0.7 * cueP(c, 1, 1.4)
  const w = 200 * k
  hline(g, 960 - w, 960 + w, 540, gold(0.55 * c.alpha * fadeOut * (0.8 + 0.4 * c.fx.strong)))
}

function title(c: SceneCtx) {
  const { g, t } = c
  const a0 = cueP(c, 0, 0.9)
  const a1 = cueP(c, 1, 0.9)
  withAlpha(g, c.alpha * a0, () => {
    const rise = (1 - a0) * 16
    text(g, TITLE.zh, 960, 480 + rise, { size: 78, zh: true, weight: 700, align: 'center', color: ink(0.97), tracking: 4 })
    text(g, TITLE.en, 960, 560 + rise, { size: 42, weight: 400, align: 'center', color: ink(0.82), tracking: 1 })
    const w = 330 * easeOut((t - c.plan.cues[0]) / 1.4)
    const glow = 0.45 + 0.35 * c.fx.strong
    hline(g, 960 - 18 - w, 960 - 18, 616, gold(glow))
    hline(g, 960 + 18, 960 + 18 + w, 616, gold(glow))
    g.fillStyle = gold(0.9)
    g.beginPath()
    g.moveTo(960, 609)
    g.lineTo(967, 616)
    g.lineTo(960, 623)
    g.lineTo(953, 616)
    g.fill()
  })
  withAlpha(g, c.alpha * a1, () => {
    text(g, TITLE.tagZh, 960, 682, { size: 26, zh: true, weight: 400, align: 'center', color: ink(0.72), tracking: 6 })
    text(g, TITLE.tagEn, 960, 718, { size: 20, italic: true, align: 'center', color: ink(0.5) })
  })
}

function equations(c: SceneCtx) {
  const { g, f } = c
  const em = 66
  type Piece = { id: FormulaId; term: number; label?: Bi } | { gap: number }
  const seq: Piece[] = [
    { id: 'eq_dtu', term: 0, label: EQUATION_TERMS[0].label },
    { id: 'eq_plus', term: 1 },
    { id: 'eq_conv', term: 1, label: EQUATION_TERMS[1].label },
    { id: 'eq_minus', term: 2 },
    { id: 'eq_visc', term: 2, label: EQUATION_TERMS[2].label },
    { id: 'eq_plus', term: 3 },
    { id: 'eq_grad', term: 3, label: EQUATION_TERMS[3].label },
    { id: 'eq_eq', term: 4 },
    { id: 'eq_f', term: 4, label: EQUATION_TERMS[4].label },
    { id: 'eq_comma', term: 4 },
    { gap: 1.9 * em },
    { id: 'eq_div', term: 5, label: EQUATION_TERMS[5].label },
  ]
  const widths = seq.map((p) => ('gap' in p ? p.gap : f.width(p.id, em)))
  const total = widths.reduce((s, w) => s + w, 0)
  let x = 960 - total / 2
  const base = 468
  seq.forEach((p, i) => {
    const w = widths[i]
    if (!('gap' in p)) {
      const a = cueP(c, p.term, 0.7) * c.alpha
      const hl = highlight(c, p.term)
      const rise = (1 - cueP(c, p.term, 0.7)) * 14
      f.draw(g, p.id, x, base + rise, { em, alpha: a * (1 - hl) })
      f.draw(g, p.id, x, base + rise, { em, color: 'gold', alpha: a * hl })
      if (p.label) {
        const cx = x + w / 2
        const la = cueP(c, p.term, 1) * c.alpha
        const bw = w / 2 + 4
        g.strokeStyle = hl > 0.05 ? gold((0.35 + 0.5 * hl) * la) : ink(0.25 * la)
        g.lineWidth = 1
        g.beginPath()
        g.moveTo(cx - bw, 508)
        g.lineTo(cx - bw, 516)
        g.lineTo(cx + bw, 516)
        g.lineTo(cx + bw, 508)
        g.stroke()
        withAlpha(g, la, () => {
          text(g, p.label!.zh, cx, 558, { size: 23, zh: true, weight: 400, align: 'center', color: ink(0.82) })
          text(g, p.label!.en, cx, 586, { size: 17, italic: true, align: 'center', color: ink(0.52) })
        })
      }
    }
    x += w
  })
}

function millennium(c: SceneCtx) {
  const { g, t } = c
  const W = 392
  const Hh = 168
  const gapX = 26
  const gapY = 30
  const rows = [MILLENNIUM.slice(0, 4), MILLENNIUM.slice(4)]
  const focus = cueP(c, 8, 0.9)
  let idx = 0
  rows.forEach((row, r) => {
    const rowW = row.length * W + (row.length - 1) * gapX
    const y = 262 + r * (Hh + gapY)
    row.forEach((m, j) => {
      const i = idx++
      const x = 960 - rowW / 2 + j * (W + gapX)
      const a = cueP(c, i + 1, 0.6) * c.alpha
      if (a <= 0.01) return
      const dim = m.ns ? 1 : 1 - 0.6 * focus
      const solved = m.note && !m.ns
      withAlpha(g, a * dim, () => {
        frame(g, x, y, W, Hh, m.ns ? gold(0.25 + 0.6 * focus) : ink(solved ? 0.12 : 0.2))
        // 出现时顶边的金线
        const sweep = easeOut((t - c.plan.cues[i + 1]) / 0.5)
        const fade = 1 - smoothstep(0.6, 1.6, t - c.plan.cues[i + 1])
        hline(g, x, x + W * sweep, y + 0.5, gold(0.9 * fade + (m.ns ? 0.6 * focus : 0)), 2)
        const nameAlpha = solved ? 0.55 : 1
        text(g, m.zh, x + 24, y + 54, { size: 25, zh: true, weight: 600, color: ink(0.95 * nameAlpha) })
        text(g, m.en, x + 24, y + 84, { size: 17, italic: true, color: ink(0.58 * nameAlpha) })
        if (m.note) {
          const na = m.ns ? focus : 1
          text(g, m.note.zh, x + 24, y + 124, { size: 16, zh: true, weight: 400, color: gold(0.9 * na) })
          text(g, m.note.en, x + 24, y + 148, { size: 14, italic: true, color: gold(0.7 * na) })
        }
      })
    })
  })
}

function question(c: SceneCtx) {
  const { g, f } = c
  const a0 = cueP(c, 0, 0.9) * c.alpha
  f.draw(g, 'ns_compact', 960, 262, { em: 40, align: 'center', alpha: 0.85 * a0 })
  const Wc = 600
  const Hc = 168
  ALTERNATIVES.forEach((alt, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 960 - Wc - 16 + col * (Wc + 32)
    const y = 350 + row * (Hc + 28)
    const a = cueP(c, i + 1, 0.6) * c.alpha
    if (a <= 0.01) return
    const rise = (1 - cueP(c, i + 1, 0.6)) * 12
    withAlpha(g, a, () => {
      frame(g, x, y + rise, Wc, Hc, ink(0.2))
      hline(g, x, x + Wc * easeOut(since(c, i + 1) / 0.5), y + rise + 0.5, gold(0.9 * (1 - smoothstep(0.6, 1.6, since(c, i + 1)))), 2)
      text(g, `(${alt.key})`, x + 28, y + rise + 62, { size: 34, weight: 600, color: gold(0.95) })
      text(g, alt.title.zh, x + 100, y + rise + 60, { size: 26, zh: true, weight: 600, color: ink(0.95) })
      text(g, alt.title.en, x + 100, y + rise + 92, { size: 18, italic: true, color: ink(0.58) })
      f.draw(g, alt.domain, x + Wc - 28, y + rise + 62, { em: 30, align: 'right' })
      const forceZh = alt.forced ? '光滑外力' : '无外力'
      const forceEn = alt.forced ? 'smooth external force' : 'no external force'
      f.draw(g, alt.forced ? 'q_fs' : 'q_f0', x + 100, y + rise + 138, { em: 24 })
      const fx = x + 100 + f.width(alt.forced ? 'q_fs' : 'q_f0', 24) + 16
      const wz = text(g, forceZh, fx, y + rise + 137, { size: 18, zh: true, weight: 400, color: ink(0.7) })
      text(g, forceEn, fx + wz + 10, y + rise + 137, { size: 16, italic: true, color: ink(0.45) })
    })
  })
}

function history(c: SceneCtx) {
  const { g } = c
  const x0 = 170
  const x1 = 1760
  const y = 560
  const lineP = easeInOut(since(c, 0) / Math.min(2.4, 0.3 * c.dur))
  hline(g, x0, x0 + (x1 - x0) * lineP, y, ink(0.3 * c.alpha))
  const n = HISTORY.length
  HISTORY.forEach((h, i) => {
    const x = 250 + (i * (1420 / (n - 1)))
    const a = cueP(c, i + 1, 0.6) * c.alpha
    if (a <= 0.01) return
    const up = i % 2 === 0
    const last = i === n - 1
    const hl = highlight(c, i + 1, 1.0)
    const dotR = 5 + 3 * hl + 2 * c.fx.strong * a
    g.fillStyle = last || hl > 0.05 ? gold(a) : ink(0.8 * a)
    g.beginPath()
    g.arc(x, y, dotR, 0, Math.PI * 2)
    g.fill()
    const stem = up ? -1 : 1
    g.strokeStyle = ink(0.25 * a)
    g.beginPath()
    g.moveTo(x, y + stem * 10)
    g.lineTo(x, y + stem * 40)
    g.stroke()
    const by = up ? 400 : 650
    const rise = (1 - cueP(c, i + 1, 0.6)) * 10 * stem
    withAlpha(g, a, () => {
      text(g, h.year, x, by + rise, { size: 38, weight: 600, align: 'center', color: last ? gold(0.95) : ink(0.95) })
      text(g, h.who, x, by + 34 + rise, { size: 18, align: 'center', color: ink(0.8) })
      text(g, h.what.zh, x, by + 66 + rise, { size: 19, zh: true, weight: 400, align: 'center', color: ink(0.75) })
      text(g, h.what.en, x, by + 92 + rise, { size: 16, italic: true, align: 'center', color: ink(0.48) })
    })
  })
  // 最后一条出现之后，在时间轴右端引出 2026
  const endA = appear(c.t, Math.max(c.plan.cues[n] + 0.6, c.plan.end - 2.4), 0.8) * c.alpha
  withAlpha(g, endA, () => {
    g.fillStyle = gold(0.9)
    g.beginPath()
    g.moveTo(x1 + 12, y)
    g.lineTo(x1, y - 5)
    g.lineTo(x1, y + 5)
    g.fill()
    text(g, '2026', x1 + 24, y + 11, { size: 30, weight: 600, color: gold(0.95) })
  })
}

function announce(c: SceneCtx) {
  const { g } = c
  const a0 = cueP(c, 0, 0.9) * c.alpha
  withAlpha(g, a0, () => {
    const rise = (1 - cueP(c, 0, 0.9)) * 18
    text(g, '2026 · 09 · 08', 960, 330 + rise, { size: 128, weight: 400, align: 'center', color: ink(0.97), tracking: 6 })
    text(g, ANNOUNCE.date.zh, 960, 398 + rise, { size: 28, zh: true, weight: 400, align: 'center', color: ink(0.75), tracking: 4 })
    text(g, ANNOUNCE.date.en, 960, 434 + rise, { size: 21, italic: true, align: 'center', color: ink(0.5) })
  })
  const a1 = cueP(c, 1, 0.8) * c.alpha
  withAlpha(g, a1, () => {
    text(g, 'OpenAI', 960, 528, { size: 20, weight: 600, align: 'center', color: gold(0.9), tracking: 5, caps: true })
    text(g, `“${ANNOUNCE.paper}”`, 960, 590, { size: 50, italic: true, align: 'center', color: ink(0.95) })
  })
  ANNOUNCE.stats.forEach((s, i) => {
    const a = cueP(c, 2, 0.6 + i * 0.25) * c.alpha
    const x = 960 + (i - 1) * 380
    const hl = i === 2 ? cueP(c, 4, 0.5) : 0
    withAlpha(g, a, () => {
      if (i > 0) {
        g.strokeStyle = ink(0.18)
        g.beginPath()
        g.moveTo(x - 190, 668)
        g.lineTo(x - 190, 768)
        g.stroke()
      }
      text(g, s.big, x, 712, { size: 44, weight: 600, align: 'center', color: hl > 0 ? `rgba(${lerpRgb(hl)},1)` : ink(0.95) })
      text(g, s.zh, x, 748, { size: 19, zh: true, weight: 400, align: 'center', color: ink(0.7) })
      text(g, s.en, x, 774, { size: 16, italic: true, align: 'center', color: ink(0.45) })
    })
  })
}

function lerpRgb(k: number) {
  const a = [236, 232, 223]
  const b = [210, 178, 115]
  return a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')
}

function theorem(c: SceneCtx) {
  const { g, f } = c
  grid(g, c.alpha)
  const a0 = cueP(c, 0, 0.8) * c.alpha
  withAlpha(g, a0, () => {
    const wz = measure(g, '定理 1.1', { size: 32, zh: true, weight: 700 })
    const we = measure(g, 'Theorem 1.1', { size: 26, italic: true })
    const x = 960 - (wz + 22 + we) / 2
    text(g, '定理 1.1', x, 236, { size: 32, zh: true, weight: 700, color: ink(0.97) })
    text(g, 'Theorem 1.1', x + wz + 22, 236, { size: 26, italic: true, color: ink(0.62) })
    hline(g, 960 - 60, 960 + 60, 262, gold(0.7))
  })
  const lines: { id: FormulaId; cue: number; em: number; y: number; dim?: boolean }[] = [
    { id: 'thm_l1', cue: 1, em: 31, y: 358 },
    { id: 'thm_l2', cue: 2, em: 36, y: 452 },
    { id: 'thm_l3', cue: 2, em: 27, y: 526, dim: true },
    { id: 'thm_l4', cue: 3, em: 36, y: 636 },
  ]
  // 当前字幕对应的行用金色，下一句出现时回到白色
  for (const L of lines) {
    const a = cueP(c, L.cue, 0.8) * c.alpha * (L.dim ? 0.7 : 1)
    const hl = appear(c.t, c.plan.cues[L.cue], 0.4) * (1 - cueP(c, L.cue + 1, 0.5))
    const rise = (1 - cueP(c, L.cue, 0.8)) * 12
    f.draw(g, L.id, 960, L.y + rise, { em: L.em, align: 'center', alpha: a * (1 - hl) })
    f.draw(g, L.id, 960, L.y + rise, { em: L.em, align: 'center', color: 'gold', alpha: a * hl })
  }
  const a4 = cueP(c, 4, 0.8) * c.alpha
  withAlpha(g, a4, () => {
    text(g, '论文：由此确立 Fefferman 陈述中的命题 (C)；推论 10.6 给出 (D)', 960, 748, { size: 22, zh: true, weight: 400, align: 'center', color: ink(0.78) })
    text(g, 'Paper: this establishes alternative (C) of Fefferman’s statement; Corollary 10.6 gives (D)', 960, 780, {
      size: 18,
      italic: true,
      align: 'center',
      color: ink(0.5),
    })
  })
  withAlpha(g, a0, () => {
    text(g, 'OpenAI (2026), Finite Time Blowup for Navier–Stokes, Theorem 1.1', 1840, 842, { size: 15, italic: true, align: 'right', color: ink(0.38) })
  })
}

function mechanism(c: SceneCtx) {
  const { g, f } = c
  const va = appear(c.t, c.plan.start, 1.2) * c.alpha
  const G = c.vortex.draw(g, c.lt, va, c.fx.pulse, c.pulses, c.t)
  if (!G) return
  // 尺寸标注
  const la = va * 0.9
  const cosP = Math.cos(G.phi)
  const yb = G.cy + G.lz * cosP + 34
  g.strokeStyle = gold(0.7 * la)
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(G.cx, yb)
  g.lineTo(G.cx + G.lr, yb)
  g.moveTo(G.cx, yb - 6)
  g.lineTo(G.cx, yb + 6)
  g.moveTo(G.cx + G.lr, yb - 6)
  g.lineTo(G.cx + G.lr, yb + 6)
  const xz = G.cx + G.lr + 40
  g.moveTo(xz, G.cy)
  g.lineTo(xz, G.cy - G.lz * cosP)
  g.moveTo(xz - 6, G.cy)
  g.lineTo(xz + 6, G.cy)
  g.moveTo(xz - 6, G.cy - G.lz * cosP)
  g.lineTo(xz + 6, G.cy - G.lz * cosP)
  g.stroke()
  f.draw(g, 'lbl_lr', G.cx + G.lr / 2, yb + 38, { em: 30, align: 'center', color: 'gold', alpha: la })
  f.draw(g, 'lbl_lz', xz + 14, G.cy - (G.lz * cosP) / 2, { em: 30, valign: 'middle', color: 'gold', alpha: la })

  // 右侧：尺度律（论文 §2.1）
  const fa = cueP(c, 2, 0.8) * c.alpha
  const x = 1400
  const rows: [FormulaId, number][] = [
    ['sc_lr', 330],
    ['sc_lz', 410],
    ['sc_u', 490],
  ]
  rows.forEach(([id, y], i) => {
    const a = appear(c.t, c.plan.cues[2] + i * 0.18, 0.7) * c.alpha
    f.draw(g, id, x, y, { em: 38, alpha: a })
  })
  withAlpha(g, fa, () => {
    hline(g, x, x + 380, 540, ink(0.2))
  })
  f.draw(g, 'sc_tau', x, 596, { em: 28, alpha: fa * 0.8 })
  withAlpha(g, fa, () => {
    text(g, '论文 §2.1 · 核心尺度', x, 646, { size: 17, zh: true, weight: 400, color: ink(0.45) })
    text(g, 'Paper §2.1 · core scales', x, 670, { size: 15, italic: true, color: ink(0.35) })
  })
  // τ 指示条：距奇点的剩余时间
  withAlpha(g, va, () => {
    const bx = x
    const by = 740
    const bw = 380
    hline(g, bx, bx + bw, by, ink(0.18), 3)
    hline(g, bx, bx + bw * G.tau, by, gold(0.85), 3)
    text(g, 'τ = 1 − t', bx, by - 14, { size: 18, italic: true, color: ink(0.6) })
  })
  tag(g, SCHEMATIC, 80, 858, va)
}

function blowup(c: SceneCtx) {
  const { g, f, t } = c
  grid(g, c.alpha * 0.8)
  const ox = 330
  const oy = 780
  const x1 = 1380
  const top = 190
  const a0 = cueP(c, 0, 0.8) * c.alpha
  const X = (s: number) => ox + (x1 - ox) * s
  // 示意函数：从静止出发；L∞ 按 τ^{-1/2-h} 发散，L² 始终有界
  const S = (s: number) => smoothstep(0.02, 0.45, s)
  const linf = (s: number) => S(s) * 0.06 * (1 - s) ** -0.62
  const l2 = (s: number) => 0.3 * S(s) * (1 - 0.08 * smoothstep(0.6, 1, s))
  const Y = (v: number) => oy - v * (oy - top)
  withAlpha(g, a0, () => {
    g.strokeStyle = ink(0.55)
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(ox, top - 30)
    g.lineTo(ox, oy)
    g.lineTo(x1 + 110, oy)
    g.stroke()
    g.beginPath()
    g.moveTo(X(1), oy - 6)
    g.lineTo(X(1), oy + 6)
    g.stroke()
    f.draw(g, 'g_0', ox - 12, oy + 34, { em: 26, align: 'center', alpha: 0.8 })
    f.draw(g, 'g_1', X(1), oy + 36, { em: 26, align: 'center', alpha: 0.8 })
    f.draw(g, 'g_t', x1 + 124, oy + 8, { em: 28, alpha: 0.8 })
    // L² 的上界虚线
    g.setLineDash([5, 7])
    hline(g, ox, X(1), Y(0.34), ink(0.28))
    g.setLineDash([])
    f.draw(g, 'g_sup', X(1) + 24, Y(0.34) + 8, { em: 22, alpha: 0.6 })
  })

  // 笔尖从 cue0 走到 cue2（高潮点），越接近 t=1 走得越慢、曲线越陡
  const c0 = c.plan.cues[0]
  const c2 = c.plan.cues[2]
  const u = clamp01((t - c0) / Math.max(0.5, c2 - c0))
  const sEnd = u >= 1 ? 1 : 1 - (1 - u) ** 1.5
  const hlL2 = highlight(c, 0, 1.4)
  const hlInf = highlight(c, 1, 1.4)
  const drawCurve = (fn: (s: number) => number, color: string, width: number) => {
    g.strokeStyle = color
    g.lineWidth = width
    g.beginPath()
    let started = false
    const n = 360
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * Math.min(sEnd, 0.9995)
      const v = fn(s)
      const y = Math.max(top - 30, Y(v))
      if (!started) {
        g.moveTo(X(s), y)
        started = true
      } else g.lineTo(X(s), y)
      if (y <= top - 30) break
    }
    g.stroke()
  }
  withAlpha(g, a0, () => {
    drawCurve(l2, hlL2 > 0.05 ? gold(0.6 + 0.4 * hlL2) : blue(0.9), 2.4)
    drawCurve(linf, hlInf > 0.05 ? gold(0.6 + 0.4 * hlInf) : ink(0.95), 2.6)
    f.draw(g, 'g_l2', X(0.47), Y(l2(0.47)) + 46, { em: 30, color: hlL2 > 0.3 ? 'gold' : 'ink', alpha: appear(t, c0 + 0.6, 0.6) })
    const labelS = 0.8
    if (sEnd > labelS) {
      f.draw(g, 'g_linf', X(labelS) - 40, Y(linf(labelS)) - 10, { em: 30, align: 'right', color: hlInf > 0.3 ? 'gold' : 'ink', alpha: smoothstep(labelS, labelS + 0.05, sEnd) })
    }
  })

  // t = 1：渐近线、闪光与 → ∞
  const s2 = t - c2
  if (s2 >= 0) {
    const a = c.alpha * appear(t, c2, 0.3)
    withAlpha(g, a, () => {
      g.setLineDash([8, 8])
      g.strokeStyle = gold(0.85)
      g.lineWidth = 1.4
      g.beginPath()
      g.moveTo(X(1), oy)
      g.lineTo(X(1), top - 40)
      g.stroke()
      g.setLineDash([])
      f.draw(g, 'g_t1', X(1) + 18, oy - 24, { em: 28, color: 'gold' })
      f.draw(g, 'g_inf', X(1) + 16, top - 16, { em: 32, color: 'gold' })
    })
    const flash = Math.exp(-s2 / 0.35) * c.alpha
    if (flash > 0.01) {
      const grad = g.createRadialGradient(X(1), top, 0, X(1), top, 520)
      grad.addColorStop(0, `rgba(255,246,225,${0.55 * flash})`)
      grad.addColorStop(1, 'rgba(255,246,225,0)')
      g.fillStyle = grad
      g.fillRect(0, 0, 1920, 1080)
      g.strokeStyle = gold(0.8 * flash)
      g.lineWidth = 1.5
      g.beginPath()
      g.arc(X(1), top, 40 + 600 * (1 - Math.exp(-s2 / 0.5)), 0, Math.PI * 2)
      g.stroke()
    }
  }
  tag(g, SCHEMATIC_CURVE, 80, 858, a0)
}

function verify(c: SceneCtx) {
  const { g, t } = c
  grid(g, c.alpha * 0.6)
  const a0 = cueP(c, 0, 0.8) * c.alpha
  const lx = 200
  withAlpha(g, a0, () => {
    text(g, 'Finite Time Blowup for Navier–Stokes', lx, 250, { size: 20, weight: 600, color: ink(0.85), tracking: 3, caps: true })
    text(g, 'OpenAI · 166 pp.', lx, 282, { size: 17, italic: true, color: ink(0.5) })
    hline(g, lx, lx + 760, 304, ink(0.2))
  })
  // 目录逐拍出现（cue1 之后）
  const pages = ['1', '3', '6', '24', '45', '62', '73', '88', '100', '116', '126', '144', '157']
  const start = c.plan.cues[1] ?? c.plan.start
  const end = c.plan.cues[2] ?? c.plan.end
  const bs = c.beats.filter((b) => b >= start && b < end)
  const times = PAPER_TOC.map((_, i) => (bs.length >= PAPER_TOC.length ? bs[Math.floor((i * bs.length) / PAPER_TOC.length)] : start + ((end - start) * i) / PAPER_TOC.length))
  PAPER_TOC.forEach(([num, title], i) => {
    const a = appear(t, times[i], 0.4) * c.alpha
    if (a <= 0.01) return
    const y = 346 + i * 36
    const appendix = /[A-C]/.test(num)
    withAlpha(g, a, () => {
      text(g, appendix ? `Appendix ${num}` : num, lx, y, { size: 18, weight: 600, color: gold(0.85) })
      text(g, title, lx + (appendix ? 116 : 44), y, { size: 18, color: ink(0.78) })
      text(g, pages[i], lx + 760, y, { size: 17, align: 'right', color: ink(0.4) })
    })
  })
  const rx = 1200
  const a2 = cueP(c, 0, 1.2) * c.alpha
  withAlpha(g, a2, () => {
    text(g, 'Lean 4', rx, 440, { size: 96, weight: 600, color: ink(0.96) })
    text(g, '+ Mathlib', rx + 4, 486, { size: 26, italic: true, color: ink(0.6) })
  })
  const a3 = cueP(c, 2, 0.8) * c.alpha
  withAlpha(g, a3, () => {
    hline(g, rx, rx + 520, 540, gold(0.6))
    text(g, 'github.com/openai/NavierStokesAndEuler', rx, 580, { size: 22, color: ink(0.85) })
    text(g, '形式化代码公开 · 可独立复核', rx, 616, { size: 18, zh: true, weight: 400, color: ink(0.6) })
    text(g, 'Public formalization · independently re-checkable', rx, 642, { size: 16, italic: true, color: ink(0.42) })
  })
}

function status(c: SceneCtx) {
  const { g } = c
  const a0 = cueP(c, 0, 0.8) * c.alpha
  withAlpha(g, a0, () => {
    text(g, STATUS_HEAD.zh, 960, 250, { size: 36, zh: true, weight: 700, align: 'center', color: ink(0.96), tracking: 2 })
    text(g, STATUS_HEAD.en, 960, 290, { size: 22, italic: true, align: 'center', color: ink(0.55) })
    hline(g, 900, 1020, 318, gold(0.7))
  })
  STATUS.forEach((s, i) => {
    const a = cueP(c, i + 1, 0.6) * c.alpha
    if (a <= 0.01) return
    const y = 400 + i * 108
    const x = 380
    const rise = (1 - cueP(c, i + 1, 0.6)) * 10
    const hl = highlight(c, i + 1, 1.2)
    withAlpha(g, a, () => {
      g.strokeStyle = gold(0.5 + 0.5 * hl)
      g.lineWidth = 1.2
      g.beginPath()
      g.arc(x, y - 10 + rise, 20, 0, Math.PI * 2)
      g.stroke()
      text(g, String(i + 1), x, y + rise - 2, { size: 22, weight: 600, align: 'center', color: gold(0.95) })
      richText(g, s.zh, x + 52, y + rise - 4, { size: 30, zh: true, weight: 600, color: ink(0.95) })
      richText(g, s.en, x + 52, y + rise + 30, { size: 20, italic: true, color: ink(0.55) })
    })
  })
}

function credits(c: SceneCtx) {
  const { g, t } = c
  CREDITS.forEach((col, ci) => {
    const x = ci === 0 ? 600 : 1320
    col.forEach((name, i) => {
      const a = appear(t, (c.plan.cues[ci + 1] ?? c.plan.end) + i * 0.14, 0.6) * c.alpha
      text(g, name, x, 250 + i * 50, { size: 27, align: 'center', color: ink(0.9 * a) })
    })
  })
  const am = appear(t, (c.plan.cues[2] ?? c.plan.end) + 1.1, 0.8) * c.alpha
  withAlpha(g, am, () => {
    text(g, `${CREDITS_MORE.zh}  ·  ${CREDITS_MORE.en}`, 960, 582, { size: 18, zh: true, weight: 400, align: 'center', color: ink(0.5) })
  })
  const a3 = cueP(c, 3, 0.8) * c.alpha
  withAlpha(g, a3, () => {
    hline(g, 900, 1020, 630, gold(0.6))
    text(g, '相关独立工作 · Related independent work', 960, 672, { size: 18, zh: true, weight: 400, align: 'center', color: gold(0.85) })
    text(g, 'L. Alpöge · T. Buckmaster', 960, 716, { size: 30, align: 'center', color: ink(0.95) })
  })
}

function end(c: SceneCtx) {
  const { g, f } = c
  const a0 = cueP(c, 0, 1.2) * c.alpha
  withAlpha(g, a0, () => {
    text(g, TITLE.zh, 960, 360, { size: 60, zh: true, weight: 700, align: 'center', color: ink(0.97), tracking: 3 })
    text(g, TITLE.en, 960, 420, { size: 32, align: 'center', color: ink(0.78) })
  })
  f.draw(g, 'ns_compact', 960, 502, { em: 32, align: 'center', alpha: 0.72 * a0 })
  const a1 = cueP(c, 1, 1) * c.alpha
  withAlpha(g, a1, () => {
    hline(g, 900, 1020, 560, gold(0.6))
    END_REFS.forEach((r, i) => text(g, r, 960, 608 + i * 32, { size: 18, align: 'center', color: ink(0.55) }))
    text(g, MUSIC_CREDIT, 960, 740, { size: 21, zh: true, weight: 400, align: 'center', color: ink(0.72) })
    text(g, END_NOTE.zh, 960, 800, { size: 16, zh: true, weight: 400, align: 'center', color: ink(0.42) })
    text(g, END_NOTE.en, 960, 826, { size: 14, italic: true, align: 'center', color: ink(0.36) })
  })
}

export const SCENE_DRAW: Record<SceneId, (c: SceneCtx) => void> = {
  open,
  title,
  equations,
  millennium,
  question,
  history,
  announce,
  theorem,
  mechanism,
  blowup,
  verify,
  status,
  credits,
  end,
}
