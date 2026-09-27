// 副歌后的歇息（2:24–2:47）：反白。阶段总结四句；左边是主歌里得到的分子（黑线），缓缓上移。
// 随后一枚黑色圆球慢慢长大，在乐队重新进入的那一拍吞没画面（致敬原版 MV 的反白与球体段落）。

import { SUMMARY } from '../../content'
import { SONG } from '../../timeline'
import { black, easeOut, measure, richText, smoothstep, type TextOpts } from '../draw'
import type { Ctx } from '../ctx'
import { diamond, molGeom } from './common'

export function drawRest(c: Ctx) {
  const { g, t, tl, v, f } = c
  // 白底（由黑转白），在球体吞没前保持
  const white = easeOut((t - c.start) / 0.35)
  g.fillStyle = `rgba(255,255,255,${white})`
  g.fillRect(0, 0, 1920, 1080)
  const A = white

  // 分子：黑色线稿
  const drift = (t - c.start) * 6
  const geo = molGeom(v.mol, v.layout, { x: 150, y: 230 - drift, w: 440, h: 640 })
  g.strokeStyle = black(0.55 * A)
  g.lineWidth = 1.2
  for (const pts of geo.line.values()) {
    g.beginPath()
    pts.forEach((p, k) => (k === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)))
    g.stroke()
  }
  for (const p of geo.atom) diamond(g, p.x, p.y, 6, black(0.85 * A))

  // 阶段总结：新的一句清晰，之前的变淡
  const fade = 1 - smoothstep(159.6, 161.2, t)
  tl.summary.forEach((at, i) => {
    const a = easeOut((t - at) / 0.5) * fade * A
    if (a <= 0.01) return
    const newest = i === tl.summary.length - 1 || t < tl.summary[i + 1]
    const k = newest ? 1 : 0.45
    const y = 330 + i * 130
    const s = SUMMARY[i]
    const zo: TextOpts = { size: 38, zh: true, weight: i === 0 ? 600 : 400, color: black(0.92 * a * k) }
    richText(g, s.zh, 760, y, zo)
    richText(g, s.en, 760, y + 40, { size: 22, italic: true, weight: 300, color: black(0.55 * a * k) })
    if (s.formula) f.draw(g, s.formula, 760 + measure(g, s.zh, zo) + 36, y - 12, { em: 32, color: 'black', valign: 'middle', alpha: a * k })
  })

  // 黑色圆球：先缓慢长大，最后一拍前迅速铺满
  const s0 = 159.8
  if (t > s0) {
    const slow = 4 + (t - s0) * 16
    const rush = smoothstep(SONG.chorus2 - 0.35, SONG.chorus2, t)
    const r = slow + rush * 1300
    g.fillStyle = black(1)
    g.beginPath()
    g.arc(960, 540, r, 0, Math.PI * 2)
    g.fill()
  }
}
