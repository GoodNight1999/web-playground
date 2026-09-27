// “机制”一场的示意动画：自相似收缩的轴对称涡旋。
// 粒子在相似变量 (ρ, θ, ζ) 里沿一个 Burgers 型拉伸涡旋运动（向轴线旋入、沿轴向流出，
// 轴向带一点向上的偏置，对应论文 §2.1 的描述），再按 ℓr ≍ τ^{1/2}、ℓz ≍ τ^{1/2−h}
// 缩放到屏幕。为了看得出“越来越细长”，h 取了夸张值，画面上标注为示意图。

import { blue, gold, hash2, ink, rng, smoothstep } from './draw'

const DT = 1 / 60
const TRAIL = 20
/** 轴向超出这个相似坐标就淡出，让涡柱有清晰的上下边界 */
const Z_EXIT = 1.8
const TAU_MIN = 0.035
/** 论文要求 0 < h < 1/100；示意图里夸张为 0.3 */
const H_VIS = 0.3
const GAMMA = 1.6
const CORE = 0.55
const PHI = 0.36

export type VortexGeom = { cx: number; cy: number; lr: number; lz: number; tau: number; phi: number }

type P = {
  life: number
  phase: number
  gen: number
  steps: number
  rho: number
  th: number
  zeta: number
  trail: Float32Array
}

export type Pulse = { t: number; rho: number; zeta: number; family: 0 | 1 }

export class Vortex {
  private ps: P[] = []
  private dur = 1
  cx = 780
  cy = 500
  R0 = 400
  Z0 = 250

  constructor(count: number, seed = 11) {
    const r = rng(seed)
    for (let i = 0; i < count; i++) {
      this.ps.push({ life: 2.0 + r() * 1.2, phase: r() * 5, gen: -1, steps: 0, rho: 0, th: 0, zeta: 0, trail: new Float32Array(TRAIL * 3) })
    }
  }

  setDuration(dur: number) {
    if (Math.abs(dur - this.dur) > 1e-6) {
      this.dur = dur
      for (const p of this.ps) p.gen = -1
    }
  }

  tau(lt: number) {
    const p = Math.max(0, Math.min(1, lt / this.dur))
    const e = p * p * (3 - 2 * p)
    return Math.exp(Math.log(TAU_MIN) * (0.15 * p + 0.85 * e))
  }

  /** 相似时间的流速：越接近奇点越快（示意） */
  private rate(lt: number) {
    return Math.min(5.5, 0.85 * this.tau(lt) ** -0.55)
  }

  geom(lt: number): VortexGeom {
    const tau = this.tau(lt)
    return { cx: this.cx, cy: this.cy, lr: this.R0 * Math.sqrt(tau), lz: this.Z0 * tau ** (0.5 - H_VIS), tau, phi: PHI }
  }

  private omega(rho: number) {
    const r2 = rho * rho
    return r2 < 1e-6 ? GAMMA / (CORE * CORE) : (GAMMA * (1 - Math.exp(-r2 / (CORE * CORE)))) / r2
  }

  private advance(p: P, i: number, lt: number) {
    const gen = Math.floor((lt + p.phase) / p.life)
    const born = gen * p.life - p.phase
    const target = Math.floor((lt - born) / DT)
    if (gen !== p.gen || target < p.steps) {
      p.gen = gen
      p.steps = 0
      p.rho = 1.0 + hash2(i, gen * 3) * 1.3
      p.th = hash2(i, gen * 3 + 1) * Math.PI * 2
      p.zeta = (hash2(i, gen * 3 + 2) - 0.5) * 0.56
      for (let k = 0; k < TRAIL; k++) {
        p.trail[k * 3] = p.rho
        p.trail[k * 3 + 1] = p.th
        p.trail[k * 3 + 2] = p.zeta
      }
    }
    while (p.steps < target) {
      const ds = this.rate(born + p.steps * DT) * DT
      p.rho += -0.5 * p.rho * ds
      p.zeta += (p.zeta + 0.06) * ds
      p.th += this.omega(p.rho) * ds
      p.trail.copyWithin(0, 3)
      p.trail[TRAIL * 3 - 3] = p.rho
      p.trail[TRAIL * 3 - 2] = p.th
      p.trail[TRAIL * 3 - 1] = p.zeta
      p.steps++
    }
    return (lt - born) / p.life
  }

