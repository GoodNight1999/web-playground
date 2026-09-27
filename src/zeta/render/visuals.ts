// 预计算的画面数据：ζ(½+it) 曲线、相位线（按段组织成 Path2D）、胶片颗粒贴图。

import { buildPhaseLines, buildSpiral, PHASE_FAMILIES, type PhaseLines, type Spiral } from '../math/field'
import { rng } from './draw'

export type Visuals = {
  spiral: Spiral
  phase: PhaseLines
  /** phasePaths[family][chunk] */
  phasePaths: Path2D[][]
  grain: HTMLCanvasElement[]
}

export function buildVisuals(): Visuals {
  const spiral = buildSpiral()
  const phase = buildPhaseLines()
  const phasePaths = phase.segs.map((fam) =>
    fam.map((segs) => {
      const p = new Path2D()
      for (let i = 0; i < segs.length; i += 4) {
        p.moveTo(segs[i], segs[i + 1])
        p.lineTo(segs[i + 2], segs[i + 3])
      }
      return p
    }),
  )
  return { spiral, phase, phasePaths, grain: makeGrain() }
}

function makeGrain(): HTMLCanvasElement[] {
  const r = rng(20120523)
  return Array.from({ length: 4 }, () => {
    const c = document.createElement('canvas')
    c.width = c.height = 384
    const g = c.getContext('2d')!
    const img = g.createImageData(384, 384)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(r() * 255)
      img.data[i] = v
      img.data[i + 1] = v
      img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
    return c
  })
}

export { PHASE_FAMILIES }
