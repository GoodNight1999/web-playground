// 前奏（0:00–0:53）：14 小节里的 15 组问答，一问一答都落在前奏的重音上。
// 上方小图随答案出现，下方一行几何音符逐拍记下这一小节的节奏（致敬原版 MV）。

import { CHECKED_NOTE, CHECKED_ZEROS, QAS, type QAVisual } from '../../content'
import { ZETA_ZEROS } from '../../data/zeros.gen'
import { isPrime } from '../../math/zeta'
import { SONG } from '../../timeline'
import { clamp01, easeOut, glow, hash2, smoothstep, text, trunc, white, type TextOpts } from '../draw'
import { kindOf, recentNotes, shape, type Ctx } from '../ctx'

const GLYPHS = 'ζΣ∞∂∫√πρσγ≈≠01½'

/** 逐字“解码”出现：每个字在自己的时刻之前显示随机符号 */
function scramble(s: string, since: number, seed: number, per = 0.028): string {
  if (since < 0) return ''
  const chars = Array.from(s)
  let out = ''
  for (let i = 0; i < chars.length; i++) {
    const at = i * per
    if (since >= at + 0.09) out += chars[i]
    else if (since >= at) out += chars[i] === ' ' ? ' ' : GLYPHS[Math.floor(hash2(seed * 131 + i, Math.floor(since * 40)) * GLYPHS.length)]
  }
  return out
}

export function drawIntro(c: Ctx) {
  const { g, t, tl } = c
  let k = -1
  for (let i = 0; i < tl.qa.length; i++) if (tl.qa[i].qT <= t + 1e-6) k = i
  drawRings(c)
  drawTrack(c)
  drawRoute(c, k)
  if (k < 0) return
  const cue = tl.qa[k]
  const qa = QAS[k]
  // 下一个问题到来前 0.07 秒硬切
  const out = 1 - smoothstep(cue.end - 0.07, cue.end, t)
  const alpha = out * c.alpha
  if (alpha <= 0.01) return
  g.save()
  g.globalAlpha = alpha

  drawVisual(c, qa.visual, cue.qT, cue.aT)
  if (LINE_VISUALS.has(qa.visual)) {
    const spot = g.createRadialGradient(960, 600, 40, 960, 600, 420)
    spot.addColorStop(0, 'rgba(0,0,0,0.92)')
    spot.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = spot
    g.fillRect(500, 380, 920, 440)
  }

  // 问
  const qs = t - cue.qT
  const qo: TextOpts = { size: 44, zh: true, weight: 300, align: 'center', color: white(0.82) }
  text(g, scramble(qa.q.zh, qs, k), 960, 520, qo)
  text(g, scramble(qa.q.en, qs - 0.05, k + 50, 0.012), 960, 562, { size: 22, italic: true, weight: 300, align: 'center', color: white(0.45) })

  // 答：落在重音上，出现瞬间有一下高亮
  const as = t - cue.aT
  if (as >= 0) {
    const hit = Math.exp(-as / 0.12)
    const pop = 1 + 0.06 * hit
    g.save()
    g.translate(960, 680)
    g.scale(pop, pop)
    if (qa.visual === 'rho1' || qa.visual === 'rho2' || qa.visual === 'rho3') {
      c.f.draw(g, qa.visual, 0, 0, { em: 64, align: 'center', valign: 'middle' })
    } else if (qa.visual === 'count') {
      drawCounter(g, as)
    } else {
      g.shadowColor = 'rgba(255,255,255,0.55)'
      g.shadowBlur = 10 + 30 * hit
      text(g, qa.a.zh, 0, 16, { size: 64, zh: true, weight: 500, align: 'center', color: white(0.97) })
      g.shadowBlur = 0
      text(g, qa.a.en, 0, 66, { size: 26, italic: true, weight: 300, align: 'center', color: white(0.6) })
    }
    g.restore()
    if (hit > 0.02) glow(g, 960, 670, 420, 0.22 * hit)
  }
  g.restore()
}

/** 验证过的零点个数：数字飞快滚动后停在准确值上 */
function drawCounter(g: CanvasRenderingContext2D, since: number) {
  const target = CHECKED_ZEROS
  const settle = clamp01(since / 0.55)
  let s = ''
  for (let i = 0; i < target.length; i++) {
    const ch = target[i]
    if (ch === ' ' || settle >= 1 || i < Math.floor(settle * target.length)) s += ch
    else s += String(Math.floor(hash2(i, Math.floor(since * 50)) * 10))
  }
  text(g, s, 0, 18, { size: 60, mono: true, weight: 300, align: 'center', color: white(0.97) })
  text(g, CHECKED_NOTE, 0, 64, { size: 20, mono: true, weight: 300, align: 'center', color: white(0.45) })
}

