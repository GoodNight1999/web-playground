// 副歌一前半（1:54–2:09）：切割（arXiv:2408.07818 §2.3；arXiv:2503.01800 定义 2.4、2.6）。
// 把分子里的一组原子“切作 free”：它和其余部分之间的每条键，在它这一侧变成自由端，在另一侧变成固定端（×）。
// 按 Fubini 定理，这就是先积掉另一部分的变量：I_M = I_{M1} ∘ I_{M2}。
// 这里对主歌里得到的真实分子执行一个合法的自上而下切割序列，每个强拍切下一个初等分子。

import { CUTTING } from '../../content'
import type { CutKind } from '../../math/molecule'
import { GAS_A } from '../visuals'
import { easeOut, glow, text, white } from '../draw'
import type { Ctx } from '../ctx'
import { caption, cross, diamond, molGeom, span, title, type Rect } from './common'

const RECT: Rect = { x: 170, y: 230, w: 860, h: 620 }

const ROWS: { kind: CutKind; formula: 'gain3' | 'gain33' | 'gain4' }[] = [
  { kind: '3', formula: 'gain3' },
  { kind: '2', formula: 'gain3' },
  { kind: '33', formula: 'gain33' },
  { kind: '4', formula: 'gain4' },
]

export function drawCutting(c: Ctx) {
  const { g, t, tl, v, f } = c
  const A = c.alpha
  const mol = v.mol
  const geo = molGeom(mol, v.layout, RECT)
  const done = tl.cutHit.filter((h) => h <= t).length
  // 每个原子属于第几步、第几步之后已切
  const stepOf = new Array<number>(mol.atoms.length).fill(Infinity)
  v.steps.forEach((s, i) => s.atoms.forEach((id) => (stepOf[id] = i)))
  const isCut = (id: number) => stepOf[id] < done

  title(g, CUTTING.title, span(t, c.start + 0.2) * A)

  // 时间层
  const la = easeOut((t - c.start) / 0.5) * A
  for (let l = 0; l <= GAS_A.layers; l++) {
    const y = RECT.y + (1 - l / GAS_A.layers) * RECT.h
    g.fillStyle = white((l === 0 || l === GAS_A.layers ? 0.28 : 0.09) * la)
    g.fillRect(RECT.x - 40, y, RECT.w + 80, 1)
  }

  // 边：键被切开后，先切的一侧（父亲）是自由端，后切的一侧（孩子）是固定端 ×
  for (const pts of geo.line.values()) {
    for (let j = 0; j + 1 < pts.length; j++) {
      const lo = pts[j]
      const hi = pts[j + 1]
      g.strokeStyle = white(0.7 * la)
      g.lineWidth = 1.6
      const bond = lo.atom >= 0 && hi.atom >= 0
      const split = bond && isCut(hi.atom) && stepOf[hi.atom] !== stepOf[lo.atom]
      if (!split) {
        g.beginPath()
        g.moveTo(lo.x, lo.y)
        g.lineTo(hi.x, hi.y)
        g.stroke()
        continue
      }
      const since = t - tl.cutHit[stepOf[hi.atom]]
      const gap = 0.24 * easeOut(since / 0.25)
      const mx = (lo.x + hi.x) / 2
      const my = (lo.y + hi.y) / 2
      const ax = hi.x + (mx - hi.x) * (1 - gap)
      const ay = hi.y + (my - hi.y) * (1 - gap)
      const bx = lo.x + (mx - lo.x) * (1 - gap)
      const by = lo.y + (my - lo.y) * (1 - gap)
      g.beginPath()
      g.moveTo(hi.x, hi.y)
      g.lineTo(ax, ay)
      g.moveTo(lo.x, lo.y)
      g.lineTo(bx, by)
      g.stroke()
      if (gap > 0.05) cross(g, bx, by, 5, white(0.9 * la))
    }
  }

  // 原子与初等分子的标记
  v.steps.forEach((s, i) => {
    if (i >= done) return
    const since = t - tl.cutHit[i]
    const flash = Math.exp(-since / 0.25)
    const pts = s.atoms.map((id) => geo.atom[id])
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length
    const good = s.kind === '33'
    if (good) {
      // {33}：把两个原子圈在一起
      const [p, q] = pts
      const ang = Math.atan2(q.y - p.y, q.x - p.x)
      const len = Math.hypot(q.x - p.x, q.y - p.y)
      g.save()
      g.translate(cx, cy)
      g.rotate(ang)
      g.strokeStyle = white((0.55 + 0.45 * flash) * A)
      g.lineWidth = 1.5
      g.beginPath()
      g.ellipse(0, 0, len / 2 + 18, 18, 0, 0, Math.PI * 2)
      g.stroke()
      g.restore()
      glow(g, cx, cy, 160, (0.18 + 0.7 * flash) * A)
    } else if (flash > 0.02) glow(g, cx, cy, 110, 0.6 * flash * A)
    if (s.kind === '4') {
      g.strokeStyle = white(0.7 * A)
      g.lineWidth = 1
      g.strokeRect(cx - 15, cy - 15, 30, 30)
    }
    const lx = cx + (good ? 30 : 16)
    text(g, `{${s.kind}}`, lx, cy - 12, { size: 17, mono: true, weight: good ? 400 : 300, color: white((good ? 0.95 : 0.6) * A) })
  })
  for (const a of mol.atoms) {
    const p = geo.atom[a.id]
    const cut = isCut(a.id)
    diamond(g, p.x, p.y, 8, white((cut ? 0.95 : 0.75) * la))
  }

  // 右栏
  const RX = 1170
  f.draw(g, 'fubini', RX, 205, { em: 38, valign: 'middle', alpha: span(t, c.start + 0.8) * A })
  f.draw(g, 'im', RX, 300, { em: 25, valign: 'middle', alpha: span(t, c.start + 1.6) * A })
  const counts: Record<CutKind, number> = { '4': 0, '3': 0, '2': 0, '33': 0 }
  for (let i = 0; i < done; i++) counts[v.steps[i].kind]++
  const lastKind = done > 0 ? v.steps[done - 1].kind : null
  const bump = done > 0 ? Math.exp(-(t - tl.cutHit[done - 1]) / 0.25) : 0
  ROWS.forEach((row, k) => {
    const a = span(t, c.start + 2.2 + k * 0.35) * A
    if (a <= 0.01) return
    const y = 410 + k * 72
    const info = CUTTING.kinds.find((x) => x.id === `{${row.kind}}`)!
    const hot = lastKind === row.kind ? bump : 0
    text(g, info.id, RX, y + 8, { size: 22, mono: true, weight: 400, color: white((0.75 + 0.25 * hot) * a) })
    text(g, info.zh, RX + 84, y, { size: 19, zh: true, weight: 400, color: white(0.85 * a) })
    text(g, info.en, RX + 84, y + 24, { size: 15, italic: true, weight: 300, color: white(0.5 * a) })
    f.draw(g, row.formula, RX + 400, y + 4, { em: 26, valign: 'middle', alpha: a * (row.kind === '2' ? 0.6 : 1) })
    text(g, String(counts[row.kind]), 1840, y + 10, { size: 28 + 6 * hot, mono: true, weight: 300, align: 'right', color: white((0.8 + 0.2 * hot) * a) })
  })

  f.draw(g, 'goal', RX, 740, { em: 27, valign: 'middle', alpha: span(t, c.start + 3.6) * A })
  f.draw(g, 'nummol', RX, 820, { em: 24, valign: 'middle', alpha: span(t, c.start + 5.0) * A })
  f.draw(g, 'eachmol', RX + 330, 820, { em: 24, valign: 'middle', alpha: span(t, c.start + 5.6) * A })

  const endA = span(t, (tl.cutHit[tl.cutHit.length - 1] ?? c.end - 1.5) + 0.35) * A
  if (endA > 0.01) {
    text(g, `ρ = ${mol.rho}   #{33} = ${counts['33']}   #{4} = ${counts['4']}${counts['4'] === mol.roots.length ? ' = |H|' : ''}`, RX, 900, { size: 20, mono: true, weight: 300, color: white(0.85 * endA) })
  }
  caption(g, CUTTING.greedy, 120, 945, span(t, c.start + 6.5) * A, { size: 24, align: 'left' })
  const nA = span(t, c.start + 7.5) * A
  if (nA > 0.01) {
    text(g, '示意：自上而下的贪心切割序列；论文中的切割算法保证上面的不等式', RX, 960, { size: 16, zh: true, weight: 300, color: white(0.5 * nA) })
    text(g, 'Illustration: a greedy top-down cutting sequence. The algorithm in the paper guarantees the inequality.', RX, 986, {
      size: 13,
      italic: true,
      weight: 300,
      color: white(0.4 * nA),
    })
  }
}
