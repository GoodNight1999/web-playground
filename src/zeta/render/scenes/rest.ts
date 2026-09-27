// 副歌后的歇息（2:24–2:47）：反白。阶段总结四句，随后一枚黑色圆球慢慢长大，
// 在乐队重新进入的那一拍吞没画面（致敬原版 MV 的反白与球体段落）。

import { SUMMARY } from '../../content'
import { ZETA_ZEROS } from '../../data/zeros.gen'
import { SONG } from '../../timeline'
import { black, easeOut, richText, smoothstep, type TextOpts } from '../draw'
import type { Ctx } from '../ctx'

export function drawRest(c: Ctx) {
  const { g, t, tl } = c
  // 白底（由黑转白），在球体吞没前保持
  const white = easeOut((t - c.start) / 0.35)
  g.fillStyle = `rgba(255,255,255,${white})`
  g.fillRect(0, 0, 1920, 1080)
  const A = white

  // 一列零点：临界线上前 200 个零点，缓慢上升
  const cx = 700
  const drift = (t - c.start) * 3.2
  g.fillStyle = black(0.5 * A)
  g.fillRect(cx - 0.5, 0, 1, 1080)
  for (let k = 0; k < 200; k++) {
    const y = 1000 - (ZETA_ZEROS[k] - drift) * 6
    if (y < -10) break
    if (y > 1090) continue
    g.fillStyle = black(0.85 * A)
    g.beginPath()
    g.arc(cx, y, 3, 0, Math.PI * 2)
    g.fill()
  }

  // 阶段总结：新的一句清晰，之前的变淡
  const fade = 1 - smoothstep(159.6, 161.2, t)
  tl.summary.forEach((at, i) => {
    const a = easeOut((t - at) / 0.5) * fade * A
    if (a <= 0.01) return
    const newest = i === tl.summary.length - 1 || t < tl.summary[i + 1]
    const k = newest ? 1 : 0.45
    const y = 360 + i * 115
    const last = i === SUMMARY.length - 1
    const zo: TextOpts = { size: last ? 48 : 38, zh: true, weight: last ? 600 : 400, color: black(0.92 * a * k) }
    richText(g, SUMMARY[i].zh, 780, y, zo)
    richText(g, SUMMARY[i].en, 780, y + 40, { size: 22, italic: true, weight: 300, color: black(0.55 * a * k) })
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