/** 前奏的节奏轨：当前小节里每个起音记成一个几何音符 */
function drawTrack(c: Ctx) {
  const { g, t } = c
  const barIdx = Math.floor((t - SONG.bar0) / SONG.bar)
  if (t < SONG.bar0 - 0.05) return
  const barStart = SONG.bar0 + barIdx * SONG.bar
  const y = 900
  const x0 = 260
  const x1 = 1660
  g.fillStyle = white(0.12)
  g.fillRect(x0, y + 26, x1 - x0, 1)
  // 小节内的拍点刻度
  for (let b = 0; b <= 4; b++) g.fillRect(x0 + ((x1 - x0) * b) / 4, y + 20, 1, 12)
  for (const n of recentNotes(c.notes, t, t - barStart + 0.001)) {
    if (n.t < barStart) continue
    const u = (n.t - barStart) / SONG.bar
    const x = x0 + (x1 - x0) * u
    const age = t - n.t
    const pop = 1 + 0.8 * Math.exp(-age / 0.08)
    const size = (n.kind === 'low' ? 11 : n.kind === 'high' ? 9 : 10) * (0.6 + 0.5 * n.s) * pop
    const a = 0.35 + 0.6 * Math.exp(-age / 0.35)
    const yy = n.kind === 'low' ? y + 4 : n.kind === 'high' ? y - 34 : y - 14
    shape(g, kindOf(n, n.i), x, yy, size, white(a * c.alpha))
    if (age < 0.15) glow(g, x, yy, 60, 0.35 * (1 - age / 0.15) * c.alpha)
  }
}

// ---- 答案配图（画面上方） ----

const LINE_Y = 290

function drawVisual(c: Ctx, v: QAVisual, qT: number, aT: number) {
  const { g, t, f } = c
  const as = t - aT
  const shown = as >= 0 ? easeOut(as / 0.3) : 0
  switch (v) {
    case 'primes':
    case 'density':
      drawPrimeLine(c, v === 'density')
      return
    case 'zeta':
      f.draw(g, 'zeta_def', 960, 250, { em: 64, align: 'center', valign: 'middle', alpha: shown })
      return
    case 'trivial':
    case 'strip':
      drawPlane(c, v === 'strip', shown)
      return
    case 'rho1':
    case 'rho2':
    case 'rho3':
    case 'far':
    case 'count':
    case 'none':
    case 'line':
      drawCriticalLine(c, v, shown, qT)
      return
    case 'year': {
      const x0 = 560
      const x1 = 1360
      g.fillStyle = white(0.35)
      g.fillRect(x0, LINE_Y, (x1 - x0) * shown, 1)
      text(g, '1859', x0, LINE_Y - 22, { size: 26, mono: true, weight: 300, align: 'center', color: white(0.8) })
      if (shown > 0.9) text(g, '2026', x1, LINE_Y - 22, { size: 26, mono: true, weight: 300, align: 'center', color: white(0.8) })
      glow(g, x0 + (x1 - x0) * shown, LINE_Y, 60, 0.6 * shown)
      return
    }
    case 'name':
      drawCriticalLine(c, 'line', 1, qT)
      return
  }
}

/** 素数数轴：前两小节在前奏的弱拍上逐个点亮 2, 3, 5, 7 …；随后拉远到 1000 */
function drawPrimeLine(c: Ctx, dense: boolean) {
  const { g, t } = c
  const x0 = 260
  const x1 = 1660
  g.fillStyle = white(0.2)
  g.fillRect(x0, LINE_Y, x1 - x0, 1)
  if (!dense) {
    const primes: number[] = []
    for (let n = 2; n <= 60; n++) if (isPrime(n)) primes.push(n)
    const pulses = c.a.onsets.filter((o) => o.t >= SONG.bar0 - 0.05 && o.t <= t && o.s >= 0.55)
    const shownN = Math.min(primes.length, pulses.length)
    for (let i = 0; i < shownN; i++) {
      const p = primes[i]
      const x = x0 + ((x1 - x0) * p) / 60
      const age = t - pulses[i].t
      const hit = Math.exp(-age / 0.15)
      g.fillStyle = white(0.9)
      g.beginPath()
      g.arc(x, LINE_Y, 5 + 4 * hit, 0, Math.PI * 2)
      g.fill()
      glow(g, x, LINE_Y, 70, 0.5 * hit)
      text(g, String(p), x, LINE_Y + 40, { size: 20, mono: true, weight: 300, align: 'center', color: white(0.7) })
    }
    return
  }
  // 1…1000 的全部素数，随扫描逐个出现：越往右越稀
  const sweep = clamp01((t - (SONG.bar0 + 2 * SONG.bar)) / (2 * SONG.bar - 0.4))
  const upto = 1000 * sweep
  g.fillStyle = white(0.75)
  for (let n = 2; n <= upto; n++) {
    if (!isPrime(n)) continue
    const x = x0 + ((x1 - x0) * n) / 1000
    g.fillRect(x - 0.5, LINE_Y - 14, 1.2, 28)
  }
  glow(g, x0 + (x1 - x0) * sweep, LINE_Y, 80, 0.5)
  text(g, '1', x0, LINE_Y + 44, { size: 18, mono: true, weight: 300, align: 'center', color: white(0.5) })
  text(g, '1000', x1, LINE_Y + 44, { size: 18, mono: true, weight: 300, align: 'center', color: white(0.5) })
}

