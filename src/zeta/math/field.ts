// 画面用到的 ζ 数据：临界线上的曲线 ζ(½+it)，以及带形区域内的相位等值线。
// 相位线：arg ζ(s) = kπ/6（k = 0…11）的等值线，用 marching squares 从网格里提取。

import { zeta } from './zeta.ts'

export type Spiral = { dt: number; pts: Float32Array }

export function buildSpiral(tMax = 76, dt = 0.004): Spiral {
  const n = Math.floor(tMax / dt) + 1
  const pts = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    const z = zeta(0.5, i * dt)
    pts[i * 2] = z.re
    pts[i * 2 + 1] = z.im
  }
  return { dt, pts }
}

export type PhaseLines = {
  sigma0: number
  sigma1: number
  tMax: number
  chunkT: number
  /** segs[family][chunk]：线段端点 (σ, t) 依次排列 */
  segs: Float32Array[][]
}

export const PHASE_FAMILIES = 12

export function buildPhaseLines(sigma0 = -2.5, sigma1 = 3.5, tMax = 78, h = 0.05, chunkT = 3): PhaseLines {
  const ns = Math.round((sigma1 - sigma0) / h) + 1
  const nt = Math.round(tMax / h) + 1
  // 网格错开半格，避开极点 s = 1 与平凡零点 s = −2 正好落在格点上
  const re = new Float64Array(ns * nt)
  const im = new Float64Array(ns * nt)
  for (let j = 0; j < nt; j++) {
    const t = (j + 0.5) * h
    for (let i = 0; i < ns; i++) {
      const z = zeta(sigma0 + i * h, t)
      re[j * ns + i] = z.re
      im[j * ns + i] = z.im
    }
  }
  const nChunks = Math.ceil(tMax / chunkT)
  const lists: number[][][] = Array.from({ length: PHASE_FAMILIES }, () => Array.from({ length: nChunks }, () => []))
  const f = new Float64Array(ns * nt)
  for (let k = 0; k < PHASE_FAMILIES / 2; k++) {
    const th = (k * Math.PI) / (PHASE_FAMILIES / 2)
    const c = Math.cos(th)
    const s = Math.sin(th)
    // F = Im(e^{−iθ} ζ)：F = 0 处 arg ζ = θ 或 θ + π；用 P = Re(e^{−iθ} ζ) 的符号区分
    for (let q = 0; q < f.length; q++) f[q] = -s * re[q] + c * im[q]
    const P = (idx: number) => c * re[idx] + s * im[idx]
    for (let j = 0; j < nt - 1; j++) {
      const t0 = (j + 0.5) * h
      const chunk = Math.min(nChunks - 1, Math.floor(t0 / chunkT))
      for (let i = 0; i < ns - 1; i++) {
        const a = j * ns + i
        const b = a + 1
        const d = a + ns
        const e = d + 1
        const fa = f[a]
        const fb = f[b]
        const fd = f[d]
        const fe = f[e]
        // 四条边上的交点
        const pts: number[] = []
        const pv: number[] = []
        const edge = (p: number, q: number, fp: number, fq: number, x0: number, y0: number, x1: number, y1: number) => {
          if (fp > 0 === fq > 0) return
          const u = fp / (fp - fq)
          pts.push(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u)
          pv.push(P(p) + (P(q) - P(p)) * u)
        }
        const x0 = sigma0 + i * h
        const x1 = x0 + h
        const y1 = t0 + h
        edge(a, b, fa, fb, x0, t0, x1, t0)
        edge(b, e, fb, fe, x1, t0, x1, y1)
        edge(d, e, fd, fe, x0, y1, x1, y1)
        edge(a, d, fa, fd, x0, t0, x0, y1)
        for (let m = 0; m + 1 < pv.length; m += 2) {
          const pm = (pv[m] + pv[m + 1]) / 2
          const fam = pm > 0 ? k : k + PHASE_FAMILIES / 2
          lists[fam][chunk].push(pts[m * 2], pts[m * 2 + 1], pts[m * 2 + 2], pts[m * 2 + 3])
        }
      }
    }
  }
  return { sigma0, sigma1, tMax, chunkT, segs: lists.map((fam) => fam.map((l) => Float32Array.from(l))) }
}
