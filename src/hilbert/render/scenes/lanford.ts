// 第二主题前半（1:25–1:40）：Lanford 的短时间理论。
// BBGKY 层级的 Duhamel 展开里，第 n 项对应一棵倒向碰撞树：从 s 个粒子出发，时间往回走，
// 每个碰撞算子 C_{k,k+1} 在某个已有粒子旁边添一个新粒子。树的个数 (s+n−1)!/(s−1)! 乘上时间单纯形的体积 tⁿ/n!，
// 整体只能按 Cⁿtⁿ 控制——级数只在 t < C⁻¹ 时收敛。树的形状是随机抽样的示意（种子固定）。

import { LANFORD } from '../../content'
import { rng } from '../../math/rng'
import { easeOut, glow, richText, text, white } from '../draw'
import type { Ctx } from '../ctx'
import { caption, diamond, span, title } from './common'

const S0 = 2
const NEW = 12

type Tree = { tc: number[]; parent: number[]; x: number[] }

function makeTree(): Tree {
  const r = rng(1975)
  // 添加时刻（归一化到 [0,1]，1 是末时刻 t），从晚到早
  const times = Array.from({ length: NEW }, () => 0.08 + 0.84 * r()).sort((a, b) => b - a)
  const tc = [1, 1, ...times]
  const parent = [-1, -1]
  const order = [0, 1]
  for (let k = 0; k < NEW; k++) {
    const id = S0 + k
    const p = Math.floor(r() * (S0 + k))
    parent.push(p)
    const at = order.indexOf(p)
    order.splice(r() < 0.5 ? at : at + 1, 0, id)
  }
  const x = new Array<number>(S0 + NEW)
  order.forEach((id, k) => (x[id] = 380 + (1160 * k) / (order.length - 1)))
  return { tc, parent, x }
}

const TREE = makeTree()

/** (s+n−1)!/(s−1)!，千分位用细空格 */
function trees(n: number): string {
  let v = 1n
  for (let k = S0; k <= S0 + n - 1; k++) v *= BigInt(k)
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function drawLanford(c: Ctx) {
  const { g, t, tl, f } = c
  const A = c.alpha
  const yT = 400
  const y0 = 860
  const Y = (u: number) => y0 + (yT - y0) * u

  title(g, LANFORD.title, span(t, c.start + 0.2) * A)
  f.draw(g, 'duhamel', 960, 262, { em: 37, align: 'center', valign: 'middle', alpha: span(t, c.start + 0.6) * A })

  // 时间轴
  const axA = easeOut((t - c.start - 0.4) / 0.6) * A
  g.fillStyle = white(0.3 * axA)
  g.fillRect(300, yT, 1, y0 - yT)
  text(g, 't', 286, yT + 6, { size: 22, italic: true, weight: 300, align: 'right', color: white(0.7 * axA) })
  text(g, '0', 286, y0 + 6, { size: 20, mono: true, weight: 300, align: 'right', color: white(0.6 * axA) })
  g.fillStyle = white(0.12 * axA)
  g.fillRect(300, y0, 1260, 1)

  // 树：根粒子从顶端开始；新粒子在添加时刻从父亲旁边出现，一直延伸到 0
  const shown = tl.treeHit.filter((h) => h <= t).length
  for (let id = 0; id < S0 + shown; id++) {
    const since = id < S0 ? t - c.start - 0.8 : t - tl.treeHit[id - S0]
    const grow = easeOut(since / 0.5)
    if (grow <= 0) continue
    const x = TREE.x[id]
    const ya = Y(TREE.tc[id])
    const yb = ya + (y0 - ya) * grow
    const flash = id < S0 ? 0 : Math.exp(-since / 0.22)
    g.fillStyle = white((id < S0 ? 0.85 : 0.6 + 0.4 * flash) * A)
    g.fillRect(x - (id < S0 ? 1 : 0.75), ya, id < S0 ? 2 : 1.5, yb - ya)
    if (id >= S0) {
      const px = TREE.x[TREE.parent[id]]
      const reach = easeOut(since / 0.18)
      g.fillStyle = white((0.55 + 0.45 * flash) * A)
      g.fillRect(Math.min(px, px + (x - px) * reach), ya - 0.75, Math.abs(x - px) * reach, 1.5)
      diamond(g, px, ya, 6 + 4 * flash, white(0.95 * A))
      g.beginPath()
      g.arc(x, ya, 3.5, 0, Math.PI * 2)
      g.fill()
      if (flash > 0.02) glow(g, px, ya, 110, 0.7 * flash * A)
    } else {
      text(g, `z${id === 0 ? '₁' : '₂'}`, x, yT - 18, { size: 22, italic: true, weight: 300, align: 'center', color: white(0.75 * grow * A) })
    }
  }

  // 右侧计数：n 与树的个数
  const cA = span(t, tl.treeHit[0] ?? c.start + 1) * A
  if (cA > 0.01) {
    const n = shown
    const bump = n > 0 ? Math.exp(-(t - tl.treeHit[n - 1]) / 0.2) : 0
    text(g, `n = ${n}`, 1610, 470, { size: 30, mono: true, weight: 300, color: white(0.85 * cA) })
    text(g, 's = 2', 1610, 512, { size: 20, mono: true, weight: 300, color: white(0.5 * cA) })
    text(g, '#trees', 1610, 580, { size: 16, mono: true, weight: 300, color: white(0.45 * cA) })
    text(g, trees(n), 1610, 616, { size: 24 + 4 * bump, mono: true, weight: 300, color: white((0.8 + 0.2 * bump) * cA) })
  }

  // 下方：计数估计与结论
  const kA = span(t, c.start + 8.2) * A
  f.draw(g, 'count', 1180, 975, { em: 30, align: 'center', valign: 'middle', alpha: kA })
  const lA = span(t, c.start + 10.2) * A
  richText(g, '⇒ 只在 $t$ < $C$⁻¹ 时收敛', 1560, 972, { size: 26, zh: true, weight: 400, color: white(0.9 * lA) })
  richText(g, 'converges only for $t$ < $C$⁻¹', 1560, 1006, { size: 17, italic: true, weight: 300, color: white(0.5 * lA) })
  caption(g, LANFORD.note, 120, 960, span(t, c.start + 3.2) * A, { size: 22, align: 'left' })
}
