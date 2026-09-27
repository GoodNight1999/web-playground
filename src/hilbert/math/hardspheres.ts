// T² = R²/Z² 上直径 ε 的硬球（圆盘）系统的事件驱动模拟（Deng–Hani–Ma 定义 1.1，d = 2）。
// 每次碰撞的时刻都精确求出：相对位置 x_i − x_j + t(v_i − v_j) 与某个格点 m ∈ Z² 的距离恰为 ε，
// 且两球正在靠近；碰撞后按 (1.2) 更新速度：v_i' = v_i − ((v_i − v_j)·ω)ω，v_j' = v_j + ((v_i − v_j)·ω)ω。

import { rng } from './rng.ts'

export type Collision = {
  t: number
  i: number
  j: number
  /** ω = (x_i − x_j − m)/ε，单位向量 */
  wx: number
  wy: number
  /** 提升到 R² 后 x_i − x_j = εω + m，m ∈ Z² 标出碰撞发生在哪两个基本区域之间 */
  mx: number
  my: number
  /** 碰撞点（两球心中点，取模 1） */
  cx: number
  cy: number
}

/** 单个粒子的分段直线轨迹：第 k 段从时刻 t[k] 开始，位置 x[k] + vx[k]·(τ − t[k])（取模 1） */
export type Track = { t: number[]; x: number[]; y: number[]; vx: number[]; vy: number[] }

export type Sim = { n: number; eps: number; T: number; tracks: Track[]; events: Collision[] }

export type SimOpts = {
  n: number
  eps: number
  T: number
  seed: number
  /** maxwell：各分量独立 N(0, σ²)；ring：速率全为 1，方向均匀 */
  init: 'maxwell' | 'ring'
  sigma?: number
}

const wrap = (x: number) => x - Math.floor(x)
const wrapHalf = (x: number) => x - Math.round(x)

