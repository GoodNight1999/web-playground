// 尾声（3:47–4:06）：标题、适用范围（稀薄硬球气体，环面 d = 2, 3）、文献与致谢。
// 背景是主歌里得到的那个分子，极淡地悬在中央；底部再现前奏那行几何音符。

import { MUSIC_CREDIT, OUTRO, OUTRO_FIELDS, OUTRO_NOTE, OUTRO_REFS, OUTRO_SCOPE } from '../../content'
import { easeOut, glow, smoothstep, text, white } from '../draw'
import { kindOf, recentNotes, shape, type Ctx } from '../ctx'
import { diamond, molGeom } from './common'

export function drawOutro(c: Ctx) {
  const { g, t, v } = c
  const A = c.alpha
  const lt = t - c.start
  const endFade = 1 - smoothstep(c.end - 4, c.end - 1, t)

  // 背景的分子
  const mA = easeOut(lt / 2) * 0.22 * A * endFade
  if (mA > 0.005) {
    const geo = molGeom(v.mol, v.layout, { x: 560, y: 140, w: 800, h: 560 })
    g.strokeStyle = white(mA)
    g.lineWidth = 1
    for (const pts of geo.line.values()) {
      g.beginPath()
      pts.forEach((p, k) => (k === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)))
      g.stroke()
    }
    for (const p of geo.atom) diamond(g, p.x, p.y, 6, white(1.6 * mA))
  }

  const a1 = easeOut((lt - 0.6) / 1.0) * A
  if (a1 > 0.01) {
    g.fillStyle = 'rgba(0,0,0,0.55)'
    g.fillRect(360, 330, 1200, 260)
    text(g, OUTRO.zh, 960, 420, { size: 60, zh: true, weight: 400, align: 'center', color: white(0.96 * a1), tracking: 10 })
    text(g, OUTRO.en, 960, 468, { size: 26, italic: true, weight: 300, align: 'center', color: white(0.6 * a1) })
    glow(g, 960, 420, 420, 0.1 * a1)
  }
  const a2 = easeOut((lt - 3.0) / 1.0) * A
  if (a2 > 0.01) {
    text(g, OUTRO_SCOPE.zh, 960, 540, { size: 24, zh: true, weight: 300, align: 'center', color: white(0.85 * a2) })
    text(g, OUTRO_SCOPE.en, 960, 572, { size: 17, italic: true, weight: 300, align: 'center', color: white(0.5 * a2) })
  }
  const a3 = easeOut((lt - 5.5) / 1.0) * A
  if (a3 > 0.01) {
    text(g, OUTRO_REFS, 960, 660, { size: 19, mono: true, weight: 300, align: 'center', color: white(0.75 * a3) })
    text(g, `${OUTRO_FIELDS.zh}　${OUTRO_FIELDS.en}`, 960, 708, { size: 20, zh: true, weight: 300, align: 'center', color: white(0.7 * a3) })
  }
  const a4 = easeOut((lt - 8.5) / 1.2) * A
  if (a4 > 0.01) {
    text(g, MUSIC_CREDIT, 960, 880, { size: 20, zh: true, weight: 300, align: 'center', color: white(0.62 * a4) })
    text(g, OUTRO_NOTE.zh, 960, 922, { size: 15, zh: true, weight: 300, align: 'center', color: white(0.4 * a4) })
    text(g, OUTRO_NOTE.en, 960, 946, { size: 14, italic: true, weight: 300, align: 'center', color: white(0.34 * a4) })
  }

  // 底部一行几何音符（与前奏呼应）
  for (const n of recentNotes(c.notes, t, 1.4)) {
    if (n.t < c.start) continue
    const age = t - n.t
    const x = 360 + ((n.i * 173) % 1200)
    const y = 1030 + (n.kind === 'low' ? 10 : n.kind === 'high' ? -14 : 0)
    const pop = 1 + 0.8 * Math.exp(-age / 0.08)
    shape(g, kindOf(n, n.i), x, y, (5 + 4 * n.s) * pop, white((1 - age / 1.4) * 0.5 * A * endFade))
  }
}
