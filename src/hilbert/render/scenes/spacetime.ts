// 主歌后半（1:09–1:25）：时空 T² × [t₀, T] 里的世界线（竖直方向是时间）。
// 根粒子碰撞历史里的 12 条世界线在强拍上逐条点亮，碰撞点是菱形原子；
// 随后做拓扑约化：丢掉精确的位置、速度与时刻，只留下组合结构——分子。时间层是水平的细线。

import { SPACETIME } from '../../content'
import { stateAt } from '../../math/hardspheres'
import { GAS_A } from '../visuals'
import { easeInOut, easeOut, glow, text, white } from '../draw'
import type { Ctx } from '../ctx'
import { caption, diamond, molGeom, span, title, type Rect } from './common'

/** 约化后分子的位置（切割一段沿用同一个版面） */
export const MOL_RECT: Rect = { x: 420, y: 190, w: 1080, h: 660 }

type P3 = { x: number; y: number; z: number }

function camera(t: number, start: number) {
  const th = 0.55 + 0.1 * (t - start)
  const el = 0.32
  return { cos: Math.cos(th), sin: Math.sin(th), ce: Math.cos(el), se: Math.sin(el) }
}

/** (x, y) ∈ [0,1]²，τ ∈ [t0, T] → 屏幕坐标（竖直方向为时间，向上为晚） */
function project(cam: ReturnType<typeof camera>, x: number, y: number, tau: number): P3 {
  const X = (x - 0.5) * 1.0
  const Z = (y - 0.5) * 1.0
  const Yv = ((tau - GAS_A.t0) / (GAS_A.T - GAS_A.t0) - 0.5) * 1.35
  const rx = X * cam.cos - Z * cam.sin
  const rz = X * cam.sin + Z * cam.cos
  const ry = Yv * cam.ce - rz * cam.se
  const depth = rz * cam.ce + Yv * cam.se
  const k = 900 / (2.6 + depth)
  return { x: 960 + rx * k, y: 540 - ry * k, z: depth }
}

