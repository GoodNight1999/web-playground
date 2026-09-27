// 为《地下鉄の動態》定制的时间轴。
// 段落来自对原曲的结构分析（librosa 自相似矩阵 + 谱聚类 + 起音/响度），详见 README；
// 细到每一拍的事件（问答、零点“进站”、素数闪现）在运行时吸附到分析出的起音上。

import type { AudioAnalysis, Onset } from './audio/analyze'
import { QAS } from './content'
import { ZETA_ZEROS } from './data/zeros.gen'

export const SONG = {
  /** 前奏：从 0.59 秒起每小节 3.75 秒（四拍），共 14 小节 */
  bar0: 0.59,
  bar: 3.75,
  /** 全乐队进入：第一段主题（主歌），具象演示从这里开始 */
  verse: 53.09,
  /** 第二个主题段 */
  theme2: 85.32,
  /** 副歌（前半 Z 段 / 后半回到主题） */
  chorus1: 114.25,
  chorus1b: 129.04,
  /** 副歌结束后的歇息：人声进入，伴奏稀疏 */
  rest: 144.74,
  /** 乐队重新进入：第二次副歌 */
  chorus2: 167.22,
  chorus2b: 197.24,
  /** 尾声 */
  outro: 227.72,
}

export type SceneId = 'intro' | 'tunnel' | 'spiral' | 'phase' | 'rest' | 'primes' | 'outro'

export type Scene = { id: SceneId; start: number; end: number }

/** 把“时间 → 数值”做成分段线性映射，保证某些数值恰好在指定的拍子上到达 */
export class Knots {
  readonly t: number[]
  readonly v: number[]
  constructor(t: number[], v: number[]) {
    this.t = t
    this.v = v
  }
  at(time: number): number {
    const { t, v } = this
    if (time <= t[0]) return v[0]
    const n = t.length
    if (time >= t[n - 1]) {
      // 最后一段按末速度外推
      const slope = n > 1 ? (v[n - 1] - v[n - 2]) / (t[n - 1] - t[n - 2]) : 0
      return v[n - 1] + slope * (time - t[n - 1])
    }
    let lo = 0
    let hi = n - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (t[mid] <= time) lo = mid
      else hi = mid
    }
    const f = (time - t[lo]) / (t[hi] - t[lo])
    return v[lo] + (v[hi] - v[lo]) * f
  }
}

export type QACue = { qT: number; aT: number; end: number }

export type Timeline = {
  duration: number
  scenes: Scene[]
  qa: QACue[]
  /** 隧道：第 k 个零点“进站”的时刻 */
  tunnelPass: number[]
  tunnelCam: Knots
  /** ζ(½+it) 曲线：第 k 次穿过原点的时刻 */
  spiralPass: number[]
  spiralT: Knots
  /** 相位图：第 k 个零点经过画面中线的时刻 */
  phasePass: number[]
  phaseT: Knots
  summary: number[]
  /** 显式公式：第 k 个零点加入的时刻 */
  waveAdd: number[]
  /** 素数扫描：第 k 个素数被扫到的时刻 */
  primeHit: number[]
  primeX: Knots
  primes: number[]
  /** 段落切换点（用于闪白等转场） */
  cuts: number[]
}

const PRIMES_TO_100 = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]

/** 吸附到 window 秒内最近的起音 */
function snap(onsets: Onset[], t: number, window = 0.12): number {
  let best = t
  let bestD = window
  for (const o of onsets) {
    const d = Math.abs(o.t - t)
    if (d < bestD) {
      bestD = d
      best = o.t
    }
    if (o.t > t + window) break
  }
  return best
}

/** 在 (from, to) 中挑强起音，彼此至少间隔 gap；最多取 max 个，均匀分布优先 */
function pickHits(onsets: Onset[], from: number, to: number, minS: number, gap: number, max = Infinity): number[] {
  const cand = onsets.filter((o) => o.t > from && o.t < to && o.s >= minS)
  const out: number[] = []
  for (const o of cand) {
    if (out.length && o.t - out[out.length - 1] < gap) {
      // 间隔太近时保留更强的那个
      const prev = cand.find((c) => c.t === out[out.length - 1])
      if (prev && o.s > prev.s + 0.15) out[out.length - 1] = o.t
      continue
    }
    out.push(o.t)
  }
  if (out.length <= max) return out
  // 太多时均匀抽取
  const step = out.length / max
  return Array.from({ length: max }, (_, i) => out[Math.floor(i * step)])
}

