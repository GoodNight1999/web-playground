// T² = R²/Z² 上不可压 Navier–Stokes 的一族精确解（arXiv:2503.01800 (1.19) 中 ρ ≡ 0 的情形）：
//   ψ(t, x) = e^{−100π²μ₁t} Σ_{|k|² = 25} a_k e^{2πi k·x}，u = ∇^⊥ψ = (−∂_yψ, ∂_xψ)。
// 因为 −Δψ = 100π²ψ，涡量 ω = Δψ 是 ψ 的函数，u·∇ω = 0，非线性项是梯度（并入压强），
// 于是 ∂_t u = μ₁Δu 恰好成立。流线是 ψ 的等值线，形状不随时间改变，只整体衰减。

import { rng } from './rng.ts'

/** |k|² = 25 的格点向量取一半（另一半由共轭给出）：(5,0) (0,5) (3,4) (4,3) (3,−4) (4,−3) */
const K: [number, number][] = [
  [5, 0],
  [0, 5],
  [3, 4],
  [4, 3],
  [3, -4],
  [4, -3],
]

export type Flow = {
  amp: number[]
  phase: number[]
  /** ψ 的最大绝对值（网格上） */
  max: number
  /** 等值线：levels[i] 的线段 [x0, y0, x1, y1, …]，坐标在 [0,1]² */
  contours: { level: number; segs: Float32Array }[]
  /** 示踪粒子沿流线的位置（形状时间 s 等距采样） */
  tracers: { ds: number; steps: number; pts: Float32Array[] }
}

export function makeFlow(seed = 20250303): Flow {
  const r = rng(seed)
  const amp = K.map(() => 0.55 + 0.45 * r())
  const phase = K.map(() => r() * Math.PI * 2)
  const psi = (x: number, y: number) => {
    let s = 0
    for (let i = 0; i < K.length; i++) s += amp[i] * Math.cos(2 * Math.PI * (K[i][0] * x + K[i][1] * y) + phase[i])
    return s
  }
  const vel = (x: number, y: number): [number, number] => {
    let ux = 0
    let uy = 0
    for (let i = 0; i < K.length; i++) {
      const s = -amp[i] * Math.sin(2 * Math.PI * (K[i][0] * x + K[i][1] * y) + phase[i]) * 2 * Math.PI
      // ∂_xψ = s·k_x，∂_yψ = s·k_y；u = (−∂_yψ, ∂_xψ)
      ux -= s * K[i][1]
      uy += s * K[i][0]
    }
    return [ux, uy]
  }

  // 网格上的 ψ（周期），marching squares 提取等值线
  const G = 200
  const f = new Float32Array(G * G)
  let max = 0
  for (let j = 0; j < G; j++)
    for (let i = 0; i < G; i++) {
      const v = psi(i / G, j / G)
      f[j * G + i] = v
      max = Math.max(max, Math.abs(v))
    }
  const at = (i: number, j: number) => f[((j + G) % G) * G + ((i + G) % G)]
  const contours: Flow['contours'] = []
  const NL = 18
  for (let l = 0; l < NL; l++) {
    const level = max * (-0.92 + (1.84 * (l + 0.5)) / NL)
    const segs: number[] = []
    for (let j = 0; j < G; j++)
      for (let i = 0; i < G; i++) {
        const v = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]
        const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]
        const pts: number[] = []
        for (let e = 0; e < 4; e++) {
          const a = v[e]
          const b = v[(e + 1) % 4]
          if ((a < level) !== (b < level)) {
            const u = (level - a) / (b - a)
            const p = c[e]
            const q = c[(e + 1) % 4]
            pts.push((p[0] + (q[0] - p[0]) * u) / G, (p[1] + (q[1] - p[1]) * u) / G)
          }
        }
        // 2 个交点是一条线段；4 个交点（鞍点）按相邻配成两条
        if (pts.length >= 4) segs.push(...pts)
      }
    contours.push({ level, segs: new Float32Array(segs) })
  }

  // 示踪粒子：RK4 沿 dx/ds = u(x)（s 是去掉整体衰减因子后的“形状时间”）
  const N = 150
  const steps = 1800
  const ds = 0.00025
  // 每个存储点之间走 SUB 个 RK4 子步，保证沿轨迹 ψ 守恒到约 1e-4
  const SUB = 3
  const h = ds / SUB
  const pts: Float32Array[] = []
  for (let n = 0; n < N; n++) {
    let x = r()
    let y = r()
    const arr = new Float32Array(steps * 2)
    for (let s = 0; s < steps; s++) {
      arr[2 * s] = x
      arr[2 * s + 1] = y
      for (let k = 0; k < SUB; k++) {
        const [k1x, k1y] = vel(x, y)
        const [k2x, k2y] = vel(x + (h / 2) * k1x, y + (h / 2) * k1y)
        const [k3x, k3y] = vel(x + (h / 2) * k2x, y + (h / 2) * k2y)
        const [k4x, k4y] = vel(x + h * k3x, y + h * k3y)
        x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x)
        y += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y)
      }
    }
    pts.push(arr)
  }
  return { amp, phase, max, contours, tracers: { ds, steps, pts } }
}