/** 复平面：实轴上的平凡零点，或临界带 */
function drawPlane(c: Ctx, strip: boolean, shown: number) {
  const { g, t, f } = c
  const X = (s: number) => 960 + (s + 2.5) * 105
  g.fillStyle = white(0.3)
  g.fillRect(X(-8.5), LINE_Y, X(3.5) - X(-8.5), 1)
  g.fillRect(X(0), LINE_Y - 110, 1, 220)
  f.draw(g, 'zero', X(0) + 8, LINE_Y + 30, { em: 20, alpha: 0.6 })
  f.draw(g, 'one', X(1) - 5, LINE_Y + 30, { em: 20, alpha: 0.6 })
  g.fillRect(X(1), LINE_Y - 5, 1, 10)
  // 平凡零点：−2, −4, −6, −8
  for (let i = 1; i <= 4; i++) {
    const x = X(-2 * i)
    const a = strip ? 0.5 : clamp01(shown * 4 - (i - 1) * 0.6)
    if (a <= 0) continue
    g.fillStyle = white(0.9 * a)
    g.beginPath()
    g.arc(x, LINE_Y, 6, 0, Math.PI * 2)
    g.fill()
    if (!strip) glow(g, x, LINE_Y, 60, 0.4 * a * Math.exp(-(t - c.tl.qa[3].aT) / 0.4))
    text(g, `−${2 * i}`, x, LINE_Y + 34, { size: 18, mono: true, weight: 300, align: 'center', color: white(0.6 * a) })
  }
  if (!strip) {
    if (shown > 0) f.draw(g, 'trivial', X(-5), LINE_Y - 60, { em: 30, align: 'center', alpha: shown * 0.8 })
    return
  }
  // 临界带 0 < Re s < 1：MV 式的斜线阴影
  const h = 110 * shown
  g.save()
  g.beginPath()
  g.rect(X(0), LINE_Y - h, X(1) - X(0), h * 2)
  g.clip()
  g.strokeStyle = white(0.55)
  g.lineWidth = 1
  for (let y = LINE_Y - 130; y < LINE_Y + 130; y += 9) {
    g.beginPath()
    g.moveTo(X(0), y)
    g.lineTo(X(1), y + 30)
    g.stroke()
  }
  g.restore()
  f.draw(g, 'strip', X(0.5), LINE_Y - 140, { em: 28, align: 'center', alpha: shown })
}

const LINE_VISUALS = new Set<QAVisual>(['rho1', 'rho2', 'rho3', 'far', 'count', 'none', 'line', 'name'])

/** 竖直的临界带与零点（铺满画面高度）：前三个零点逐个出现，随后拉远到前 500 个 */
function drawCriticalLine(c: Ctx, v: QAVisual, shown: number, qT: number) {
  const { g, t } = c
  const cx = 960
  // 实轴放在画面中上部，零点（上半平面）排在问答文字的上方
  const yBase = 520
  const far = v === 'far' || v === 'count' || v === 'none' || v === 'line'
  const zoomT = far ? easeOut((t - qT) / 0.5) : 0
  const scale = far ? 15 + (0.47 - 15) * (v === 'far' ? zoomT : 1) : 15
  const bright = v === 'line' ? 1 : 0
  const line = g.createLinearGradient(0, 0, 0, 1080)
  line.addColorStop(0, white(0.3 + 0.6 * bright))
  line.addColorStop(yBase / 1080, white(0.3 + 0.6 * bright))
  line.addColorStop(1, white(0))
  g.fillStyle = line
  g.fillRect(cx - (bright ? 1 : 0.5), 0, bright ? 2 : 1, 1080)
  g.fillStyle = white(0.12)
  g.fillRect(cx - 45, 0, 1, yBase)
  g.fillRect(cx + 45, 0, 1, yBase)
  if (bright) glow(g, cx, 330, 520, 0.2)
  const count = v === 'rho1' ? 1 : v === 'rho2' ? 2 : v === 'rho3' ? 3 : 500
  for (let k = 0; k < count; k++) {
    const y = yBase - ZETA_ZEROS[k] * scale
    if (y < 130) break
    const isNew = !far && k === count - 1
    const a = isNew ? shown : 1
    if (a <= 0) continue
    g.fillStyle = white(0.95 * a)
    g.beginPath()
    g.arc(cx, y, far ? 1.4 : 6, 0, Math.PI * 2)
    g.fill()
    if (isNew) {
      glow(g, cx, y, 120, 0.7 * a)
      text(g, `${trunc(ZETA_ZEROS[k], 6)}…`, cx + 70, y + 6, { size: 18, mono: true, weight: 300, color: white(0.7 * a) })
    }
  }
}

