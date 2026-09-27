// 背景流线：二维无散度速度场（由流函数求导得到）里的示踪粒子。
// 每个粒子有固定寿命，位置只由“出生时刻 + 固定步长积分”决定，
// 所以任意跳转时间、实时播放和逐帧导出得到的画面完全一致。

import { H, W, blue, hash2, ink, rng } from './draw'

const DT = 1 / 30
const TRAIL = 14

type Mode = { kx: number; ky: number; amp: number; w: number; ph: number }

type P = {
  life: number
  phase: number
  bright: boolean
  gen: number
  steps: number
  x: number
  y: number
  trail: Float32Array
}

export class FlowField {
  private modes: Mode[] = []
  private ps: P[] = []
  private speed: (t: number) => number

  constructor(count: number, speed: (t: number) => number, seed = 7) {
    this.speed = speed
    const r = rng(seed)
    for (let i = 0; i < 5; i++) {
      const lambda = 520 + r() * 900
      const ang = r() * Math.PI * 2
      const k = (2 * Math.PI) / lambda
      this.modes.push({ kx: Math.cos(ang) * k, ky: Math.sin(ang) * k, amp: (26 + r() * 30) / k, w: 0.05 + r() * 0.12, ph: r() * 10 })
    }
    for (let i = 0; i < count; i++) {
      this.ps.push({
        life: 4.5 + r() * 3,
        phase: r() * 8,
        bright: r() < 0.14,
        gen: -1,
        steps: 0,
        x: 0,
        y: 0,
        trail: new Float32Array(TRAIL * 2),
      })
    }
  }

  private vel(x: number, y: number, t: number, out: [number, number]) {
    // u = ∂ψ/∂y, v = -∂ψ/∂x，外加一个匀速漂移；两者都无散度
    let u = 22
    let v = 0
    for (const m of this.modes) {
      const c = Math.cos(m.kx * x + m.ky * y + m.w * t + m.ph) * m.amp
      u += c * m.ky
      v -= c * m.kx
    }
    out[0] = u
    out[1] = v
  }

  private step(p: P, t: number, tmp: [number, number]) {
    const s = this.speed(t)
    this.vel(p.x, p.y, t, tmp)
    const mx = p.x + tmp[0] * s * DT * 0.5
    const my = p.y + tmp[1] * s * DT * 0.5
    this.vel(mx, my, t + DT / 2, tmp)
    p.x += tmp[0] * s * DT
    p.y += tmp[1] * s * DT
    p.trail.copyWithin(0, 2)
    p.trail[TRAIL * 2 - 2] = p.x
    p.trail[TRAIL * 2 - 1] = p.y
  }

  private advance(p: P, i: number, t: number, tmp: [number, number]) {
    const gen = Math.floor((t + p.phase) / p.life)
    const born = gen * p.life - p.phase
    const target = Math.floor((t - born) / DT)
    if (gen !== p.gen || target < p.steps) {
      p.gen = gen
      p.steps = 0
      p.x = -120 + hash2(i, gen * 2) * (W + 240)
      p.y = -80 + hash2(i, gen * 2 + 1) * (H + 160)
      for (let k = 0; k < TRAIL; k++) {
        p.trail[k * 2] = p.x
        p.trail[k * 2 + 1] = p.y
      }
    }
    while (p.steps < target) {
      this.step(p, born + p.steps * DT, tmp)
      p.steps++
    }
    return (t - born) / p.life
  }

  /** alpha：整体不透明度；glow：随起音的瞬时增亮 */
  draw(g: CanvasRenderingContext2D, t: number, alpha: number, glow: number) {
    if (alpha <= 0.01) return
    const tmp: [number, number] = [0, 0]
    const buckets = 4
    // 按 [颜色][寿命亮度档][拖尾段] 分组，批量描边
    const paths: Path2D[][][] = [0, 1].map(() =>
      Array.from({ length: buckets }, () => Array.from({ length: TRAIL - 1 }, () => new Path2D())),
    )
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i]
      const age = this.advance(p, i, t, tmp)
      const env = Math.sin(Math.PI * Math.min(1, Math.max(0, age))) ** 0.8
      const b = Math.min(buckets - 1, Math.floor(env * buckets))
      const set = paths[p.bright ? 1 : 0][b]
      const tr = p.trail
      for (let k = 0; k < TRAIL - 1; k++) {
        const x0 = tr[k * 2]
        const y0 = tr[k * 2 + 1]
        const x1 = tr[k * 2 + 2]
        const y1 = tr[k * 2 + 3]
        if (x0 === x1 && y0 === y1) continue
        set[k].moveTo(x0, y0)
        set[k].lineTo(x1, y1)
      }
    }
    g.lineCap = 'round'
    for (let c = 0; c < 2; c++) {
      for (let b = 0; b < buckets; b++) {
        for (let k = 0; k < TRAIL - 1; k++) {
          const segA = ((k + 1) / (TRAIL - 1)) ** 1.4
          const a = alpha * ((b + 0.5) / buckets) * segA * (c ? 0.75 : 0.42) * (0.8 + 0.5 * glow)
          g.strokeStyle = c ? ink(a) : blue(a)
          g.lineWidth = c ? 1.3 : 1.05
          g.stroke(paths[c][b][k])
        }
      }
    }
  }

  reset() {
    for (const p of this.ps) p.gen = -1
  }
}
