// 副歌一后半（2:09–2:24）：环面上的新现象（arXiv:2503.01800 §1.4）。
// 把 T^d 展开到 R^d：两粒子相对位置 x − x′ + t(v − v′) 走一条直线，碰撞 ⇔ 直线碰到某个格点 m ∈ Z^d 周围半径 ε 的圆盘。
// 在 R^d 中同一对粒子不会紧接着再碰一次；在环面上会——当且仅当相对速度的方向几乎平行于某个 m ≠ 0。
// 每条射线的首次命中都按几何精确计算；圆盘半径放大到 ε = 0.06 以便看清（画面上注明）。

import { TORUS } from '../../content'
import { rng } from '../../math/rng'
import { easeOut, glow, text, white } from '../draw'
import type { Ctx } from '../ctx'
import { caption, diamond, span, title } from './common'

const O = { x: 600, y: 590 }
const LP = 104
const EPS = 0.06
const CLIP = { x0: 90, x1: 1110, y0: 190, y1: 1000 }

type Ray = { dx: number; dy: number; len: number; hit: [number, number] | null }

function firstHit(dx: number, dy: number): { len: number; hit: [number, number] | null } {
  // 视野内的最远距离（格点单位）
  let best = Infinity
  let hit: [number, number] | null = null
  for (let mx = -12; mx <= 12; mx++)
    for (let my = -10; my <= 10; my++) {
      if (mx === 0 && my === 0) continue
      const s = mx * dx + my * dy
      if (s <= 0) continue
      const perp = Math.abs(mx * dy - my * dx)
      if (perp > EPS) continue
      const at = s - Math.sqrt(EPS * EPS - perp * perp)
      const sx = O.x + mx * LP
      const sy = O.y - my * LP
      if (sx < CLIP.x0 || sx > CLIP.x1 || sy < CLIP.y0 || sy > CLIP.y1) continue
      if (at < best) {
        best = at
        hit = [mx, my]
      }
    }
  if (hit) return { len: best, hit }
  // 没有命中：射到视野边缘
  const tx = dx > 0 ? (CLIP.x1 - O.x) / (dx * LP) : dx < 0 ? (CLIP.x0 - O.x) / (dx * LP) : Infinity
  const ty = dy > 0 ? (O.y - CLIP.y0) / (dy * LP) : dy < 0 ? (O.y - CLIP.y1) / (dy * LP) : Infinity
  return { len: Math.min(tx, ty), hit: null }
}

function makeRays(): Ray[] {
  const r = rng(2503)
  // 一半瞄准某个小整数向量 m（偏离量小于 ε/|m|），一半随机方向
  const targets: [number, number][] = [[1, 2], [3, 1], [-2, 1], [1, -1], [2, 3], [-1, -3], [4, 1], [-3, 2]]
  const out: Ray[] = []
  for (let k = 0; k < 16; k++) {
    let ang: number
    if (k % 2 === 0) {
      const [mx, my] = targets[(k / 2) % targets.length]
      const n = Math.hypot(mx, my)
      ang = Math.atan2(my, mx) + (r() - 0.5) * 1.4 * (EPS / n)
    } else ang = r() * Math.PI * 2
    const dx = Math.cos(ang)
    const dy = Math.sin(ang)
    out.push({ dx, dy, ...firstHit(dx, dy) })
  }
  return out
}

const RAYS = makeRays()

/** 射线从原点长到终点所用的秒数 */
const rayDur = (ray: Ray) => 0.3 * Math.max(1, ray.len / 8)

