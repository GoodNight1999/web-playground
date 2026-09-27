// 主歌（0:53–1:25）：沿虚轴向上的“地下铁”。
// 地面是复平面，铁轨是 Re s = 0、½、1 三条线，站台就是零点 ½ + iγ（精确位置），
// 每个零点在一个强拍上“进站”。两侧墙上的几何体随每个音出现（致敬原版 MV）。

import { HYPOTHESIS } from '../../content'
import { ZETA_ZEROS } from '../../data/zeros.gen'
import { easeOut, glow, hash2, richText, smoothstep, text, trunc, white } from '../draw'
import { kindOf, recentNotes, shape, type Ctx } from '../ctx'

const HORIZON = 455
const F = 780
const CAM_H = 0.9
const Z0 = 0.32
const FAR = 46

function proj(x: number, y: number, z: number) {
  const k = F / (z + Z0)
  return { x: 960 + x * k, y: HORIZON + (CAM_H - y) * k, k }
}

const fog = (z: number) => Math.exp(-Math.max(0, z) / 17)

export function drawTunnel(c: Ctx) {
  const { g, t, tl } = c
  const cam = tl.tunnelCam.at(t)
  const A = c.alpha
  const e = 0.75 + 0.35 * c.fx.energy

  // 横向的枕木与门框：每 1 个单位一根枕木，每 4 个单位一道门框
  for (let w = Math.ceil(cam); w < cam + FAR; w++) {
    const z = w - cam
    if (z < 0.05) continue
    const fa = fog(z) * A
    const l = proj(-0.5, 0, z)
    const r = proj(0.5, 0, z)
    g.fillStyle = white(0.28 * fa * e)
    g.fillRect(l.x, l.y, r.x - l.x, Math.max(1, 0.012 * l.k))
    if (w % 4 === 0) {
      const a = proj(-2.2, 0, z)
      const b = proj(-2.2, 2.6, z)
      const d = proj(2.2, 2.6, z)
      const q = proj(2.2, 0, z)
      g.strokeStyle = white(0.22 * fa * e)
      g.lineWidth = Math.max(1, 0.01 * a.k)
      g.beginPath()
      g.moveTo(a.x, a.y)
      g.lineTo(b.x, b.y)
      g.lineTo(d.x, d.y)
      g.lineTo(q.x, q.y)
      g.stroke()
    }
  }

  // 铁轨：Re s = 0 与 1 为临界带边界，Re s = ½ 为临界线
  for (const [sx, a] of [
    [-0.5, 0.35],
    [0.5, 0.35],
    [0, 0.95],
  ] as const) {
    const n = proj(sx, 0, 0.05)
    const fz = proj(sx, 0, FAR)
    const grad = g.createLinearGradient(n.x, n.y, fz.x, fz.y)
    grad.addColorStop(0, white(a * A * e))
    grad.addColorStop(1, white(0))
    g.strokeStyle = grad
    g.lineWidth = sx === 0 ? 2.2 : 1.2
    g.beginPath()
    g.moveTo(n.x, n.y)
    g.lineTo(fz.x, fz.y)
    g.stroke()
  }

  // 墙上的几何音符：音出现时生成在前方 12 个单位处，随后静止等列车驶过
  for (const n of recentNotes(c.notes, t, 4.5)) {
    if (n.t < c.start) continue
    const wz = tl.tunnelCam.at(n.t) + 9 + hash2(n.i, 3) * 6
    const z = wz - cam
    if (z < 0.1) continue
    const side = hash2(n.i, 1) < 0.5 ? -1 : 1
    const x = side * (1.25 + hash2(n.i, 2) * 0.8)
    const y = n.kind === 'low' ? 0.25 : n.kind === 'high' ? 2.1 + hash2(n.i, 4) * 0.3 : 0.7 + hash2(n.i, 5) * 1.2
    const p = proj(x, y, z)
    const age = t - n.t
    const pop = 1 + 0.9 * Math.exp(-age / 0.07)
    const size = (0.12 + 0.16 * n.s) * p.k * pop
    const a = Math.min(1, 1.3 * fog(z)) * A * (0.75 + 0.25 * Math.exp(-age / 0.4))
    shape(g, kindOf(n, n.i), p.x, p.y, size, white(a))
  }

  // 零点：站台上的圆点，进站瞬间发光，并在上方升起一道光柱
  const passed = tl.tunnelPass
  for (let k = 0; k < ZETA_ZEROS.length; k++) {
    const z = ZETA_ZEROS[k] - cam
    if (z > FAR) break
    if (z < -0.35) continue
    const p = proj(0, 0.02, Math.max(z, 0.02))
    const fa = fog(z) * A
    const passT = passed[k]
    const hit = passT !== undefined && t >= passT ? Math.exp(-(t - passT) / 0.25) : 0
    const r = Math.max(1.5, 0.075 * p.k)
    g.fillStyle = white(Math.min(1, 0.95 * fa + hit))
    g.beginPath()
    g.ellipse(p.x, p.y, r, r * 0.45, 0, 0, Math.PI * 2)
    g.fill()
    glow(g, p.x, p.y, Math.min(260, 1.4 * p.k), (0.35 + hit) * fa)
    if (z < 9) {
      const la = smoothstep(9, 5, z) * smoothstep(-0.35, 0.3, z) * A
      text(g, `${trunc(ZETA_ZEROS[k], 6)}…`, p.x + 22 + 0.1 * p.k, p.y - 0.35 * p.k, {
        size: Math.min(34, 12 + 0.02 * p.k),
        mono: true,
        weight: 300,
        color: white(0.8 * la),
      })
    }
    if (hit > 0.02) {
      const top = proj(0, 3.2, Math.max(z, 0.02))
      g.fillStyle = white(0.5 * hit * A)
      const w = Math.max(2, 0.03 * p.k)
      g.fillRect(p.x - w / 2, top.y, w, p.y - top.y)
    }
  }

  // 开场一句：猜想本身
  const cap = easeOut((t - c.start - 0.3) / 0.6) * (1 - smoothstep(c.start + 5.6, c.start + 6.4, t)) * A
  if (cap > 0.01) {
    richText(g, HYPOTHESIS.zh, 960, 960, { size: 34, zh: true, weight: 400, align: 'center', color: white(0.92 * cap) })
    richText(g, HYPOTHESIS.en, 960, 1004, { size: 22, italic: true, weight: 300, align: 'center', color: white(0.55 * cap) })
  }
}
