// 副歌二后半（3:17–3:47）：流体。NSF 在 T² 上的一个精确解（|k|² = 25 的本征模叠加，见 math/flow.ts），
// 平铺在整个画面上以显出周期性；流线（ψ 的等值线）在强拍上逐条出现，示踪粒子沿流线运动。
// 最后点亮整条链：牛顿（硬球）→ 玻尔兹曼 → 流体，两个极限分别是 Boltzmann–Grad 极限与 α → ∞。

import { FLUID } from '../../content'
import type { Flow } from '../../math/flow'
import { easeOut, glow, smoothstep, text, white } from '../draw'
import type { Ctx } from '../ctx'
import { caption, span, title } from './common'

const P = 520
const OX = 960 - P / 2
const OY = 540 - P / 2 + 30

/** 每条等值线预先画成一块 P×P 的离屏图，平铺时直接贴图（每帧描几十万条线段太慢） */
const tileCache = new WeakMap<Flow, HTMLCanvasElement[]>()
export function levelTiles(flow: Flow): HTMLCanvasElement[] {
  let ts = tileCache.get(flow)
  if (!ts) {
    ts = flow.contours.map(({ segs }) => {
      const cv = document.createElement('canvas')
      cv.width = cv.height = P
      const g = cv.getContext('2d')!
      g.strokeStyle = '#fff'
      g.lineWidth = 1.2
      g.lineCap = 'round'
      g.beginPath()
      for (let i = 0; i < segs.length; i += 4) {
        g.moveTo(segs[i] * P, segs[i + 1] * P)
        g.lineTo(segs[i + 2] * P, segs[i + 3] * P)
      }
      g.stroke()
      return cv
    })
    tileCache.set(flow, ts)
  }
  return ts
}

/** 已经稳定（闪光结束）的前 k 条等值线合成一块图，按正负等值线的不同亮度预先叠好 */
let settled: { flow: Flow; k: number; canvas: HTMLCanvasElement } | null = null
function settledTile(flow: Flow, tiles: HTMLCanvasElement[], k: number): HTMLCanvasElement {
  if (settled && settled.flow === flow && settled.k === k) return settled.canvas
  const cv = settled?.canvas ?? document.createElement('canvas')
  cv.width = cv.height = P
  const g = cv.getContext('2d')!
  g.clearRect(0, 0, P, P)
  for (let l = 0; l < k; l++) {
    g.globalAlpha = flow.contours[l].level < 0 ? 0.28 : 0.5
    g.drawImage(tiles[l], 0, 0)
  }
  settled = { flow, k, canvas: cv }
  return cv
}

