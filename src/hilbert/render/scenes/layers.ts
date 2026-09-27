// 第二主题后半（1:40–1:54）：时间分层与累积量（arXiv:2408.07818 §1.3）。
// 左边是整个气体 A 的时空图（横轴 x，纵轴 t，100 条世界线），时间层 [(ℓ−1)τ, ℓτ] 在强拍上逐层出现；
// 每层里由碰撞连通的粒子（团簇）被点亮，右侧标出该层最大团簇的粒子数——都是模拟的真实统计。

import { LAYERS } from '../../content'
import { GAS_A } from '../visuals'
import { easeOut, glow, text, white } from '../draw'
import type { Ctx } from '../ctx'
import { caption, span, title } from './common'

const R = { x: 120, y: 190, w: 980, h: 760 }

export function drawLayers(c: Ctx) {
  const { g, t, tl, v, f } = c
  const A = c.alpha
  const sim = v.simA
  const { t0, T, tau, layers } = GAS_A
  const X = (x: number) => R.x + x * R.w
  const Y = (s: number) => R.y + (1 - (s - t0) / (T - t0)) * R.h

  title(g, LAYERS.title, span(t, c.start + 0.1) * A, 1180, 150)

  // 世界线：每段直线在跨过周期边界处断开
  const wA = easeOut((t - c.start) / 0.7) * A
  g.save()
  g.beginPath()
  g.rect(R.x, R.y - 2, R.w, R.h + 4)
  g.clip()
  g.strokeStyle = white(0.16 * wA)
  g.lineWidth = 1
  g.beginPath()
  for (let p = 0; p < sim.n; p++) {
    const tr = sim.tracks[p]
    for (let k = 0; k < tr.t.length; k++) {
      const a = Math.max(t0, tr.t[k])
      const b = Math.min(T, k + 1 < tr.t.length ? tr.t[k + 1] : T)
      if (b <= a) continue
      const xa = tr.x[k] + tr.vx[k] * (a - tr.t[k])
      const xb = tr.x[k] + tr.vx[k] * (b - tr.t[k])
      // 在 [a, b] 上 x 线性变化，按整数边界切开
      const lo = Math.floor(Math.min(xa, xb))
      const hi = Math.floor(Math.max(xa, xb))
      for (let m = lo; m <= hi; m++) {
        const ca = Math.max(m, Math.min(xa, xb))
        const cb = Math.min(m + 1, Math.max(xa, xb))
        const sa = tr.vx[k] === 0 ? a : a + (ca - xa) / tr.vx[k]
        const sb = tr.vx[k] === 0 ? b : a + (cb - xa) / tr.vx[k]
        g.moveTo(X(ca - m), Y(sa))
        g.lineTo(X(cb - m), Y(sb))
      }
    }
  }
  g.stroke()

  // 各层：分界线 + 该层的团簇
  const shown = tl.sliceHit.filter((h) => h <= t).length
  for (let l = 0; l < Math.min(shown, layers); l++) {
    const since = t - tl.sliceHit[l]
    const a = easeOut(since / 0.25) * A
    const flash = Math.exp(-since / 0.3)
    const ya = Y(t0 + l * tau)
    const yb = Y(t0 + (l + 1) * tau)
    g.fillStyle = white((0.03 + 0.1 * flash) * a)
    g.fillRect(R.x, yb, R.w, ya - yb)
    g.fillStyle = white(0.4 * a)
    g.fillRect(R.x, yb, R.w, 1)
    const cl = v.clusters[l]
    cl.events.forEach((k, i) => {
      const e = sim.events[k]
      const big = cl.size[i]
      const x = X(e.cx)
      const y = Y(e.t)
      g.fillStyle = white((0.55 + 0.45 * flash) * a)
      g.beginPath()
      g.arc(x, y, 2.5 + 0.8 * big, 0, Math.PI * 2)
      g.fill()
      if (big === cl.maxSize && flash > 0.02) glow(g, x, y, 60, 0.6 * flash * a)
    })
  }
  g.restore()

  // 层号与最大团簇
  for (let l = 0; l < Math.min(shown, layers); l++) {
    const a = easeOut((t - tl.sliceHit[l]) / 0.25) * A
    const ym = (Y(t0 + l * tau) + Y(t0 + (l + 1) * tau)) / 2
    text(g, `ℓ=${l + 1}`, R.x - 14, ym + 5, { size: 14, mono: true, weight: 300, align: 'right', color: white(0.45 * a) })
    text(g, `max|C| = ${v.clusters[l].maxSize}`, R.x + R.w + 14, ym + 5, { size: 14, mono: true, weight: 300, color: white(0.6 * a) })
  }
  const axA = easeOut((t - c.start) / 0.7) * A
  text(g, '0', X(0), R.y + R.h + 30, { size: 16, mono: true, weight: 300, align: 'center', color: white(0.5 * axA) })
  text(g, '1', X(1), R.y + R.h + 30, { size: 16, mono: true, weight: 300, align: 'center', color: white(0.5 * axA) })
  text(g, 'x', X(0.5), R.y + R.h + 32, { size: 20, italic: true, weight: 300, align: 'center', color: white(0.6 * axA) })
  text(g, `τ = ${tau}`, R.x, R.y - 16, { size: 16, mono: true, weight: 300, color: white(0.5 * axA) })

  // 右栏：累积量展开
  const RX = 1290
  caption(g, LAYERS.cluster, RX, 262, span(t, tl.sliceHit[3] ?? c.start + 2) * A, { size: 22, align: 'left', maxWidth: 520 })
  f.draw(g, 'cumulant', RX, 420, { em: 24, valign: 'middle', alpha: span(t, c.start + 4.2) * A })
  f.draw(g, 'cumbound', RX, 515, { em: 30, valign: 'middle', alpha: span(t, c.start + 6.0) * A })
  caption(g, LAYERS.partial, RX, 620, span(t, c.start + 7.8) * A, { size: 22, align: 'left', maxWidth: 520 })
  f.draw(g, 'molsum', RX, 745, { em: 30, valign: 'middle', alpha: span(t, c.start + 9.4) * A })
  caption(g, LAYERS.arrow, RX, 860, span(t, c.start + 11.0) * A, { size: 21, align: 'left', maxWidth: 520 })
}