export function drawTorus(c: Ctx) {
  const { g, t, tl, f } = c
  const A = c.alpha
  title(g, TORUS.title, span(t, c.start + 0.2) * A)

  // 格点与 ε 圆盘
  const la = easeOut((t - c.start) / 0.6) * A
  const litUntil = new Map<string, number>()
  RAYS.forEach((ray, i) => {
    const at = tl.rayHit[i]
    if (at === undefined || !ray.hit) return
    const reach = at + rayDur(ray)
    if (t >= reach) litUntil.set(ray.hit.join(','), reach)
  })
  // 方向扇区：命中圆盘 m 的方向集合，角宽约 2ε/|m|
  const secA = span(t, tl.torusNote[0] - 1.6) * A
  if (secA > 0.01) {
    g.save()
    g.beginPath()
    g.rect(CLIP.x0 - 40, CLIP.y0 - 40, CLIP.x1 - CLIP.x0 + 80, CLIP.y1 - CLIP.y0 + 80)
    g.clip()
    g.fillStyle = white(0.035 * secA)
    for (let mx = -6; mx <= 6; mx++)
      for (let my = -4; my <= 4; my++) {
        if (mx === 0 && my === 0) continue
        const n = Math.hypot(mx, my)
        const a0 = Math.atan2(-my, mx)
        const w = Math.asin(Math.min(1, EPS / n))
        g.beginPath()
        g.moveTo(O.x, O.y)
        g.arc(O.x, O.y, 1400, a0 - w, a0 + w)
        g.closePath()
        g.fill()
      }
    g.restore()
  }
  for (let mx = -6; mx <= 6; mx++)
    for (let my = -4; my <= 4; my++) {
      const x = O.x + mx * LP
      const y = O.y - my * LP
      if (x < CLIP.x0 || x > CLIP.x1 || y < CLIP.y0 || y > CLIP.y1) continue
      const origin = mx === 0 && my === 0
      const lit = litUntil.get(`${mx},${my}`)
      const hit = lit !== undefined ? Math.exp(-(t - lit) / 0.3) : 0
      g.strokeStyle = white((origin ? 0.95 : lit !== undefined ? 0.9 : 0.35) * la)
      g.lineWidth = 1.2
      g.beginPath()
      g.arc(x, y, EPS * LP, 0, Math.PI * 2)
      g.stroke()
      if (origin || lit !== undefined) {
        g.fillStyle = white((origin ? 0.9 : 0.5 + 0.5 * hit) * la)
        g.fill()
      } else {
        g.fillStyle = white(0.35 * la)
        g.fillRect(x - 0.5, y - 0.5, 1, 1)
      }
      if (hit > 0.02) glow(g, x, y, 120, 0.8 * hit * A)
      if (lit !== undefined) {
        text(g, `m = (${mx}, ${my})`, x + 12, y - 12, { size: 14, mono: true, weight: 300, color: white(0.7 * la) })
      }
    }
  text(g, '0', O.x - 14, O.y + 22, { size: 15, mono: true, weight: 300, align: 'right', color: white(0.6 * la) })

  // 射线：相对位置的直线轨迹
  RAYS.forEach((ray, i) => {
    const at = tl.rayHit[i]
    if (at === undefined || t < at) return
    const grow = Math.min(1, (t - at) / rayDur(ray))
    const flash = Math.exp(-(t - at) / 0.3)
    const x0 = O.x + ray.dx * EPS * LP
    const y0 = O.y - ray.dy * EPS * LP
    const L = ray.len * grow * LP
    const x1 = O.x + ray.dx * L
    const y1 = O.y - ray.dy * L
    g.strokeStyle = white((ray.hit ? 0.55 : 0.2) * A + 0.4 * flash * A)
    g.lineWidth = ray.hit ? 1.5 : 1
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.stroke()
    if (grow < 1) glow(g, x1, y1, 50, 0.7 * A)
  })
  text(g, `ε = ${EPS}（示意，放大）`, CLIP.x0, CLIP.y1 + 34, { size: 15, zh: true, weight: 300, color: white(0.45 * la) })

  // 右栏
  const RX = 1220
  const W = 600
  f.draw(g, 'lattice', RX, 250, { em: 30, valign: 'middle', alpha: span(t, c.start + 0.6) * A })
  let y = 350
  y += caption(g, TORUS.twice, RX, y, span(t, c.start + 1.6) * A, { size: 24, align: 'left', maxWidth: W }) + 34
  caption(g, TORUS.measure, RX, y, span(t, tl.torusNote[0] - 1.6) * A, { size: 22, align: 'left', maxWidth: W })
  caption(g, TORUS.bfk, RX, 590, span(t, tl.torusNote[0]) * A, { size: 22, align: 'left', maxWidth: W })
  const lA = span(t, tl.torusNote[1]) * A
  caption(g, TORUS.long, RX, 730, lA, { size: 22, align: 'left', maxWidth: W })
  f.draw(g, 'longbond', RX + 400, 718, { em: 26, valign: 'middle', alpha: lA })
  const kA = span(t, tl.torusNote[2]) * A
  if (kA > 0.01) {
    text(g, '(♣)', RX, 862, { size: 22, weight: 400, color: white(0.9 * kA) })
    text(g, `${TORUS.club.zh}`, RX + 52, 862, { size: 22, zh: true, weight: 400, color: white(0.92 * kA) })
    f.draw(g, 'club', RX + 250, 856, { em: 28, valign: 'middle', alpha: kA })
    text(g, TORUS.club.en, RX + 52, 890, { size: 15, italic: true, weight: 300, color: white(0.5 * kA) })
    // 新增的初等分子 {333A}（链）与 {334T}（三角形）
    const gx = RX + 60
    const gy = 950
    drawMini(g, gx, gy, false, kA)
    text(g, '{333A}', gx + 58, gy + 6, { size: 16, mono: true, weight: 300, color: white(0.7 * kA) })
    drawMini(g, gx + 230, gy, true, kA)
    text(g, '{334T}', gx + 288, gy + 6, { size: 16, mono: true, weight: 300, color: white(0.7 * kA) })
  }
}

/** 三个原子的小图：链（两条键）或三角形（三条键） */
function drawMini(g: CanvasRenderingContext2D, x: number, y: number, tri: boolean, a: number) {
  const p = [
    [x - 18, y + 16],
    [x, y - 16],
    [x + 18, y + 16],
  ]
  g.strokeStyle = white(0.7 * a)
  g.lineWidth = 1.3
  g.beginPath()
  g.moveTo(p[0][0], p[0][1])
  g.lineTo(p[1][0], p[1][1])
  g.lineTo(p[2][0], p[2][1])
  if (tri) g.closePath()
  g.stroke()
  for (const [px, py] of p) diamond(g, px, py, 6, white(0.9 * a))
}