export function drawSpacetime(c: Ctx) {
  const { g, t, tl, v } = c
  const A = c.alpha
  const sim = v.simA
  const mol = v.mol
  const cam = camera(t, c.start)
  const { t0, T } = GAS_A
  const u = easeInOut((t - tl.morph) / 2.2)
  const geo = molGeom(mol, v.layout, MOL_RECT)

  // 盒子线框，约化时淡出
  const boxA = easeOut((t - c.start) / 0.6) * (1 - u) * A
  if (boxA > 0.01) {
    g.strokeStyle = white(0.2 * boxA)
    g.lineWidth = 1
    const cs: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
    g.beginPath()
    for (const tau of [t0, T]) {
      cs.forEach(([x, y], k) => {
        const p = project(cam, x, y, tau)
        if (k === 0) g.moveTo(p.x, p.y)
        else g.lineTo(p.x, p.y)
      })
      g.closePath()
    }
    for (const [x, y] of cs) {
      const a = project(cam, x, y, t0)
      const b = project(cam, x, y, T)
      g.moveTo(a.x, a.y)
      g.lineTo(b.x, b.y)
    }
    g.stroke()
    const lb = project(cam, 0, 0, t0)
    const lt = project(cam, 0, 0, T)
    text(g, `t = ${t0.toFixed(1)}`, lb.x - 18, lb.y + 6, { size: 16, mono: true, weight: 300, align: 'right', color: white(0.5 * boxA) })
    text(g, `t = ${T.toFixed(1)}`, lt.x - 18, lt.y + 6, { size: 16, mono: true, weight: 300, align: 'right', color: white(0.5 * boxA) })
  }

  // 背景：其余粒子的世界线（很淡）
  const inMol = new Set(mol.lines.keys())
  const bgA = 0.1 * easeOut((t - c.start) / 1.2) * (1 - u) * A
  if (bgA > 0.004) {
    g.strokeStyle = white(bgA)
    g.lineWidth = 1
    g.beginPath()
    for (let p = 0; p < sim.n; p++) {
      if (inMol.has(p)) continue
      let prev: ReturnType<typeof stateAt> | null = null
      for (let k = 0; k <= 36; k++) {
        const tau = t0 + ((T - t0) * k) / 36
        const s = stateAt(sim.tracks[p], tau)
        const q = project(cam, s.x, s.y, tau)
        if (prev && Math.abs(s.x - prev.x) < 0.5 && Math.abs(s.y - prev.y) < 0.5) g.lineTo(q.x, q.y)
        else g.moveTo(q.x, q.y)
        prev = s
      }
    }
    g.stroke()
  }

  // 分子的粒子线：3D 世界线 ↔ 平面图，按 u 插值
  const lines = [...mol.lines.keys()]
  const roots = new Set(mol.roots)
  lines.forEach((p, li) => {
    const hitT = tl.lineHit[li] ?? c.start
    const on = easeOut((t - hitT) / 0.35)
    if (on <= 0.01) return
    const flash = Math.exp(-Math.max(0, t - hitT) / 0.25)
    const pts = geo.line.get(p)!
    const ids = mol.lines.get(p)!
    // 关键时刻：底端 t0、各原子、顶端
    const lastT = mol.atoms[ids[ids.length - 1]].t
    const keys = [t0, ...ids.map((id) => mol.atoms[id].t), roots.has(p) ? T : Math.min(T, lastT + 0.07)]
    g.strokeStyle = white((0.5 + 0.4 * flash + (roots.has(p) ? 0.1 : 0)) * on * A)
    g.lineWidth = roots.has(p) ? 2.2 : 1.5
    g.beginPath()
    let prevS: { x: number; y: number } | null = null
    for (let k = 0; k + 1 < keys.length; k++) {
      const N = 10
      for (let j = 0; j <= N; j++) {
        if (k > 0 && j === 0) continue
        const w = j / N
        const tau = keys[k] + (keys[k + 1] - keys[k]) * w
        const s = stateAt(sim.tracks[p], Math.min(tau, T))
        const q3 = project(cam, s.x, s.y, tau)
        const qx = pts[k].x + (pts[k + 1].x - pts[k].x) * w
        const qy = pts[k].y + (pts[k + 1].y - pts[k].y) * w
        const x = q3.x + (qx - q3.x) * u
        const y = q3.y + (qy - q3.y) * u
        const wrapped = !!prevS && (Math.abs(s.x - prevS.x) > 0.5 || Math.abs(s.y - prevS.y) > 0.5) && u < 0.5
        if (!prevS || wrapped) g.moveTo(x, y)
        else g.lineTo(x, y)
        prevS = s
      }
    }
    g.stroke()
  })

  // 原子：3D 中在碰撞点，约化后在平面图上
  for (const a of mol.atoms) {
    const li = Math.max(lines.indexOf(a.p[0]), lines.indexOf(a.p[1]))
    const hitT = tl.lineHit[li] ?? c.start
    const on = easeOut((t - hitT) / 0.3)
    if (on <= 0.01) continue
    const q3 = project(cam, a.ev.cx, a.ev.cy, a.t)
    const q2 = geo.atom[a.id]
    const x = q3.x + (q2.x - q3.x) * u
    const y = q3.y + (q2.y - q3.y) * u
    const flash = Math.exp(-Math.max(0, t - hitT) / 0.25)
    diamond(g, x, y, 7 + 3 * u + 5 * flash, white((0.85 + 0.15 * flash) * on * A))
    if (flash > 0.02) glow(g, x, y, 90, 0.6 * flash * A)
  }

  // 约化之后：时间层（水平细线）逐层出现
  const r = MOL_RECT
  const L = GAS_A.layers
  for (let l = 0; l <= L; l++) {
    const at = l === 0 ? tl.morph + 1.6 : (tl.layerHit[l - 1] ?? tl.morph + 1.8 + l * 0.35)
    const a = easeOut((t - at) / 0.3) * u * A
    if (a <= 0.01) continue
    const y = r.y + (1 - l / L) * r.h
    g.fillStyle = white((l === 0 || l === L ? 0.35 : 0.14) * a)
    g.fillRect(r.x - 60, y, r.w + 120, 1)
    if (l === 0 || l === L) {
      text(g, l === 0 ? 't₀' : 'T', r.x - 76, y + 6, { size: 20, italic: true, weight: 300, align: 'right', color: white(0.6 * a) })
    }
  }
  const tauA = span(t, tl.morph + 3.2) * A
  text(g, `τ = ${GAS_A.tau}`, r.x + r.w + 76, r.y + r.h / GAS_A.layers + 6, { size: 17, mono: true, weight: 300, color: white(0.5 * tauA) })
  if (tauA > 0.01) {
    const y0 = r.y
    const y1 = r.y + r.h / GAS_A.layers
    g.fillStyle = white(0.4 * tauA)
    g.fillRect(r.x + r.w + 66, y0, 1, y1 - y0)
  }

  // 标题与说明
  title(g, SPACETIME.title, span(t, c.start + 0.2, tl.morph + 0.8))
  title(g, SPACETIME.layers, span(t, tl.morph + 1.2))
  SPACETIME.reduce.forEach((b, k) => {
    const a = span(t, tl.morph + 0.3 + k * 0.7, c.end - 0.1) * A
    caption(g, b, 480 + k * 480, 960, a, { size: 24 })
  })
  const nA = span(t, tl.morph + 3.6) * A
  if (nA > 0.01) {
    text(g, `${mol.atoms.length} atoms · ${mol.lines.size} particle lines · ${mol.bonds} bonds · ρ = ${mol.rho}`, 1800, 110, {
      size: 17,
      mono: true,
      weight: 300,
      align: 'right',
      color: white(0.55 * nA),
    })
  }
}
