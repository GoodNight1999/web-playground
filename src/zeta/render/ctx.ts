// 场景绘制共享的上下文与小工具。

import type { AudioAnalysis, Onset } from '../audio/analyze'
import type { Timeline } from '../timeline'
import type { FormulaCache } from './formulas'
import type { Visuals } from './visuals'

export type Fx = {
  energy: number
  /** 任意起音的瞬时冲击 0..1 */
  pulse: number
  /** 低频（底鼓/贝斯）冲击 */
  low: number
  /** 强起音冲击 */
  strong: number
}

export type NoteKind = 'low' | 'mid' | 'high'
export type Note = Onset & { kind: NoteKind; i: number }

export type Ctx = {
  g: CanvasRenderingContext2D
  t: number
  /** 场景内时间 */
  lt: number
  start: number
  end: number
  /** 场景淡入淡出 */
  alpha: number
  fx: Fx
  tl: Timeline
  a: AudioAnalysis
  f: FormulaCache
  v: Visuals
  notes: Note[]
}

/** 刚过去的若干个音符（时间 ≤ t 且在 life 秒以内） */
export function recentNotes(notes: Note[], t: number, life: number): Note[] {
  let lo = 0
  let hi = notes.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (notes[mid].t <= t) lo = mid + 1
    else hi = mid
  }
  const out: Note[] = []
  for (let i = lo - 1; i >= 0 && t - notes[i].t <= life; i--) out.push(notes[i])
  return out
}

export type ShapeKind = 'circle' | 'ring' | 'triangle' | 'bar' | 'tick' | 'square'

/** MV 式的几何图元：实心圆、空心环、三角、竖条、短刻线、方块 */
export function shape(
  g: CanvasRenderingContext2D,
  kind: ShapeKind,
  x: number,
  y: number,
  size: number,
  color: string,
  rot = 0,
) {
  g.fillStyle = color
  g.strokeStyle = color
  g.beginPath()
  switch (kind) {
    case 'circle':
      g.arc(x, y, size, 0, Math.PI * 2)
      g.fill()
      return
    case 'ring':
      g.lineWidth = Math.max(1, size * 0.18)
      g.arc(x, y, size, 0, Math.PI * 2)
      g.stroke()
      return
    case 'triangle': {
      for (let k = 0; k < 3; k++) {
        const a = rot + Math.PI / 2 + (k * 2 * Math.PI) / 3
        const px = x + Math.cos(a) * size
        const py = y + Math.sin(a) * size
        if (k === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.closePath()
      g.fill()
      return
    }
    case 'bar':
      g.fillRect(x - size * 0.22, y - size * 1.4, size * 0.44, size * 2.8)
      return
    case 'tick':
      g.fillRect(x - 1, y - size, 2, size * 2)
      return
    case 'square':
      g.fillRect(x - size * 0.8, y - size * 0.8, size * 1.6, size * 1.6)
      return
  }
}

export function kindOf(n: Note, variant: number): ShapeKind {
  if (n.kind === 'low') return variant % 3 === 0 ? 'bar' : 'circle'
  if (n.kind === 'high') return 'tick'
  return variant % 4 === 0 ? 'square' : variant % 4 === 1 ? 'ring' : 'triangle'
}