  draw(g: CanvasRenderingContext2D, lt: number, alpha: number, glow: number, pulses: Pulse[], t: number) {
    if (alpha <= 0.01) return
    const G = this.geom(lt)
    const { cx, cy, lr, lz } = G
    const az = 0.07 * lt
    const sinP = Math.sin(PHI)
    const cosP = Math.cos(PHI)
    const toScreen = (rho: number, th: number, zeta: number, out: number[]) => {
      const r = lr * rho
      const a = th + az
      out[0] = cx + r * Math.cos(a)
      out[1] = cy - lz * zeta * cosP + r * Math.sin(a) * sinP
      out[2] = Math.sin(a)
    }

    // 对称轴与涡核轮廓
    g.setLineDash([6, 8])
    g.strokeStyle = ink(0.14 * alpha)
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(cx, cy - 430)
    g.lineTo(cx, cy + 430)
    g.stroke()
    g.strokeStyle = gold(0.32 * alpha)
    for (const z of [-1, 1]) {
      g.beginPath()
      g.ellipse(cx, cy - z * lz * cosP, lr, lr * sinP, 0, 0, Math.PI * 2)
      g.stroke()
    }
    g.beginPath()
    g.moveTo(cx - lr, cy - lz * cosP)
    g.lineTo(cx - lr, cy + lz * cosP)
    g.moveTo(cx + lr, cy - lz * cosP)
    g.lineTo(cx + lr, cy + lz * cosP)
    g.stroke()
    g.setLineDash([])

    // 环状振荡脉冲：两族（金/蓝），先被剪切放大、后被粘性阻尼，径向波长逐渐变短
    for (const pu of pulses) {
      const age = t - pu.t
      if (age < 0 || age > 1.6) continue
      const amp = age < 0.45 ? (age / 0.45) ** 2 : Math.exp(-(age - 0.45) / 0.32)
      const R = lr * pu.rho
      const lambda = lr * (0.13 - 0.07 * Math.min(1, age / 1.6))
      const yc = cy - lz * pu.zeta * cosP
      for (let j = -3; j <= 3; j++) {
        const w = Math.cos((j / 3.5) * (Math.PI / 2)) ** 2 * (j % 2 === 0 ? 1 : 0.55)
        const a = alpha * amp * w * 0.9
        if (a < 0.01) continue
        const rr = R + j * lambda
        if (rr <= 1) continue
        g.strokeStyle = pu.family ? gold(a) : blue(a)
        g.lineWidth = 1.2
        g.beginPath()
        g.ellipse(cx, yc, rr, rr * sinP, 0, 0, Math.PI * 2)
        g.stroke()
      }
    }

    // 粒子：按速度档与深度档分组批量描边
    const pt = [0, 0, 0]
    const q = [0, 0, 0]
    const paths: Path2D[][] = Array.from({ length: 12 }, () => Array.from({ length: TRAIL - 1 }, () => new Path2D()))
    const speedScale = this.rate(lt) * lr
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i]
      const age = this.advance(p, i, lt)
      if (Math.abs(p.zeta) > Z_EXIT) continue
      const env = Math.sin(Math.PI * Math.min(1, Math.max(0, age))) ** 0.6 * smoothstep(Z_EXIT, Z_EXIT - 0.6, Math.abs(p.zeta))
      const v = (p.rho * this.omega(p.rho) * speedScale) / 380
      const sb = v > 1.1 ? 2 : v > 0.45 ? 1 : 0
      toScreen(p.rho, p.th, p.zeta, pt)
      const front = pt[2] > 0 ? 1 : 0
      if (env < 0.08) continue
      const set = paths[(sb * 2 + front) * 2 + (env > 0.5 ? 1 : 0)]
      for (let k = 0; k < TRAIL - 1; k++) {
        toScreen(p.trail[k * 3], p.trail[k * 3 + 1], p.trail[k * 3 + 2], q)
        toScreen(p.trail[k * 3 + 3], p.trail[k * 3 + 4], p.trail[k * 3 + 5], pt)
        set[k].moveTo(q[0], q[1])
        set[k].lineTo(pt[0], pt[1])
      }
    }
    g.lineCap = 'round'
    for (let s = 0; s < 3; s++) {
      for (let front = 0; front < 2; front++) {
        for (let e = 0; e < 2; e++) {
          for (let k = 0; k < TRAIL - 1; k++) {
            const a = alpha * ((k + 1) / (TRAIL - 1)) ** 1.5 * (front ? 0.72 : 0.3) * (e ? 1 : 0.45) * (0.75 + 0.45 * glow)
            g.strokeStyle = s === 2 ? ink(a) : s === 1 ? blue(a * 0.95) : blue(a * 0.6)
            g.lineWidth = s === 2 ? 1.25 : 1
            g.stroke(paths[(s * 2 + front) * 2 + e][k])
          }
        }
      }
    }
    return G
  }
}

/** 在给定起音时刻生成脉冲，位置按下标确定（环形带，位于涡核外缘） */
export function makePulses(times: number[]): Pulse[] {
  return times.map((t, i) => ({
    t,
    rho: 1.2 + hash2(i, 91) * 0.5,
    zeta: (hash2(i, 92) - 0.5) * 1.4,
    family: (i % 2) as 0 | 1,
  }))
}