export function buildTimeline(a: AudioAnalysis): Timeline {
  const D = a.duration
  const S = SONG
  const on = a.onsets
  const scenes: Scene[] = [
    { id: 'intro', start: 0, end: S.verse },
    { id: 'tunnel', start: S.verse, end: S.theme2 },
    { id: 'spiral', start: S.theme2, end: S.chorus1 },
    { id: 'phase', start: S.chorus1, end: S.rest },
    { id: 'rest', start: S.rest, end: S.chorus2 },
    { id: 'primes', start: S.chorus2, end: S.outro },
    { id: 'outro', start: S.outro, end: Math.max(D, S.outro + 5) },
  ]

  const barT = (bar: number, off: number) => snap(on, S.bar0 + (bar - 1) * S.bar + off)
  const qa: QACue[] = QAS.map((x) => ({ qT: barT(x.qBar, x.qOff), aT: barT(x.aBar, x.aOff), end: 0 }))
  qa.forEach((c, i) => (c.end = i + 1 < qa.length ? qa[i + 1].qT : S.verse))

  // 隧道：零点按顺序在强拍“进站”
  const tunnelPass = pickHits(on, S.verse + 2.2, S.theme2 - 0.8, 0.72, 0.85, 60)
  const tunnelCam = new Knots([S.verse, ...tunnelPass], [0, ...tunnelPass.map((_, k) => ZETA_ZEROS[k])])

  // ζ(½+it)：每穿过一次原点对应一个零点
  const spiralPass = pickHits(on, S.theme2 + 2.5, S.chorus1 - 0.8, 0.8, 1.35, 22)
  const spiralT = new Knots([S.theme2 + 0.4, ...spiralPass], [0, ...spiralPass.map((_, k) => ZETA_ZEROS[k])])

  // 相位图：前半段慢、后半段快
  const pz = pickHits(on, S.chorus1 + 1.5, S.chorus1b - 0.3, 0.8, 1.6, 7)
  const px = pickHits(on, S.chorus1b + 0.3, S.rest - 0.8, 0.75, 1.0, 10)
  const phasePass = [...pz, ...px]
  const phaseT = new Knots([S.chorus1, ...phasePass], [0, ...phasePass.map((_, k) => ZETA_ZEROS[k])])

  const summary = [145.44, 149.66, 155.99, 158.53].map((t) => snap(on, t, 0.15))

  // 显式公式：前半段每个强拍加入一个零点
  const waveAdd = pickHits(on, S.chorus2 + 1.2, S.chorus2b - 0.4, 0.6, 0.5, 48)
  // 后半段：素数（含素数幂的台阶）被扫到的时刻
  const primeHit = pickHits(on, S.chorus2b + 4.5, S.outro - 1.0, 0.5, 0.55, PRIMES_TO_100.length)
  const primes = PRIMES_TO_100.slice(0, primeHit.length)
  const primeX = new Knots([S.chorus2b + 3, ...primeHit], [1.5, ...primes])

  return {
    duration: D,
    scenes,
    qa,
    tunnelPass,
    tunnelCam,
    spiralPass,
    spiralT,
    phasePass,
    phaseT,
    summary,
    waveAdd,
    primeHit,
    primeX,
    primes,
    cuts: [S.verse, S.theme2, S.chorus1, S.chorus1b, S.rest, S.chorus2, S.chorus2b, S.outro],
  }
}

export function sceneAt(tl: Timeline, t: number): number {
  const s = tl.scenes
  for (let i = s.length - 1; i >= 0; i--) if (t >= s[i].start) return i
  return 0
}

/** 有序时间数组里 ≤ t 的元素个数 */
export function countBefore(times: number[], t: number): number {
  let lo = 0
  let hi = times.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (times[mid] <= t) lo = mid + 1
    else hi = mid
  }
  return lo
}
