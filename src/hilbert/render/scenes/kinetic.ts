// 副歌二前半（2:47–3:17）：定理 1（环面，d = 2, 3）与流体力学极限。
// 左边是气体 B（N = 400，ε = 0.004，初速率全为 1）的速度 (v_x, v_y) 散点：圆环在碰撞中弥散成 Gaussian 云；
// 右下是速率的经验分布，与 T = ½ 的 Maxwell 分布的速率密度 (|v|/T)e^{−|v|²/2T} 对照（能量守恒给出 T = ½）。
// 后半：碰撞率 α = δ^{−1} → ∞，n 趋于局部 Maxwell 分布，得到不可压 NSF（定理 2）与可压 Euler（定理 3）。

import { KINETIC } from '../../content'
import { stateAt } from '../../math/hardspheres'
import { easeOut, glow, richText, smoothstep, text, white } from '../draw'
import type { Ctx } from '../ctx'
import { caption, span, title } from './common'

const VC = { x: 470, y: 600, s: 165 }
const HIST = { x0: 980, x1: 1800, y: 950, h: 330, vmax: 2.8, bins: 40 }

export function drawKinetic(c: Ctx) {
  const { g, t, tl, v, f } = c
  const A = c.alpha
  const sim = v.simB
  const tau = Math.max(0, Math.min(sim.T, tl.kinSim.at(t)))
  const split = tl.hydroStart
  const p1 = 1 - smoothstep(split - 0.4, split, t)
  const p2 = smoothstep(split - 0.1, split + 0.5, t)

  title(g, KINETIC.title, span(t, c.start + 0.2, split) * A)
  title(g, KINETIC.hydro, span(t, split + 0.2) * A)

  // 速度平面
  const ax = easeOut((t - c.start - 0.3) / 0.6) * A
  g.fillStyle = white(0.22 * ax)
  g.fillRect(VC.x - VC.s * 2.2, VC.y, VC.s * 4.4, 1)
  g.fillRect(VC.x, VC.y - VC.s * 2.2, 1, VC.s * 4.4)
  text(g, 'vₓ', VC.x + VC.s * 2.2 + 10, VC.y + 6, { size: 18, italic: true, weight: 300, color: white(0.6 * ax) })
  text(g, 'v_y', VC.x + 8, VC.y - VC.s * 2.2 - 8, { size: 18, italic: true, weight: 300, color: white(0.6 * ax) })
  // 单位圆（初速率）
  g.strokeStyle = white(0.18 * ax)
  g.beginPath()
  g.arc(VC.x, VC.y, VC.s, 0, Math.PI * 2)
  g.stroke()
  // Maxwell 分布的等值圆（后半）
  if (p2 > 0.01) {
    for (let k = 1; k <= 4; k++) {
      // T = ½：密度 ∝ e^{−|v|²}，等值圆半径 √(k/2)
      const r = Math.sqrt(k / 2) * VC.s
      g.strokeStyle = white(0.35 * p2 * A)
      g.setLineDash([4, 6])
      g.beginPath()
      g.arc(VC.x, VC.y, r, 0, Math.PI * 2)
      g.stroke()
    }
    g.setLineDash([])
  }

  // 散点与速率直方图
  const counts = new Array<number>(HIST.bins).fill(0)
  const bw = HIST.vmax / HIST.bins
  g.fillStyle = white(0.85 * ax)
  const pulse = c.fx.strong
  for (let p = 0; p < sim.n; p++) {
    const s = stateAt(sim.tracks[p], tau)
    const x = VC.x + s.vx * VC.s
    const y = VC.y - s.vy * VC.s
    g.fillRect(x - 1.5, y - 1.5, 3, 3)
    const sp = Math.hypot(s.vx, s.vy)
    const b = Math.floor(sp / bw)
    if (b >= 0 && b < HIST.bins) counts[b]++
  }
  if (pulse > 0.05) glow(g, VC.x, VC.y, 420, 0.12 * pulse * A)
  text(g, `t = ${tau.toFixed(2)}`, VC.x - VC.s * 2.2, VC.y + VC.s * 2.2 + 36, { size: 18, mono: true, weight: 300, color: white(0.55 * ax) })
  caption(g, KINETIC.sample, VC.x - VC.s * 2.2, 1000, span(t, c.start + 1.2) * A, { size: 19, align: 'left', maxWidth: 760 })

  // 直方图（前半）
  const hA = ax * p1
  if (hA > 0.01) {
    const X = (sp: number) => HIST.x0 + (sp / HIST.vmax) * (HIST.x1 - HIST.x0)
    const Yd = (d: number) => HIST.y - (d / 1.1) * HIST.h
    g.fillStyle = white(0.3 * hA)
    g.fillRect(HIST.x0, HIST.y, HIST.x1 - HIST.x0, 1)
    for (let b = 0; b < HIST.bins; b++) {
      const d = counts[b] / (sim.n * bw)
      const h = Math.min(HIST.h + 30, HIST.y - Yd(d))
      g.fillStyle = white(0.55 * hA)
      g.fillRect(X(b * bw) + 1, HIST.y - h, X(bw) - X(0) - 2, h)
    }
    for (const k of [0, 1, 2]) text(g, String(k), X(k), HIST.y + 26, { size: 15, mono: true, weight: 300, align: 'center', color: white(0.5 * hA) })
    text(g, '|v|', HIST.x1 + 12, HIST.y + 6, { size: 18, italic: true, weight: 300, color: white(0.6 * hA) })
    // 理论曲线：T = ½ 时 2|v|e^{−|v|²}
    const cA = span(t, c.start + 4.5) * hA
    if (cA > 0.01) {
      g.strokeStyle = white(0.95 * cA)
      g.lineWidth = 2
      g.beginPath()
      for (let k = 0; k <= 200; k++) {
        const sp = (HIST.vmax * k) / 200
        const d = 2 * sp * Math.exp(-sp * sp)
        if (k === 0) g.moveTo(X(sp), Yd(d))
        else g.lineTo(X(sp), Yd(d))
      }
      g.stroke()
      f.draw(g, 'rayleigh', X(1.45), Yd(0.72), { em: 26, valign: 'middle', alpha: cA })
    }
  }

  // 前半右上：定理 1
  const RX = 1000
  f.draw(g, 'thm1', RX, 250, { em: 34, valign: 'middle', alpha: span(t, c.start + 0.8, split) * A })
  f.draw(g, 'thm1range', RX, 340, { em: 26, valign: 'middle', alpha: span(t, c.start + 1.8, split) * A })
  const cA = span(t, c.start + 3.0, split) * A
  f.draw(g, 'cond', RX, 410, { em: 21, valign: 'middle', alpha: cA * 0.85 })
  richText(g, 'Deng–Hani–Ma, arXiv:2503.01800, Thm 1', RX, 470, { size: 15, mono: true, weight: 300, color: white(0.45 * cA) })

  // 后半右栏：α → ∞，局部 Maxwell，NSF，Euler
  const hx = tl.hydroHit
  const R2 = 960
  f.draw(g, 'hydro', R2, 250, { em: 34, valign: 'middle', alpha: span(t, hx[0]) * A })
  f.draw(g, 'maxwellian', R2 + 330, 250, { em: 30, valign: 'middle', alpha: span(t, hx[1]) * A })
  const nA = span(t, hx[2]) * A
  caption(g, KINETIC.nsf, R2, 390, nA, { size: 22, align: 'left' })
  f.draw(g, 'nsf', R2, 520, { em: 28, valign: 'middle', alpha: nA })
  f.draw(g, 'nsfscale', R2 + 420, 520, { em: 22, valign: 'middle', alpha: span(t, hx[4]) * A })
  const eA = span(t, hx[3]) * A
  caption(g, KINETIC.euler, R2, 680, eA, { size: 22, align: 'left' })
  f.draw(g, 'euler', R2, 820, { em: 26, valign: 'middle', alpha: eA })
}
