// 第二主题（1:25–1:54）：ζ(½ + it) 在复平面上的轨迹。
// 曲线每穿过一次原点，就是一个零点；穿过的瞬间对准强拍。同心圆致敬原版 MV。

import { ZETA_ZEROS } from '../../data/zeros.gen'
import { easeOut, glow, hash2, smoothstep, text, trunc, white } from '../draw'
import { kindOf, recentNotes, shape, type Ctx } from '../ctx'

const OX = 960
const OY = 540
const SCALE = 118

export function drawSpiral(c: Ctx) {
  const { g, t, tl, v, f } = c
  const A = c.alpha
  const tNow = Math.max(0, Math.min(tl.spiralT.at(t), (v.spiral.pts.length / 2 - 1) * v.spiral.dt))
  const zoom = 1 + 0.012 * c.fx.low
  const S = SCALE * zoom
  const passes = tl.spiralPass

  // 同心圆与坐标轴
  g.lineWidth = 1
  for (const r of [0.5, 1, 2, 3, 4]) {
    g.strokeStyle = white((r === 1 ? 0.2 : 0.1) * A)
    g.beginPath()
    g.arc(OX, OY, r * S, 0, Math.PI * 2)
    g.stroke()
  }
  g.fillStyle = white(0.18 * A)
  g.fillRect(OX - 4.6 * S, OY, 9.2 * S, 1)
  g.fillRect(OX, OY - 4.4 * S, 1, 8.8 * S)
  for (let i = -4; i <= 4; i++) if (i) g.fillRect(OX + i * S, OY - 4, 1, 8)

  // 穿过原点时的冲击波
  for (let k = 0; k < passes.length; k++) {
    const age = t - passes[k]
    if (age < 0 || age > 1.6) continue
    const r = (0.1 + 4.6 * easeOut(age / 1.6)) * S
    g.strokeStyle = white(0.6 * (1 - age / 1.6) * A)
    g.lineWidth = 1.5
    g.beginPath()
    g.arc(OX, OY, r, 0, Math.PI * 2)
    g.stroke()
  }

  // 外圈的几何音符：像一圈环形乐谱
  for (const n of recentNotes(c.notes, t, 1.2)) {
    if (n.t < c.start) continue
    const age = t - n.t
    const ang = hash2(n.i, 7) * Math.PI * 2
    const r = (n.kind === 'low' ? 4.35 : n.kind === 'high' ? 4.75 : 4.55) * S
    const x = OX + Math.cos(ang) * r
    const y = OY + Math.sin(ang) * r
    const pop = 1 + 0.9 * Math.exp(-age / 0.07)
    shape(g, kindOf(n, n.i), x, y, (5 + 6 * n.s) * pop, white((1 - age / 1.2) * 0.8 * A), ang)
  }

  // 曲线：走过的部分较暗，最近 2.5 个单位较亮，笔尖发光
  const pts = v.spiral.pts
  const dt = v.spiral.dt
  const iNow = Math.floor(tNow / dt)
  const iRecent = Math.max(0, Math.floor((tNow - 2.5) / dt))
  const X = (i: number) => OX + pts[i * 2] * S
  const Y = (i: number) => OY - pts[i * 2 + 1] * S
  g.lineJoin = 'round'
  g.strokeStyle = white(0.32 * A)
  g.lineWidth = 1.1
  g.beginPath()
  g.moveTo(X(0), Y(0))
  for (let i = 1; i <= iRecent; i += 2) g.lineTo(X(i), Y(i))
  g.stroke()
  g.strokeStyle = white(0.95 * A)
  g.lineWidth = 2.2
  g.beginPath()
  g.moveTo(X(iRecent), Y(iRecent))
  for (let i = iRecent + 1; i <= iNow; i++) g.lineTo(X(i), Y(i))
  g.stroke()
  glow(g, X(iNow), Y(iNow), 70, 0.9 * A)

  // 原点处的零点标记与数值
  for (let k = 0; k < passes.length; k++) {
    const age = t - passes[k]
    if (age < 0) break
    const a = Math.exp(-age / 1.1) * A
    if (a < 0.02) continue
    glow(g, OX, OY, 160, 0.8 * a)
    text(g, `t = ${trunc(ZETA_ZEROS[k], 6)}…`, OX + 26, OY - 26, { size: 22, mono: true, weight: 300, color: white(0.9 * a) })
  }

  // 开场标出函数
  const la = easeOut((t - c.start - 0.2) / 0.8) * (1 - smoothstep(c.start + 6, c.start + 7, t)) * A
  if (la > 0.01) f.draw(g, 'zeta_line', 160, 150, { em: 44, alpha: la })
}
