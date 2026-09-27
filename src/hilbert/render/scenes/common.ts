// 各场景共用的小部件：左上角的段落标题、底部双语说明、C 原子的菱形、分子的平面几何。

import type { Bi } from '../../content'
import type { Molecule, Layout } from '../../math/molecule'
import { stateAt, type Sim } from '../../math/hardspheres'
import { balancedWrap, easeOut, richText, smoothstep, text, white, type TextOpts } from '../draw'

/** 左上角标题：一条短横线 + 中文 + 英文 */
export function title(g: CanvasRenderingContext2D, b: Bi, a: number, x = 120, y = 104) {
  if (a <= 0.01) return
  g.fillStyle = white(0.55 * a)
  g.fillRect(x, y - 30, 36, 1.5)
  text(g, b.zh, x, y + 8, { size: 28, zh: true, weight: 400, color: white(0.9 * a), tracking: 2 })
  text(g, b.en, x, y + 40, { size: 17, italic: true, weight: 300, color: white(0.5 * a) })
}

/** 双语说明（居中或左对齐）；给了 maxWidth 时按宽度折行。返回占用的高度 */
export function caption(
  g: CanvasRenderingContext2D,
  b: Bi,
  x: number,
  y: number,
  a: number,
  o: { size?: number; align?: 'left' | 'center' | 'right'; weight?: number; maxWidth?: number } = {},
): number {
  const size = o.size ?? 30
  const align = o.align ?? 'center'
  const zo: TextOpts = { size, zh: true, weight: o.weight ?? 400, align, color: white(0.92 * a) }
  const eo: TextOpts = { size: Math.max(15, Math.round(size * 0.6)), italic: true, weight: 300, align, color: white(0.52 * a) }
  const zl = o.maxWidth ? balancedWrap(g, b.zh, o.maxWidth, zo) : [b.zh]
  const el = o.maxWidth ? balancedWrap(g, b.en, o.maxWidth, eo) : [b.en]
  const zh = size * 1.3
  const eh = eo.size * 1.35
  if (a > 0.01) {
    zl.forEach((l, i) => richText(g, l, x, y + i * zh, zo))
    el.forEach((l, i) => richText(g, l, x, y + (zl.length - 1) * zh + size * 0.62 + 12 + i * eh, eo))
  }
  return (zl.length - 1) * zh + size * 0.62 + 12 + el.length * eh
}

/** 在 at 之后 dur 秒内淡入，在 out 之前 fade 秒内淡出 */
export function span(t: number, at: number, out = Infinity, dur = 0.45, fade = 0.3): number {
  const a = easeOut((t - at) / dur)
  return Number.isFinite(out) ? a * (1 - smoothstep(out - fade, out, t)) : a
}

/** C 原子：菱形（arXiv:2503.01800 图 3 的画法） */
export function diamond(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, fill = true) {
  g.beginPath()
  g.moveTo(x, y - r)
  g.lineTo(x + r * 0.78, y)
  g.lineTo(x, y + r)
  g.lineTo(x - r * 0.78, y)
  g.closePath()
  if (fill) {
    g.fillStyle = color
    g.fill()
  } else {
    g.strokeStyle = color
    g.stroke()
  }
}

/** 固定端的 × 记号 */
export function cross(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.strokeStyle = color
  g.lineWidth = 1.6
  g.beginPath()
  g.moveTo(x - r, y - r)
  g.lineTo(x + r, y + r)
  g.moveTo(x + r, y - r)
  g.lineTo(x - r, y + r)
  g.stroke()
}

export type Rect = { x: number; y: number; w: number; h: number }

/** 分子的平面几何：原子位置，以及每条粒子线的关键点（底端、各原子、顶端） */
export type MolGeom = {
  atom: { x: number; y: number }[]
  /** 粒子线 → 折线顶点：[{x, y, atom}]，atom = -1 表示端点 */
  line: Map<number, { x: number; y: number; atom: number }[]>
}

/** 纵向：时间 t0 在下、T 在上；顶端与底端的端点各伸出一小截 */
export function molGeom(m: Molecule, L: Layout, r: Rect): MolGeom {
  const X = (u: number) => r.x + u * r.w
  const Y = (v: number) => r.y + (1 - v) * r.h
  const atom = m.atoms.map((a) => ({ x: X(L.ax[a.id]), y: Y(L.ay[a.id]) }))
  const line = new Map<number, { x: number; y: number; atom: number }[]>()
  const roots = new Set(m.roots)
  for (const [p, ids] of m.lines) {
    const lane = X(L.lane.get(p)!)
    const last = atom[ids[ids.length - 1]]
    const pts = [{ x: lane, y: Y(-0.035), atom: -1 }]
    for (const id of ids) pts.push({ ...atom[id], atom: id })
    // 根粒子穿过顶部的水平线；其他粒子线在最后一次碰撞后只画一小截顶端
    if (roots.has(p)) pts.push({ x: lane, y: Y(1.045), atom: -1 })
    else pts.push({ x: last.x + (lane - last.x) * 0.35, y: Math.max(Y(1.02), last.y - r.h * 0.07), atom: -1 })
    line.set(p, pts)
  }
  return { atom, line }
}

/** 粒子在时刻 τ 的位置（取模 1） */
export function posAt(sim: Sim, p: number, tau: number) {
  return stateAt(sim.tracks[p], tau)
}
