// 副歌（1:54–2:24）：ζ(s) 的相位图。
// 12 族等相位线 arg ζ(s) = kπ/6；所有相位线交汇的点就是零点（在 s = 1 处交汇的是极点）。
// 前半段相位线随拍子一族一族出现、镜头缓慢上移；后半段镜头加速，零点逐个在强拍上经过中线。

import { PHASE_NOTE } from '../../content'
import { ZETA_ZEROS } from '../../data/zeros.gen'
import { SONG } from '../../timeline'
import { easeOut, glow, smoothstep, text, trunc, white } from '../draw'
import { kindOf, recentNotes, shape, type Ctx } from '../ctx'
import { PHASE_FAMILIES } from '../visuals'

const SCALE = 150
const CX = 960
const CY = 540

export function drawPhase(c: Ctx) {
  const { g, t, tl, v, f } = c
  const A = c.alpha
  const tc = tl.phaseT.at(t)
  const toX = (s: number) => CX + (s - 0.5) * SCALE
  const toY = (w: number) => CY - (w - tc) * SCALE
  const ph = v.phase

  // 相位线一族一族地出现：前半段每个强拍多一族
  const reveal = c.a.onsets.filter((o) => o.t >= SONG.chorus1 && o.t <= t && o.s >= 0.7).length
  const families = t >= SONG.chorus1b ? PHASE_FAMILIES : Math.min(PHASE_FAMILIES, 4 + reveal)

  // 带形与临界线
  g.fillStyle = white(0.22 * A)
  g.fillRect(toX(0), 0, 1, 1080)
  g.fillRect(toX(1), 0, 1, 1080)
  for (let y = 0; y < 1080; y += 14) g.fillRect(toX(0.5) - 0.5, y, 1.4, 7)

  // 相位线：世界坐标 (σ, t) 直接变换到屏幕
  const tMin = tc - CY / SCALE - 0.5
  const tMax = tc + CY / SCALE + 0.5
  const c0 = Math.max(0, Math.floor(tMin / ph.chunkT))
  const c1 = Math.min(ph.segs[0].length - 1, Math.floor(tMax / ph.chunkT))
  g.save()
  g.setTransform(SCALE, 0, 0, -SCALE, CX - 0.5 * SCALE, CY + tc * SCALE)
  for (let fam = 0; fam < families; fam++) {
    // 按 0, 6, 3, 9, … 的顺序出现，先出现的是 ζ 为正实数 / 负实数的线
    const k = [0, 6, 3, 9, 1, 7, 4, 10, 2, 8, 5, 11][fam]
    const major = k === 0 || k === 6
    g.strokeStyle = white((major ? 0.85 : 0.42) * A * (0.8 + 0.3 * c.fx.energy))
    g.lineWidth = (major ? 1.8 : 1.1) / SCALE
    for (let ci = c0; ci <= c1; ci++) g.stroke(v.phasePaths[k][ci])
  }
  g.restore()
  // 数据只覆盖 −2.5 ≤ σ ≤ 3.5，两侧渐隐
  const fadeL = g.createLinearGradient(toX(ph.sigma0), 0, toX(ph.sigma0 + 0.8), 0)
  fadeL.addColorStop(0, 'rgba(0,0,0,1)')
  fadeL.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = fadeL
  g.fillRect(0, 0, toX(ph.sigma0 + 0.8), 1080)
  const fadeR = g.createLinearGradient(toX(ph.sigma1 - 0.8), 0, toX(ph.sigma1), 0)
  fadeR.addColorStop(0, 'rgba(0,0,0,0)')
  fadeR.addColorStop(1, 'rgba(0,0,0,1)')
  g.fillStyle = fadeR
  g.fillRect(toX(ph.sigma1 - 0.8), 0, 1920 - toX(ph.sigma1 - 0.8), 1080)

  // 极点 s = 1 与平凡零点 s = −2 的标注（只在镜头还在底部时可见）
  if (tc < 4.5) {
    const la = (1 - smoothstep(2.5, 4.5, tc)) * A
    text(g, '极点 pole  s = 1', toX(1) + 16, toY(0) - 12, { size: 16, mono: true, weight: 300, color: white(0.6 * la) })
    text(g, '−2', toX(-2) + 10, toY(0) - 12, { size: 16, mono: true, weight: 300, color: white(0.6 * la) })
  }

  // 零点：经过中线时在强拍上闪光
  for (let k = 0; k < ZETA_ZEROS.length; k++) {
    const y = toY(ZETA_ZEROS[k])
    if (y < -40) break
    if (y > 1120) continue
    const pass = tl.phasePass[k]
    const hit = pass !== undefined && t >= pass ? Math.exp(-(t - pass) / 0.3) : 0
    g.fillStyle = white(A)
    g.beginPath()
    g.arc(toX(0.5), y, 4 + 5 * hit, 0, Math.PI * 2)
    g.fill()
    glow(g, toX(0.5), y, 90 + 160 * hit, (0.35 + 0.8 * hit) * A)
    const la = smoothstep(900, 700, y) * smoothstep(80, 260, y) * A
    if (la > 0.01) text(g, `½ + ${trunc(ZETA_ZEROS[k], 4)}… i`, toX(0.5) + 26, y + 6, { size: 20, mono: true, weight: 300, color: white(0.75 * la) })
  }

  // 两侧的几何音符沿带形边缘排开
  for (const n of recentNotes(c.notes, t, 0.9)) {
    if (n.t < c.start) continue
    const age = t - n.t
    const side = n.i % 2 === 0 ? -1 : 1
    const x = side < 0 ? toX(-3.1) : toX(4.1)
    const y = 120 + ((n.i * 97) % 840)
    const pop = 1 + 0.9 * Math.exp(-age / 0.07)
    shape(g, kindOf(n, n.i), x, y, (6 + 8 * n.s) * pop, white((1 - age / 0.9) * 0.75 * A))
  }

  // 标注
  const la = easeOut((t - c.start - 0.3) / 0.8) * (1 - smoothstep(c.start + 5.5, c.start + 6.5, t)) * A
  if (la > 0.01) f.draw(g, 'arg', 160, 150, { em: 40, alpha: la })
  const na = easeOut((t - c.start - 7) / 0.8) * (1 - smoothstep(c.start + 12.5, c.start + 13.5, t)) * A
  if (na > 0.01) {
    text(g, PHASE_NOTE.zh, 960, 970, { size: 32, zh: true, weight: 400, align: 'center', color: white(0.92 * na) })
    text(g, PHASE_NOTE.en, 960, 1010, { size: 21, italic: true, weight: 300, align: 'center', color: white(0.55 * na) })
  }
}