export function simulate(o: SimOpts): Sim {
  const { n, eps, T } = o
  const r = rng(o.seed)
  const x = new Float64Array(n)
  const y = new Float64Array(n)
  const vx = new Float64Array(n)
  const vy = new Float64Array(n)
  // 提升到 R² 的连续位置（不取模），用来确定碰撞发生在哪两个基本区域之间
  const X = new Float64Array(n)
  const Y = new Float64Array(n)
  // 初始位置：均匀随机、互不重叠（拒绝采样）
  for (let i = 0; i < n; i++) {
    for (let tries = 0; ; tries++) {
      const px = r()
      const py = r()
      let ok = true
      for (let k = 0; k < i && ok; k++) {
        const dx = wrapHalf(px - x[k])
        const dy = wrapHalf(py - y[k])
        if (dx * dx + dy * dy < eps * eps * 1.21) ok = false
      }
      if (ok || tries > 1000) {
        x[i] = X[i] = px
        y[i] = Y[i] = py
        break
      }
    }
    if (o.init === 'ring') {
      const a = r() * Math.PI * 2
      vx[i] = Math.cos(a)
      vy[i] = Math.sin(a)
    } else {
      const s = o.sigma ?? 1
      const u1 = Math.max(1e-12, r())
      const u2 = r()
      const rad = Math.sqrt(-2 * Math.log(u1)) * s
      vx[i] = rad * Math.cos(2 * Math.PI * u2)
      vy[i] = rad * Math.sin(2 * Math.PI * u2)
    }
  }

  const tracks: Track[] = Array.from({ length: n }, (_, i) => ({ t: [0], x: [x[i]], y: [y[i]], vx: [vx[i]], vy: [vy[i]] }))
  const events: Collision[] = []

  // 预测只在长度为 HOR 的时间窗内有效，窗口到期时整体重算，这样只需检查少数几个格点 m
  const HOR = 0.25
  const pt = new Float64Array(n * n).fill(Infinity)
  // 每个粒子最早的预测事件
  const nextT = new Float64Array(n).fill(Infinity)
  const nextJ = new Int32Array(n).fill(-1)
  let now = 0

  const predict = (i: number, j: number) => {
    const dx = wrapHalf(x[i] - x[j])
    const dy = wrapHalf(y[i] - y[j])
    const dvx = vx[i] - vx[j]
    const dvy = vy[i] - vy[j]
    const a = dvx * dvx + dvy * dvy
    let best = Infinity
    if (a > 0) {
      const K = Math.ceil(Math.sqrt(a) * HOR + eps) + 1
      for (let mx = -K; mx <= K; mx++) {
        const qx = dx - mx
        for (let my = -K; my <= K; my++) {
          const qy = dy - my
          const b = qx * dvx + qy * dvy
          if (b >= 0) continue
          const c = qx * qx + qy * qy - eps * eps
          const disc = b * b - a * c
          if (disc < 0) continue
          const tau = c <= 0 ? 0 : (-b - Math.sqrt(disc)) / a
          if (tau < best) best = tau
        }
      }
    }
    const v = best <= HOR ? now + best : Infinity
    pt[i * n + j] = v
    pt[j * n + i] = v
  }

  const rowMin = (i: number) => {
    let bt = Infinity
    let bj = -1
    for (let j = 0; j < n; j++) {
      if (j === i) continue
      const v = pt[i * n + j]
      if (v < bt) {
        bt = v
        bj = j
      }
    }
    nextT[i] = bt
    nextJ[i] = bj
  }

  const recomputeAll = () => {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) predict(i, j)
    for (let i = 0; i < n; i++) rowMin(i)
  }

  const advance = (to: number) => {
    const dt = to - now
    if (dt > 0) {
      for (let i = 0; i < n; i++) {
        X[i] += vx[i] * dt
        Y[i] += vy[i] * dt
        x[i] = wrap(X[i])
        y[i] = wrap(Y[i])
      }
    }
    now = to
  }

  recomputeAll()
  let refresh = HOR
  let guard = 0
  while (now < T && guard++ < 2_000_000) {
    let bi = -1
    let bt = Infinity
    for (let i = 0; i < n; i++) {
      if (nextT[i] < bt) {
        bt = nextT[i]
        bi = i
      }
    }
    const stop = Math.min(refresh, T)
    if (bt > stop) {
      advance(stop)
      if (stop >= T) break
      recomputeAll()
      refresh = now + HOR
      continue
    }
    const i = bi
    const j = nextJ[bi]
    advance(bt)
    // 接触时最近像的相对位移恰为 εω（|εω| < ½，取最近像不会出错）
    const rx = wrapHalf(x[i] - x[j])
    const ry = wrapHalf(y[i] - y[j])
    const len = Math.hypot(rx, ry) || 1
    const wx = rx / len
    const wy = ry / len
    const dvw = (vx[i] - vx[j]) * wx + (vy[i] - vy[j]) * wy
    vx[i] -= dvw * wx
    vy[i] -= dvw * wy
    vx[j] += dvw * wx
    vy[j] += dvw * wy
    events.push({
      t: now,
      i,
      j,
      wx,
      wy,
      // 提升到 R² 后两球心之差 = εω + m
      mx: Math.round(X[i] - X[j] - rx),
      my: Math.round(Y[i] - Y[j] - ry),
      cx: wrap(x[j] + rx / 2),
      cy: wrap(y[j] + ry / 2),
    })
    for (const p of [i, j]) {
      const tr = tracks[p]
      tr.t.push(now)
      tr.x.push(x[p])
      tr.y.push(y[p])
      tr.vx.push(vx[p])
      tr.vy.push(vy[p])
    }
    // 重算与 i、j 有关的预测
    for (let q = 0; q < n; q++) {
      if (q !== i) predict(i, q)
      if (q !== j && q !== i) predict(j, q)
    }
    rowMin(i)
    rowMin(j)
    for (let q = 0; q < n; q++) {
      if (q === i || q === j) continue
      if (nextJ[q] === i || nextJ[q] === j) rowMin(q)
      else {
        const a1 = pt[q * n + i]
        const a2 = pt[q * n + j]
        if (a1 < nextT[q]) {
          nextT[q] = a1
          nextJ[q] = i
        }
        if (a2 < nextT[q]) {
          nextT[q] = a2
          nextJ[q] = j
        }
      }
    }
  }
  return { n, eps, T, tracks, events }
}

/** 粒子 p 在时刻 τ 的状态（位置取模 1） */
export function stateAt(tr: Track, tau: number): { x: number; y: number; vx: number; vy: number; seg: number } {
  let lo = 0
  let hi = tr.t.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (tr.t[mid] <= tau) lo = mid
    else hi = mid - 1
  }
  const dt = tau - tr.t[lo]
  return { x: wrap(tr.x[lo] + tr.vx[lo] * dt), y: wrap(tr.y[lo] + tr.vy[lo] * dt), vx: tr.vx[lo], vy: tr.vy[lo], seg: lo }
}
