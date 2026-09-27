// 前奏（0:00–0:53）：14 小节里的 15 组问答，一问一答都落在前奏的重音上。
// 上方小图随答案出现，下方一行几何音符逐拍记下这一小节的节奏（致敬原版 MV）。

import { QAS, type QAVisual } from '../../content'
import { SONG } from '../../timeline'
import { easeOut, glow, hash2, richText, smoothstep, text, white, type TextOpts } from '../draw'
import { kindOf, recentNotes, shape, type Ctx } from '../ctx'
import { diamond, molGeom } from './common'
import { levelTiles } from './fluid'

const GLYPHS = 'εωαδτρθ∂∫∇Σ⊗≈→01'

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

  drawVisual(c, qa.visual, cue.aT)

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
    // 长答案缩小字号，保证一行放得下
    const zo: TextOpts = { size: 64, zh: true, weight: 500, align: 'center', color: white(0.97) }
    const len = Array.from(qa.a.zh).length
    if (len > 14) zo.size = Math.round(64 * Math.max(0.72, 14 / len))
    g.shadowColor = 'rgba(255,255,255,0.55)'
    g.shadowBlur = 10 + 30 * hit
    richText(g, qa.a.zh, 0, 16, zo)
    g.shadowBlur = 0
    richText(g, qa.a.en, 0, 66, { size: 26, italic: true, weight: 300, align: 'center', color: white(0.6) })
    g.restore()
    if (hit > 0.02) glow(g, 960, 670, 420, 0.22 * hit)
  }
  g.restore()
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
const X0 = 260
const X1 = 1660

function drawVisual(c: Ctx, v: QAVisual, aT: number) {
  const { g, t, f } = c
  const as = t - aT
  const shown = as >= 0 ? easeOut(as / 0.3) : 0
  switch (v) {
    case 'hilbert':
      drawContinuum(c, shown)
      return
    case 'route':
      drawRoute3(c, shown)
      return
    case 'spheres':
      drawCollision(c, shown)
      return
    case 'scaling':
      f.draw(g, 'scaling', 960, 260, { em: 64, align: 'center', valign: 'middle', alpha: shown })
      return
    case 'boltzmann':
      f.draw(g, 'boltzmann', 960, 260, { em: 44, align: 'center', valign: 'middle', alpha: shown })
      return
    case 'chaos':
      f.draw(g, 'chaos', 960, 260, { em: 58, align: 'center', valign: 'middle', alpha: shown })
      return
    case 'series':
      f.draw(g, 'series', 960, 260, { em: 64, align: 'center', valign: 'middle', alpha: shown })
      return
    case 'theorem':
      f.draw(g, 'chaos_s', 960, 260, { em: 64, align: 'center', valign: 'middle', alpha: shown })
      return
    case 'lanford':
    case 'perturbative':
    case 'longtime':
    case 'lifespan':
      drawTimeAxis(c, v, shown)
      return
    case 'recollision':
      drawCycle(c, shown)
      return
    case 'fluid': {
      const tiles = levelTiles(c.v.flow)
      const S = 250
      g.save()
      // 只取一半等值线，避免缩小后太密
      for (let i = -1; i <= 1; i++)
        tiles.forEach((tile, l) => {
          if (l % 2) return
          g.globalAlpha = (c.v.flow.contours[l].level < 0 ? 0.35 : 0.7) * shown
          g.drawImage(tile, 960 + i * S - S / 2, LINE_Y - 20 - S / 2, S, S)
        })
      g.restore()
      return
    }
    case 'molecule': {
      const geo = molGeom(c.v.mol, c.v.layout, { x: 800, y: 150, w: 320, h: 250 })
      g.strokeStyle = white(0.7 * shown)
      g.lineWidth = 1.2
      for (const pts of geo.line.values()) {
        g.beginPath()
        pts.forEach((p, k) => (k === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)))
        g.stroke()
      }
      for (const p of geo.atom) diamond(g, p.x, p.y, 5, white(0.95 * shown))
      if (as >= 0) glow(g, 960, 275, 300, 0.3 * Math.exp(-as / 0.3))
      return
    }
  }
}