export function drawFluid(c: Ctx) {
  const { g, t, tl, v, f } = c
  const A = c.alpha
  const flow = v.flow
  const tiles = levelTiles(flow)
  const chainT = tl.chainHit[0] - 0.6
  const dim = 1 - 0.7 * smoothstep(chainT - 0.6, chainT + 0.4, t)

  // 流线：平铺；中心那一块是基本区域 T²
  const shown = tl.streamHit.filter((h) => h <= t).length
  const nShown = Math.min(shown, tiles.length)
  // 出现超过 1.2 秒的等值线亮度已经稳定，合成一块图再平铺；新出现的单独画（带闪光）
  let k0 = 0
  while (k0 < nShown && t - tl.streamHit[k0] > 1.2) k0++
  const base = A * dim
  if (k0 > 0 && base > 0.005) {
    const tile = settledTile(flow, tiles, k0)
    for (let i = -2; i <= 2; i++)
      for (let j = -1; j <= 1; j++) {
        g.globalAlpha = base * (i === 0 && j === 0 ? 1 : 0.55)
        g.drawImage(tile, OX + i * P, OY + j * P)
      }
    g.globalAlpha = 1
  }
  for (let l = k0; l < nShown; l++) {
    const since = t - tl.streamHit[l]
    const flash = Math.exp(-since / 0.3)
    const neg = flow.contours[l].level < 0
    const a = easeOut(since / 0.35) * base
    for (let i = -2; i <= 2; i++)
      for (let j = -1; j <= 1; j++) {
        const center = i === 0 && j === 0
        g.globalAlpha = Math.min(1, ((neg ? 0.28 : 0.5) + 0.4 * flash) * a * (center ? 1 : 0.55))
        g.drawImage(tiles[l], OX + i * P, OY + j * P)
      }
    g.globalAlpha = 1
  }
  const fa = easeOut((t - c.start) / 0.6) * A * dim
  g.strokeStyle = white(0.5 * fa)
  g.lineWidth = 1
  g.strokeRect(OX, OY, P, P)
  f.draw(g, 'torus2', OX + 8, OY - 12, { em: 26, alpha: 0.8 * fa })

  // 示踪粒子
  const tr = flow.tracers
  const trA = span(t, c.start + 2.2) * A * dim
  if (trA > 0.01) {
    const k = Math.min(tr.steps - 1, Math.max(0, Math.floor((t - c.start - 2.2) * 56)))
    g.fillStyle = white(0.9 * trA)
    for (const pts of tr.pts) {
      const x = pts[2 * k] - Math.floor(pts[2 * k])
      const y = pts[2 * k + 1] - Math.floor(pts[2 * k + 1])
      for (let i = -2; i <= 2; i++)
        for (let j = -1; j <= 1; j++) {
          const sx = OX + (i + x) * P
          const sy = OY + (j + y) * P
          if (sx < -4 || sx > 1924 || sy < -4 || sy > 1084) continue
          g.fillRect(sx - 1.5, sy - 1.5, 3, 3)
        }
    }
  }

  // 精确解的公式
  const eA = span(t, c.start + 0.8, chainT) * A
  if (eA > 0.01) {
    g.fillStyle = `rgba(0,0,0,${0.78 * eA})`
    g.fillRect(360, 44, 1200, 170)
    f.draw(g, 'exact', 960, 108, { em: 30, align: 'center', valign: 'middle', alpha: eA })
    caption(g, FLUID.exact, 960, 176, eA, { size: 22 })
  }

  // 链条：牛顿 → 玻尔兹曼 → 流体
  const ch = tl.chainHit
  const cy = 470
  const xs = [360, 960, 1560]
  const lineA = span(t, ch[0] - 0.3) * A
  if (lineA > 0.01) {
    title(g, FLUID.chainTitle, lineA)
    // 列车：在两次点亮之间从一站驶到下一站
    let trainX = xs[0]
    if (t >= ch[1]) trainX = xs[1] + (xs[2] - xs[1]) * easeOut((t - ch[1]) / Math.max(0.3, ch[2] - ch[1]))
    else if (t >= ch[0]) trainX = xs[0] + (xs[1] - xs[0]) * easeOut((t - ch[0]) / Math.max(0.3, ch[1] - ch[0]))
    if (t >= ch[2]) trainX = xs[2]
    g.fillStyle = white(0.25 * lineA)
    g.fillRect(xs[0], cy, xs[2] - xs[0], 1.5)
    g.fillStyle = white(0.9 * lineA)
    g.fillRect(xs[0], cy - 1, trainX - xs[0], 3.5)
    glow(g, trainX, cy, 90, 0.6 * lineA)
    f.draw(g, 'limit1', (xs[0] + xs[1]) / 2, cy - 44, { em: 26, align: 'center', valign: 'middle', alpha: span(t, ch[0] + 0.2) * A })
    f.draw(g, 'limit2', (xs[1] + xs[2]) / 2, cy - 44, { em: 26, align: 'center', valign: 'middle', alpha: span(t, ch[1] + 0.2) * A })
    xs.forEach((x, i) => {
      const lit = t >= ch[i]
      const flash = lit ? Math.exp(-(t - ch[i]) / 0.3) : 0
      g.fillStyle = '#000'
      g.beginPath()
      g.arc(x, cy, 16, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = white((lit ? 0.95 : 0.4) * lineA)
      g.lineWidth = 2
      g.stroke()
      if (lit) {
        g.fillStyle = white(0.95 * lineA)
        g.beginPath()
        g.arc(x, cy, 8 + 4 * flash, 0, Math.PI * 2)
        g.fill()
        glow(g, x, cy, 160, 0.8 * flash * A)
      }
      const la = (lit ? 1 : 0.35) * lineA
      text(g, FLUID.chain[i], x, cy + 62, { size: 32, zh: true, weight: 400, align: 'center', color: white(0.92 * la), tracking: 4 })
      text(g, FLUID.chainEn[i], x, cy + 96, { size: 18, italic: true, weight: 300, align: 'center', color: white(0.55 * la) })
    })
    const mA = span(t, ch[3]) * A
    f.draw(g, 'empirical', 960, 780, { em: 30, align: 'center', valign: 'middle', alpha: mA })
    caption(g, FLUID.empirical, 960, 880, mA, { size: 24 })
    const rA = span(t, ch[4]) * A
    text(g, 'Deng–Hani–Ma  arXiv:2408.07818 · arXiv:2503.01800, Thm 1–3', 960, 990, {
      size: 16,
      mono: true,
      weight: 300,
      align: 'center',
      color: white(0.5 * rA),
    })
  }
}
