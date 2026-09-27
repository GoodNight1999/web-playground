// 主歌前半（0:53–1:09）：T² 上的硬球气体（事件驱动模拟，真实碰撞）。
// 属于“末时刻两个根粒子的碰撞历史”的那些碰撞，被时间映射对齐到强拍上：
// 每个强拍恰好发生一次这样的碰撞，碰撞点留下一个菱形（C 原子）。

import { GAS } from '../../content'
import { GAS_A } from '../visuals'
import { easeOut, glow, smoothstep, text, white } from '../draw'
import { kindOf, recentNotes, shape, type Ctx } from '../ctx'
import { caption, diamond, posAt, span, title } from './common'

const BOX = { x: 150, y: 150, s: 800 }

export function drawGas(c: Ctx) {
  const { g, t, tl, v, f } = c
  const A = c.alpha
  const sim = v.simA
  const mol = v.mol
  const tau = tl.gasSim.at(t)
  const X = (x: number) => BOX.x + x * BOX.s
  const Y = (y: number) => BOX.y + (1 - y) * BOX.s

  // 盒子：细框与刻度（周期边界）
  const boxA = easeOut((t - c.start) / 0.8) * A
  g.strokeStyle = white(0.28 * boxA)
  g.lineWidth = 1
  g.strokeRect(BOX.x, BOX.y, BOX.s, BOX.s)
  g.fillStyle = white(0.22 * boxA)
  for (let k = 1; k < 10; k++) {
    g.fillRect(BOX.x + (BOX.s * k) / 10, BOX.y - 6, 1, 6)
    g.fillRect(BOX.x + (BOX.s * k) / 10, BOX.y + BOX.s, 1, 6)
    g.fillRect(BOX.x - 6, BOX.y + (BOX.s * k) / 10, 6, 1)
    g.fillRect(BOX.x + BOX.s, BOX.y + (BOX.s * k) / 10, 6, 1)
  }
  f.draw(g, 'torus2', BOX.x, BOX.y - 22, { em: 30, alpha: 0.8 * boxA })

  // 已经发生过的“历史原子”
  const inHistory = new Set<number>()
  const roots = new Set(GAS_A.roots)
  g.save()
  g.beginPath()
  g.rect(BOX.x, BOX.y, BOX.s, BOX.s)
  g.clip()
  let shownAtoms = 0
  for (const a of mol.atoms) {
    if (a.t > tau) continue
    shownAtoms++
    inHistory.add(a.p[0])
    inHistory.add(a.p[1])
    const hitT = tl.atomHit[a.id]
    const age = Number.isNaN(hitT) ? 10 : t - hitT
    const hit = Math.exp(-Math.max(0, age) / 0.22)
    const x = X(a.ev.cx)
    const y = Y(a.ev.cy)
    diamond(g, x, y, 7 + 10 * hit, white((0.55 + 0.45 * hit) * A))
    if (hit > 0.02) {
      glow(g, x, y, 200, 0.8 * hit * A)
      g.strokeStyle = white(0.7 * hit * A)
      g.lineWidth = 1.5
      g.beginPath()
      g.arc(x, y, 14 + 90 * (1 - hit), 0, Math.PI * 2)
      g.stroke()
    }
  }

  // 粒子：圆盘半径 ε/2（按比例），加一段很短的运动残影
  const rad = (sim.eps / 2) * BOX.s
  for (let p = 0; p < sim.n; p++) {
    const s = posAt(sim, p, tau)
    const s0 = posAt(sim, p, tau - 0.035)
    const x = X(s.x)
    const y = Y(s.y)
    const tagged = inHistory.has(p)
    const x0 = X(s0.x)
    const y0 = Y(s0.y)
    if (Math.abs(x0 - x) < BOX.s / 2 && Math.abs(y0 - y) < BOX.s / 2) {
      const gr = g.createLinearGradient(x0, y0, x, y)
      gr.addColorStop(0, white(0))
      gr.addColorStop(1, white((tagged ? 0.5 : 0.22) * A))
      g.strokeStyle = gr
      g.lineWidth = rad * 1.2
      g.beginPath()
      g.moveTo(x0, y0)
      g.lineTo(x, y)
      g.stroke()
    }
    g.fillStyle = white((tagged ? 0.95 : 0.62) * A)
    g.beginPath()
    g.arc(x, y, rad, 0, Math.PI * 2)
    g.fill()
    if (tagged) {
      g.strokeStyle = white(0.55 * A)
      g.lineWidth = 1
      g.beginPath()
      g.arc(x, y, rad + 4, 0, Math.PI * 2)
      g.stroke()
    }
  }
  g.restore()

  // 末时刻：两个根粒子
  const endA = smoothstep(c.end - 1.6, c.end - 0.9, t) * A
  if (endA > 0.01) {
    for (const p of roots) {
      const s = posAt(sim, p, tau)
      const x = X(s.x)
      const y = Y(s.y)
      g.strokeStyle = white(0.9 * endA)
      g.lineWidth = 1.5
      g.beginPath()
      g.arc(x, y, 18, 0, Math.PI * 2)
      g.stroke()
      glow(g, x, y, 90, 0.5 * endA)
    }
  }

  // 右侧：定义与参数
  const R = 1060
  title(g, GAS.title, span(t, c.start + 0.3), R, 190)
  f.draw(g, 'collision', R, 330, { em: 28, alpha: span(t, c.start + 1.4) * A })
  f.draw(g, 'omega', R, 430, { em: 28, alpha: span(t, c.start + 2.4) * A })
  f.draw(g, 'scaling', R, 540, { em: 34, alpha: span(t, c.start + 3.6) * A })
  text(g, GAS.params, R, 610, { size: 20, mono: true, weight: 300, color: white(0.6 * span(t, c.start + 4.6) * A) })

  // 计数：历史中已经出现的原子
  const cntA = span(t, c.start + 1.8) * A
  if (cntA > 0.01) {
    text(g, `${String(shownAtoms).padStart(2, '0')} / ${mol.atoms.length}`, R, 760, { size: 56, mono: true, weight: 300, color: white(0.92 * cntA) })
    caption(g, GAS.history, R, 812, cntA, { size: 22, align: 'left' })
    text(g, `t = ${tau.toFixed(3)}`, R, 900, { size: 18, mono: true, weight: 300, color: white(0.4 * cntA) })
  }
  if (endA > 0.01) {
    text(g, `|H| = ${roots.size}  ${GAS.roots.zh} ${GAS.roots.en}`, R + 250, 900, { size: 18, mono: true, weight: 300, color: white(0.7 * endA) })
  }

  // 底部一行几何音符（与前奏呼应），很淡
  for (const n of recentNotes(c.notes, t, 0.9)) {
    const age = t - n.t
    const x = BOX.x + ((n.i * 173) % BOX.s)
    const y = 1010 + (n.kind === 'low' ? 8 : n.kind === 'high' ? -10 : 0)
    shape(g, kindOf(n, n.i), x, y, (4 + 3 * n.s) * (1 + 0.8 * Math.exp(-age / 0.08)), white((1 - age / 0.9) * 0.35 * A))
  }
}