/** 顶部的“线路图”：每个问题是一站，答出来就点亮，像车厢门上方的站点指示 */
const STATIONS = ['素数', '疏密', 'ζ', '平凡零点', '临界带', 'ρ₁', 'ρ₂', 'ρ₃', '百万', '验证', '例外', '全部', '证明', '1859', '黎曼猜想']

function drawRoute(c: Ctx, k: number) {
  const { g, t, tl } = c
  const x0 = 180
  const x1 = 1740
  const y = 78
  const n = STATIONS.length
  const X = (i: number) => x0 + ((x1 - x0) * i) / (n - 1)
  const a0 = smoothstep(0.2, 1.2, t) * c.alpha
  // 已答出的站数
  let done = 0
  for (let i = 0; i < tl.qa.length; i++) if (t >= tl.qa[i].aT) done = i + 1
  g.fillStyle = white(0.18 * a0)
  g.fillRect(x0, y, x1 - x0, 1)
  if (done > 0) {
    g.fillStyle = white(0.8 * a0)
    g.fillRect(x0, y - 1, X(done - 1) - x0, 3)
  }
  for (let i = 0; i < n; i++) {
    const x = X(i)
    const answered = i < done
    const current = i === k
    const hit = answered ? Math.exp(-(t - tl.qa[i].aT) / 0.2) : 0
    g.fillStyle = BLACK_FILL
    g.beginPath()
    g.arc(x, y, 7, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = white((answered || current ? 0.9 : 0.3) * a0)
    g.lineWidth = 1.5
    g.stroke()
    if (answered) {
      g.fillStyle = white(0.95 * a0)
      g.beginPath()
      g.arc(x, y, 4 + 2 * hit, 0, Math.PI * 2)
      g.fill()
      if (hit > 0.02) glow(g, x, y, 70, 0.8 * hit * a0)
    }
    if (current) {
      g.strokeStyle = white((0.5 + 0.5 * Math.sin(t * 12)) * a0)
      g.beginPath()
      g.arc(x, y, 12, 0, Math.PI * 2)
      g.stroke()
    }
    text(g, STATIONS[i], x, y + 32, { size: 15, zh: true, weight: 300, align: 'center', color: white((current ? 0.9 : answered ? 0.55 : 0.25) * a0) })
  }
}
const BLACK_FILL = '#000'

/** 背景的同心刻度环（致敬 MV 的同心圆）：随小节加速转动，每个音点亮一格刻度 */
function drawRings(c: Ctx) {
  const { g, t } = c
  const a0 = smoothstep(SONG.bar0 + 4 * SONG.bar - 0.5, SONG.bar0 + 4 * SONG.bar + 1.5, t) * c.alpha
  if (a0 <= 0.01) return
  const radii = [300, 430, 580]
  const u = t - (SONG.bar0 + 4 * SONG.bar)
  // 角速度随时间线性增加：越接近主歌转得越快
  const rot = 0.03 * u + 0.0045 * u * u
  radii.forEach((r, ri) => {
    const dir = ri % 2 === 0 ? 1 : -1
    g.strokeStyle = white(0.07 * a0)
    g.lineWidth = 1
    g.beginPath()
    g.arc(960, 540, r, 0, Math.PI * 2)
    g.stroke()
    const ticks = 60
    g.fillStyle = white(0.1 * a0)
    for (let i = 0; i < ticks; i++) {
      const ang = dir * rot + (i * 2 * Math.PI) / ticks
      g.save()
      g.translate(960 + Math.cos(ang) * r, 540 + Math.sin(ang) * r)
      g.rotate(ang)
      g.fillRect(-6, -0.5, i % 5 === 0 ? 14 : 8, 1)
      g.restore()
    }
  })
  for (const n of recentNotes(c.notes, t, 0.5)) {
    const ri = n.kind === 'low' ? 0 : n.kind === 'mid' ? 1 : 2
    const dir = ri % 2 === 0 ? 1 : -1
    const ang = dir * rot + Math.floor(hash2(n.i, 9) * 60) * ((2 * Math.PI) / 60)
    const r = radii[ri]
    const a = (1 - (t - n.t) / 0.5) * 0.55 * a0
    g.save()
    g.translate(960 + Math.cos(ang) * r, 540 + Math.sin(ang) * r)
    g.rotate(ang)
    g.fillStyle = white(a)
    g.fillRect(-10, -1.5, 24, 3)
    g.restore()
  }
}
