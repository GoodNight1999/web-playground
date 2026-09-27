// 尾声（3:47–4:06）：回到一条线。零点沿临界线向上无穷延伸，最后留下问号。
// 尾声的律动与前奏同源，所以底部再现前奏那行几何音符。

import { MUSIC_CREDIT, OUTRO, OUTRO_NOTE } from '../../content'
import { ZETA_ZEROS } from '../../data/zeros.gen'
import { easeOut, glow, smoothstep, text, white } from '../draw'
import { kindOf, recentNotes, shape, type Ctx } from '../ctx'

export function drawOutro(c: Ctx) {
  const { g, t, f } = c
  const A = c.alpha
  const lt = t - c.start

  // 临界线：向上透视收拢，零点越高越小越密
  const rise = lt * 1.6
  const lineA = easeOut(lt / 1.2) * A
  const grad = g.createLinearGradient(0, 1080, 0, 0)
  grad.addColorStop(0, white(0.5 * lineA))
  grad.addColorStop(1, white(0))
  g.fillStyle = grad
  g.fillRect(959.5, 0, 1.2, 1080)
  for (let k = 0; k < ZETA_ZEROS.length; k++) {
    const w = ZETA_ZEROS[k] - rise
    if (w < 0) continue
    const d = 1 - Math.exp(-w / 90)
    const y = 1080 - d * 1060
    if (y < 12) break
    const r = Math.max(0.8, 5 * (1 - d))
    g.fillStyle = white(0.9 * (1 - d) * lineA)
    g.beginPath()
    g.arc(960, y, r, 0, Math.PI * 2)
    g.fill()
  }

  const a1 = easeOut((lt - 1.0) / 1.0) * A
  if (a1 > 0.01) {
    g.fillStyle = 'rgba(0,0,0,0.7)'
    g.fillRect(560, 400, 800, 150)
    f.draw(g, 'final', 960, 475, { em: 76, align: 'center', valign: 'middle', alpha: a1 })
    glow(g, 960, 475, 380, 0.15 * a1)
  }
  const a2 = easeOut((lt - 5.2) / 1.0) * A
  if (a2 > 0.01) {
    text(g, OUTRO.zh, 960, 628, { size: 38, zh: true, weight: 400, align: 'center', color: white(0.92 * a2), tracking: 4 })
    text(g, OUTRO.en, 960, 670, { size: 22, italic: true, weight: 300, align: 'center', color: white(0.55 * a2) })
  }
  const a3 = easeOut((lt - 9) / 1.2) * A
  if (a3 > 0.01) {
    text(g, MUSIC_CREDIT, 960, 900, { size: 20, zh: true, weight: 300, align: 'center', color: white(0.62 * a3) })
    text(g, OUTRO_NOTE.zh, 960, 942, { size: 15, zh: true, weight: 300, align: 'center', color: white(0.4 * a3) })
    text(g, OUTRO_NOTE.en, 960, 966, { size: 14, italic: true, weight: 300, align: 'center', color: white(0.34 * a3) })
  }

  // 底部一行几何音符（与前奏呼应）
  for (const n of recentNotes(c.notes, t, 1.4)) {
    if (n.t < c.start) continue
    const age = t - n.t
    const x = 360 + ((n.i * 173) % 1200)
    const y = 1030 + (n.kind === 'low' ? 10 : n.kind === 'high' ? -14 : 0)
    const pop = 1 + 0.8 * Math.exp(-age / 0.08)
    shape(g, kindOf(n, n.i), x, y, (5 + 4 * n.s) * pop, white((1 - age / 1.4) * 0.5 * A * (1 - smoothstep(c.end - 4, c.end - 1, t))))
  }
}
