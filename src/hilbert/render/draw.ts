// 画布基础：尺寸、配色、字体、缓动与文字排版。

export const W = 1920
export const H = 1080

// 参照原版 MV：纯黑白，不用彩色
export const BG = '#000'
export const white = (a = 1) => `rgba(255,255,255,${a})`
export const black = (a = 1) => `rgba(0,0,0,${a})`
export const WHITE = '#ffffff'
export const BLACK = '#000000'

// 中文用思源宋体（Noto Serif SC），西文用同一家族的 Source Serif 4，数字与坐标用 IBM Plex Mono
export const FONT_ZH = '"Noto Serif SC Variable", "Source Serif 4 Variable", serif'
export const FONT_EN = '"Source Serif 4 Variable", "Noto Serif SC Variable", serif'
export const FONT_MONO = '"IBM Plex Mono", "Noto Serif SC Variable", monospace'

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3
export const easeInOut = (x: number) => {
  const t = clamp01(x)
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** t0 之后 dur 秒内从 0 缓升到 1 */
export const appear = (t: number, t0: number, dur = 0.6) => easeOut((t - t0) / dur)

export type TextOpts = {
  size: number
  weight?: number
  italic?: boolean
  zh?: boolean
  color?: string
  align?: CanvasTextAlign
  baseline?: CanvasTextBaseline
  tracking?: number
  caps?: boolean
  mono?: boolean
}

export function setFont(g: CanvasRenderingContext2D, o: TextOpts) {
  g.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 400} ${o.size}px ${o.mono ? FONT_MONO : o.zh ? FONT_ZH : FONT_EN}`
  g.textAlign = o.align ?? 'left'
  g.textBaseline = o.baseline ?? 'alphabetic'
  g.letterSpacing = `${o.tracking ?? 0}px`
  if (o.color) g.fillStyle = o.color
}

export function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts): number {
  setFont(g, o)
  const str = o.caps ? s.toUpperCase() : s
  g.fillText(str, x, y)
  return g.measureText(str).width
}

export function measure(g: CanvasRenderingContext2D, s: string, o: TextOpts): number {
  setFont(g, o)
  return g.measureText(o.caps ? s.toUpperCase() : s).width
}

// ---- 行内数学：字符串里用 $…$ 包住的部分按数学变量的惯例排成意大利体 ----

type Seg = { s: string; math: boolean }

function segments(str: string): Seg[] {
  return str
    .split(/(\$[^$]+\$)/)
    .filter(Boolean)
    .map((x) => (x.startsWith('$') && x.endsWith('$') && x.length > 2 ? { s: x.slice(1, -1), math: true } : { s: x, math: false }))
}

const mathOpts = (o: TextOpts): TextOpts => ({ ...o, zh: false, mono: false, italic: true, weight: 400 })

export function richWidth(g: CanvasRenderingContext2D, str: string, o: TextOpts): number {
  let w = 0
  for (const seg of segments(str)) w += measure(g, seg.s, seg.math ? mathOpts(o) : o)
  return w
}

/** 带 $…$ 行内数学的文字；返回宽度 */
export function richText(g: CanvasRenderingContext2D, str: string, x: number, y: number, o: TextOpts): number {
  const w = richWidth(g, str, o)
  let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x
  for (const seg of segments(str)) {
    const so = seg.math ? mathOpts(o) : o
    cx += text(g, seg.s, cx, y, { ...so, align: 'left' })
  }
  return w
}

/** 断行单位：$…$ 与连续的西文/数字不拆开，其余（汉字、标点）逐字 */
function tokenize(s: string, zh: boolean): string[] {
  if (!zh) return s.match(/\$[^$]+\$\S*|\S+|\s+/g) ?? [s]
  return s.match(/\$[^$]+\$|[A-Za-zÀ-ɏ0-9’'.\-–]+|\s+|./gu) ?? [s]
}

const PUNCT_AFTER = /[，、；：。）」』！？,;:]$/
const NO_LINE_START = /^[，。；：、）》」』！？]/

function greedy(g: CanvasRenderingContext2D, toks: string[], maxWidth: number, o: TextOpts): string[] {
  const lines: string[] = []
  let line = ''
  for (const tok of toks) {
    const next = line + tok
    if (line.trim() && richWidth(g, next, o) > maxWidth && !NO_LINE_START.test(tok)) {
      lines.push(line.trimEnd())
      line = tok.trimStart()
    } else line = next
  }
  if (line.trim()) lines.push(line.trimEnd())
  return lines
}

/** 按宽度折行，并尽量让各行等宽；中文两行时优先在标点后断开 */
export function balancedWrap(g: CanvasRenderingContext2D, s: string, maxWidth: number, o: TextOpts): string[] {
  if (richWidth(g, s, o) <= maxWidth) return [s]
  const toks = tokenize(s, Boolean(o.zh))
  const first = greedy(g, toks, maxWidth, o)
  if (o.zh && first.length === 2) {
    let best: string[] | null = null
    let bestScore = Infinity
    let head = ''
    for (let i = 0; i < toks.length - 1; i++) {
      head += toks[i]
      if (!PUNCT_AFTER.test(head.trimEnd())) continue
      const a = head.trimEnd()
      const b = toks.slice(i + 1).join('').trimStart()
      const wa = richWidth(g, a, o)
      const wb = richWidth(g, b, o)
      if (wa > maxWidth || wb > maxWidth) continue
      const score = Math.abs(wa - wb)
      if (score < bestScore) {
        bestScore = score
        best = [a, b]
      }
    }
    if (best && bestScore < maxWidth * 0.6) return best
  }
  let lo = 0
  let hi = maxWidth
  let best = first
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2
    const lines = greedy(g, toks, mid, o)
    if (lines.length > first.length) lo = mid
    else {
      best = lines
      hi = mid
    }
  }
  return best
}

export function hline(g: CanvasRenderingContext2D, x0: number, x1: number, y: number, color: string, width = 1) {
  g.strokeStyle = color
  g.lineWidth = width
  g.beginPath()
  g.moveTo(x0, y)
  g.lineTo(x1, y)
  g.stroke()
}

export function withAlpha(g: CanvasRenderingContext2D, a: number, fn: () => void) {
  if (a <= 0.001) return
  const prev = g.globalAlpha
  g.globalAlpha = prev * Math.min(1, a)
  fn()
  g.globalAlpha = prev
}

export { rng } from '../math/rng.ts'

/** 由 (a, b) 决定的 0..1 哈希值 */
export function hash2(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)
  h ^= h >>> 16
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** 预渲染的柔光点精灵，叠加模式下画出发光效果 */
const glowCache = new Map<number, HTMLCanvasElement>()
export function glowSprite(radius: number): HTMLCanvasElement {
  const r = Math.max(2, Math.round(radius))
  let c = glowCache.get(r)
  if (!c) {
    c = document.createElement('canvas')
    c.width = c.height = r * 2
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(r, r, 0, r, r, r)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.18, 'rgba(255,255,255,0.55)')
    grad.addColorStop(0.5, 'rgba(255,255,255,0.12)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, r * 2, r * 2)
    glowCache.set(r, c)
  }
  return c
}

export function glow(g: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha: number) {
  if (alpha <= 0.005) return
  const c = glowSprite(radius)
  const prevOp = g.globalCompositeOperation
  const prevA = g.globalAlpha
  g.globalCompositeOperation = 'lighter'
  g.globalAlpha = prevA * Math.min(1, alpha)
  g.drawImage(c, x - c.width / 2, y - c.height / 2)
  g.globalAlpha = prevA
  g.globalCompositeOperation = prevOp
}

/** 截断（不四舍五入）到 d 位小数，配合省略号表示“后面还有” */
export function trunc(x: number, d: number): string {
  const m = 10 ** d
  return (Math.floor(x * m) / m).toFixed(d)
}
