// 第二次副歌（2:47–3:47）：素数之音。
// 显式公式 ψ(x) = x − Σ_ρ x^ρ/ρ − log 2π − ½ log(1 − x⁻²)：
// 前半段每个强拍加入一个零点（一段振荡），曲线逐渐逼近素数阶梯；
// 后半段加到 500 个零点，扫描线在强拍上扫过每个素数。

import { PRIMES_NOTE, WAVES_NOTE } from '../../content'
import { ZETA_ZEROS } from '../../data/zeros.gen'
import { primePowerBase, psiExplicit } from '../../math/zeta'
import { countBefore, SONG } from '../../timeline'
import { clamp01, easeInOut, easeOut, glow, lerp, smoothstep, text, trunc, white } from '../draw'
import { kindOf, recentNotes, shape, type Ctx } from '../ctx'

const X0 = 200
const X1 = 1720
const Y0 = 930

/** 精确的 ψ(x)：在素数幂处跳 ln p */
const PSI_STEPS: { n: number; p: number; psi: number }[] = (() => {
  const out: { n: number; p: number; psi: number }[] = []
  let psi = 0
  for (let n = 2; n <= 100; n++) {
    const p = primePowerBase(n)
    if (!p) continue
    psi += Math.log(p)
    out.push({ n, p, psi })
  }
  return out
})()

function psiAt(x: number): number {
  let v = 0
  for (const s of PSI_STEPS) {
    if (s.n > x) break
    v = s.psi
  }
  return v
}