/** 左边是离散的粒子，右边是连续介质的流线 */
function drawContinuum(c: Ctx, shown: number) {
  const { g, t } = c
  for (let i = 0; i < 260; i++) {
    const u = hash2(i, 1)
    const x = X0 + u * (X1 - X0) * 0.55
    const y = LINE_Y - 110 + hash2(i, 2) * 220 + Math.sin(t * 1.3 + i) * 3
    const a = 0.75 * (1 - smoothstep(0.35, 0.55, u))
    g.fillStyle = white(a)
    g.fillRect(x + Math.cos(t * 0.9 + i * 1.7) * 4, y, 2.5, 2.5)
  }
  g.strokeStyle = white(0.7 * shown)
  g.lineWidth = 1.2
  for (let k = 0; k < 9; k++) {
    const y0 = LINE_Y - 100 + k * 25
    g.beginPath()
    for (let x = X0 + (X1 - X0) * 0.45; x <= X1; x += 6) {
      const u = (x - X0) / (X1 - X0)
      const y = y0 + 10 * Math.sin(x / 90 + k * 0.6 + t * 0.8) * smoothstep(0.45, 0.7, u)
      if (x === X0 + (X1 - X0) * 0.45) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }
}

/** 三站：牛顿 — 玻尔兹曼 — 流体；答案出现时点亮中间一站 */
function drawRoute3(c: Ctx, shown: number) {
  const { g } = c
  const xs = [560, 960, 1360]
  const names = ['牛顿', '玻尔兹曼', '流体']
  g.fillStyle = white(0.35)
  g.fillRect(xs[0], LINE_Y, xs[2] - xs[0], 1.5)
  xs.forEach((x, i) => {
    const lit = i === 1 ? shown : 0
    g.fillStyle = '#000'
    g.beginPath()
    g.arc(x, LINE_Y, 12, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = white(0.5 + 0.5 * lit)
    g.lineWidth = 1.8
    g.stroke()
    if (lit > 0) {
      g.fillStyle = white(lit)
      g.beginPath()
      g.arc(x, LINE_Y, 6, 0, Math.PI * 2)
      g.fill()
      glow(g, x, LINE_Y, 140, 0.5 * lit)
    }
    text(g, names[i], x, LINE_Y + 50, { size: 22, zh: true, weight: 300, align: 'center', color: white(0.5 + 0.4 * lit) })
  })
}

/** 两个硬球的一次碰撞：出射速度按碰撞律 v' = v − ((v − v₁)·ω)ω 真实算出。
 *  数学坐标（y 向上）里计算，画的时候再翻转；入射速度是指向球心的虚线，出射速度是实线 */
function drawCollision(c: Ctx, shown: number) {
  const { g } = c
  const R = 56
  const L = 120
  const O = { x: 960, y: LINE_Y - 10 }
  const th = (200 * Math.PI) / 180
  const w = { x: Math.cos(th), y: Math.sin(th) }
  // A 的球心 = O + Rω，B 的球心 = O − Rω，于是 ω = (x_A − x_B)/ε（ε = 2R）
  const A = { x: R * w.x, y: R * w.y }
  const B = { x: -R * w.x, y: -R * w.y }
  const vA = { x: 0.9, y: 0.25 }
  const vB = { x: -0.8, y: -0.1 }
  const d = (vA.x - vB.x) * w.x + (vA.y - vB.y) * w.y // < 0：正在靠近
  const vA2 = { x: vA.x - d * w.x, y: vA.y - d * w.y }
  const vB2 = { x: vB.x + d * w.x, y: vB.y + d * w.y }
  const S = (p: { x: number; y: number }) => ({ x: O.x + p.x, y: O.y - p.y })
  g.strokeStyle = white(0.85)
  g.lineWidth = 1.5
  for (const P of [A, B]) {
    const q = S(P)
    g.beginPath()
    g.arc(q.x, q.y, R, 0, Math.PI * 2)
    g.stroke()
  }
  const arrow = (from: { x: number; y: number }, to: { x: number; y: number }, a: number, dash: boolean) => {
    const p = S(from)
    const q = S(to)
    g.strokeStyle = white(a)
    g.fillStyle = white(a)
    g.lineWidth = 1.6
    g.setLineDash(dash ? [5, 5] : [])
    g.beginPath()
    g.moveTo(p.x, p.y)
    g.lineTo(q.x, q.y)
    g.stroke()
    g.setLineDash([])
    const ang = Math.atan2(q.y - p.y, q.x - p.x)
    g.beginPath()
    g.moveTo(q.x, q.y)
    g.lineTo(q.x - 11 * Math.cos(ang - 0.35), q.y - 11 * Math.sin(ang - 0.35))
    g.lineTo(q.x - 11 * Math.cos(ang + 0.35), q.y - 11 * Math.sin(ang + 0.35))
    g.closePath()
    g.fill()
  }
  const inA = 0.25 + 0.45 * (1 - shown)
  arrow({ x: A.x - vA.x * L, y: A.y - vA.y * L }, A, inA, true)
  arrow({ x: B.x - vB.x * L, y: B.y - vB.y * L }, B, inA, true)
  if (shown > 0.01) {
    arrow(A, { x: A.x + vA2.x * L, y: A.y + vA2.y * L }, 0.95 * shown, false)
    arrow(B, { x: B.x + vB2.x * L, y: B.y + vB2.y * L }, 0.95 * shown, false)
  }
  // ω：接触点处、沿球心连线的单位向量
  const o = S({ x: 0, y: 0 })
  g.fillStyle = white(0.95)
  g.beginPath()
  g.arc(o.x, o.y, 3.5, 0, Math.PI * 2)
  g.fill()
  arrow({ x: 0, y: 0 }, { x: w.x * 44, y: w.y * 44 }, 0.9, false)
  const lab = S({ x: w.x * 44, y: w.y * 44 - 26 })
  text(g, 'ω', lab.x - 6, lab.y, { size: 24, italic: true, weight: 400, color: white(0.9) })
}

/** 时间轴：Lanford 的短时间区间；长时间结果覆盖整个存在区间 */
function drawTimeAxis(c: Ctx, v: QAVisual, shown: number) {
  const { g } = c
  g.fillStyle = white(0.3)
  g.fillRect(X0, LINE_Y, X1 - X0, 1)
  text(g, '0', X0, LINE_Y + 36, { size: 20, mono: true, weight: 300, align: 'center', color: white(0.6) })
  const short = X0 + 190
  const full = v === 'longtime' || v === 'lifespan'
  const end = full ? short + (X1 - short) * (v === 'longtime' ? shown : 1) : short
  const a = v === 'lanford' ? shown : 1
  g.fillStyle = white(0.9 * a * (v === 'perturbative' ? 0.5 : 1))
  g.fillRect(X0, LINE_Y - 2, end - X0, 4)
  glow(g, end, LINE_Y, 90, 0.6 * a)
  text(g, 'Lanford 1975', X0 + 95, LINE_Y - 22, { size: 18, mono: true, weight: 300, align: 'center', color: white(0.7 * a) })
  if (full) {
    text(g, 't_fin', X1, LINE_Y + 36, { size: 20, italic: true, weight: 300, align: 'center', color: white(0.7 * (v === 'lifespan' ? 1 : shown)) })
    if (v === 'lifespan') text(g, '玻尔兹曼解的存在区间', (X0 + X1) / 2, LINE_Y - 22, { size: 18, zh: true, weight: 300, align: 'center', color: white(0.7 * shown) })
  }
}

/** 时空里的一个回路：a 与 b 碰撞，a 再与 c 碰撞，c 又与 b 碰撞——重碰撞把树连成圈 */
function drawCycle(c: Ctx, shown: number) {
  const { g } = c
  const n1 = { x: 900, y: LINE_Y + 100 }
  const n2 = { x: 800, y: LINE_Y }
  const n3 = { x: 1010, y: LINE_Y - 90 }
  const lines: [number, number, number, number][] = [
    [860, LINE_Y + 170, n1.x, n1.y],
    [950, LINE_Y + 170, n1.x, n1.y],
    [n1.x, n1.y, n2.x, n2.y],
    [n1.x, n1.y, n3.x, n3.y],
    [700, LINE_Y + 170, n2.x, n2.y],
    [n2.x, n2.y, n3.x, n3.y],
    [n2.x, n2.y, 760, LINE_Y - 170],
    [n3.x, n3.y, 980, LINE_Y - 170],
    [n3.x, n3.y, 1060, LINE_Y - 170],
  ]
  lines.forEach(([x0, y0, x1, y1], k) => {
    const inCycle = k === 2 || k === 3 || k === 5
    g.strokeStyle = white(inCycle ? 0.45 + 0.5 * shown : 0.35)
    g.lineWidth = inCycle ? 1.5 + 1.2 * shown : 1.2
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.stroke()
  })
  for (const p of [n1, n2, n3]) diamond(g, p.x, p.y, 8, white(0.95))
  if (shown > 0) glow(g, (n1.x + n2.x + n3.x) / 3, (n1.y + n2.y + n3.y) / 3, 220, 0.35 * shown)
}

/** 顶部的“线路图”：每个问题是一站，答出来就点亮，像车厢门上方的站点指示 */
const STATIONS = QAS.map((q) => q.station)

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