export function drawPrimes(c: Ctx) {
  const { g, t, tl, f } = c
  const A = c.alpha
  const partB = t >= SONG.chorus2b
  // 视窗：前半段 x ∈ [1, 60]，后半段两秒内拉到 [1, 100]
  const z = partB ? easeInOut((t - SONG.chorus2b) / 2) : 0
  const xMax = lerp(60, 100, z)
  const yMax = lerp(60, 100, z)
  const yTop = 360
  const X = (x: number) => X0 + ((x - 1) / (xMax - 1)) * (X1 - X0)
  const Y = (y: number) => Y0 - (y / yMax) * (Y0 - yTop)

  // 用到的零点个数
  const nA = countBefore(tl.waveAdd, t)
  const n = partB ? Math.min(ZETA_ZEROS.length, Math.round(nA + (ZETA_ZEROS.length - nA) * easeInOut((t - SONG.chorus2b) / 3))) : nA

  // 坐标轴
  g.fillStyle = white(0.3 * A)
  g.fillRect(X0, Y0, X1 - X0, 1)
  g.fillRect(X0, yTop - 20, 1, Y0 - yTop + 20)
  f.draw(g, 'psi_label', X0 - 16, yTop - 36, { em: 30, align: 'right', alpha: 0.8 * A })
  f.draw(g, 'x_label', X1 + 18, Y0 + 8, { em: 30, alpha: 0.8 * A })
  for (let x = 10; x <= xMax + 0.01; x += 10) {
    g.fillRect(X(x), Y0, 1, 8)
    text(g, String(x), X(x), Y0 + 32, { size: 16, mono: true, weight: 300, align: 'center', color: white(0.45 * A) })
  }

  // 精确的阶梯（淡）
  g.strokeStyle = white(0.28 * A)
  g.lineWidth = 1
  g.setLineDash([3, 5])
  g.beginPath()
  g.moveTo(X(1), Y(0))
  let prev = 0
  for (const s of PSI_STEPS) {
    if (s.n > xMax) break
    g.lineTo(X(s.n), Y(prev))
    g.lineTo(X(s.n), Y(s.psi))
    prev = s.psi
  }
  g.lineTo(X(xMax), Y(prev))
  g.stroke()
  g.setLineDash([])

  // 显式公式的近似（亮）
  const steps = 900
  g.strokeStyle = white((0.9 + 0.1 * c.fx.energy) * A)
  g.lineWidth = 2
  g.beginPath()
  for (let i = 0; i <= steps; i++) {
    const x = 1.02 + ((xMax - 1.02) * i) / steps
    const y = psiExplicit(x, ZETA_ZEROS, n)
    const px = X(x)
    const py = Math.max(yTop - 40, Math.min(Y0 + 40, Y(y)))
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.stroke()

  if (!partB) drawWaves(c, nA, X)
  else drawScan(c, X, Y)

  // 几何音符沿横轴下方排成一行乐谱
  for (const note of recentNotes(c.notes, t, 1)) {
    if (note.t < c.start) continue
    const age = t - note.t
    const x = X0 + ((note.i * 131) % 1000) / 1000 * (X1 - X0)
    const y = 1010 + (note.kind === 'low' ? 18 : note.kind === 'high' ? -18 : 0)
    const pop = 1 + 0.9 * Math.exp(-age / 0.07)
    shape(g, kindOf(note, note.i), x, y, (5 + 5 * note.s) * pop, white((1 - age) * 0.6 * A))
  }

  // 零点计数
  text(g, `ρ × ${n}`, X1, yTop - 36, { size: 22, mono: true, weight: 300, align: 'right', color: white(0.75 * A) })

  // 公式与说明
  const fa = easeOut((t - c.start - 0.3) / 0.8) * (1 - smoothstep(c.start + 6, c.start + 7, t)) * A
  if (fa > 0.01) f.draw(g, 'psi', 960, 100, { em: 38, align: 'center', valign: 'middle', alpha: fa })
  caption(c, WAVES_NOTE.zh, WAVES_NOTE.en, c.start + 7.2, c.start + 12.5)
  caption(c, PRIMES_NOTE.zh, PRIMES_NOTE.en, SONG.chorus2b + 0.6, SONG.chorus2b + 6)
}

function caption(c: Ctx, zh: string, en: string, from: number, to: number) {
  const a = easeOut((c.t - from) / 0.6) * (1 - smoothstep(to - 0.8, to, c.t)) * c.alpha
  if (a <= 0.01) return
  text(c.g, zh, 960, 90, { size: 32, zh: true, weight: 400, align: 'center', color: white(0.92 * a) })
  text(c.g, en, 960, 128, { size: 21, italic: true, weight: 300, align: 'center', color: white(0.55 * a) })
}

/** 前半段：最近加入的几个零点各自的振荡，像一排琴弦 */
function drawWaves(c: Ctx, nA: number, X: (x: number) => number) {
  const { g, t, tl } = c
  const A = c.alpha
  const rows = 6
  for (let j = 0; j < rows; j++) {
    const k = nA - 1 - j
    if (k < 0) break
    const added = tl.waveAdd[k]
    const age = t - added
    const hit = Math.exp(-age / 0.18)
    const y = 196 + j * 24
    const a = (j === 0 ? 0.95 : 0.5 - j * 0.06) * A
    const gam = ZETA_ZEROS[k]
    const amp = 9 + 6 * hit
    g.strokeStyle = white(Math.min(1, a + 0.4 * hit))
    g.lineWidth = j === 0 ? 1.6 : 1
    g.beginPath()
    for (let i = 0; i <= 500; i++) {
      const x = 1.02 + (58.98 * i) / 500
      // 第 k 个零点（与共轭零点）的贡献 −2 Re(x^ρ/ρ) ∝ −cos(γ ln x − φ)，φ = arg(½ + iγ)
      const w = -Math.cos(gam * Math.log(x) - Math.atan2(gam, 0.5))
      const px = X(x)
      const py = y - amp * w * clamp01(age * 6)
      if (i === 0) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.stroke()
    text(g, `γ = ${trunc(gam, 3)}…`, X0 - 20, y + 5, { size: 15, mono: true, weight: 300, align: 'right', color: white(a * 0.8) })
    if (j === 0 && hit > 0.03) glow(g, X0 - 10, y, 60, 0.6 * hit * A)
  }
}

/** 后半段：扫描线在强拍上扫过每个素数，台阶闪亮并标出素数 */
function drawScan(c: Ctx, X: (x: number) => number, Y: (y: number) => number) {
  const { g, t, tl } = c
  const A = c.alpha
  const xc = tl.primeX.at(t)
  if (t > SONG.chorus2b + 3) {
    g.fillStyle = white(0.35 * A)
    g.fillRect(X(Math.min(xc, 100)), 330, 1, Y0 - 330)
  }
  for (const s of PSI_STEPS) {
    if (s.n > xc) break
    const isP = s.p === s.n
    const hitIdx = isP ? tl.primes.indexOf(s.n) : -1
    const hitT = hitIdx >= 0 ? tl.primeHit[hitIdx] : undefined
    const hit = hitT !== undefined && t >= hitT ? Math.exp(-(t - hitT) / 0.3) : 0
    const x = X(s.n)
    const y = Y(psiAt(s.n))
    if (isP) {
      g.fillStyle = white(Math.min(1, 0.85 + hit) * A)
      g.beginPath()
      g.arc(x, y, 4 + 5 * hit, 0, Math.PI * 2)
      g.fill()
      if (hit > 0.02) {
        g.fillStyle = white(0.55 * hit * A)
        g.fillRect(x - 1.5, y, 3, Y0 - y)
        glow(g, x, y, 150, 0.9 * hit * A)
      }
      text(g, String(s.n), x, Y0 + 58 + (hitIdx % 2) * 22, { size: 18 + 6 * hit, mono: true, weight: 400, align: 'center', color: white((0.75 + 0.25 * hit) * A) })
    } else {
      g.strokeStyle = white(0.5 * A)
      g.lineWidth = 1
      g.beginPath()
      g.arc(x, y, 3, 0, Math.PI * 2)
      g.stroke()
    }
  }
}
