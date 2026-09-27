// 为《地下鉄の動態》定制的时间轴。
// 段落来自对原曲的结构分析（librosa 自相似矩阵 + 谱聚类 + 起音/响度），详见 README；
// 细到每一拍的事件（问答、原子闪现、切割、射线……）在运行时吸附到分析出的起音上。

import type { AudioAnalysis, Onset } from './audio/analyze'
import { QAS } from './content'

export const SONG = {
  /** 前奏：从 0.59 秒起每小节 3.75 秒（四拍），共 14 小节 */
  bar0: 0.59,
  bar: 3.75,
  /** 全乐队进入：第一段主题（主歌），具象演示从这里开始 */
  verse: 53.09,
  /** 主歌后半（强拍） */
  verseB: 68.8,
  /** 第二个主题段 */
  theme2: 85.32,
  theme2B: 99.74,
  /** 副歌（前半 Z 段 / 后半回到主题） */
  chorus1: 114.25,
  chorus1b: 129.04,
  /** 副歌结束后的歇息：人声进入，伴奏稀疏 */
  rest: 144.74,
  /** 乐队重新进入：第二次副歌 */
  chorus2: 167.22,
  chorus2m: 181.75,
  chorus2b: 197.24,
  chorus2c: 210.81,
  /** 尾声 */
  outro: 227.72,
}

export type SceneId = 'intro' | 'gas' | 'spacetime' | 'lanford' | 'layers' | 'cutting' | 'torus' | 'rest' | 'kinetic' | 'fluid' | 'outro'

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

/** 场景数据里与分子相关的规模（由 visuals 里的真实计算给出） */
export type Sizes = { atomTimes: number[]; simT0: number; simT: number; cutSteps: number; particleLines: number }

export type Timeline = {
  duration: number
  scenes: Scene[]
  qa: QACue[]
  /** 主歌前半：气体 A 的模拟时间；分子里的原子在强拍上发生 */
  gasSim: Knots
  /** 原子 k 被同步到的时刻（没同步到的为 NaN） */
  atomHit: number[]
  /** 主歌后半：粒子线逐条点亮的时刻、拓扑约化的开始时刻 */
  lineHit: number[]
  morph: number
  layerHit: number[]
  /** Lanford 树：第 k 个新粒子出现的时刻 */
  treeHit: number[]
  /** 时间分层：第 k 层出现的时刻 */
  sliceHit: number[]
  /** 切割：第 k 步的时刻 */
  cutHit: number[]
  /** 环面：第 k 条射线射出的时刻 */
  rayHit: number[]
  torusNote: number[]
  summary: number[]
  /** 副歌二前半：气体 B 的模拟时间 */
  kinSim: Knots
  /** 从动理学转到流体力学极限的时刻 */
  hydroStart: number
  hydroHit: number[]
  /** 流线逐条出现的时刻与链条三站点亮的时刻 */
  streamHit: number[]
  chainHit: number[]
  /** 段落切换点（用于闪白等转场） */
  cuts: number[]
}

/** 吸附到 window 秒内最近的起音 */
export function snap(onsets: Onset[], t: number, window = 0.12): number {
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

/** 需要 n 个拍点：强起音不够时放宽力度门限，仍不够就在区间里均匀补齐 */
function hitsN(onsets: Onset[], from: number, to: number, n: number, gap: number): number[] {
  for (const minS of [0.75, 0.6, 0.45, 0.3]) {
    const h = pickHits(onsets, from, to, minS, gap, n)
    if (h.length >= n) return h
  }
  const h = pickHits(onsets, from, to, 0.3, gap * 0.6, n)
  if (h.length >= n) return h
  return Array.from({ length: n }, (_, i) => from + ((to - from) * (i + 0.5)) / n)
}

export function buildTimeline(a: AudioAnalysis, z: Sizes): Timeline {
  const D = a.duration
  const S = SONG
  const on = a.onsets
  const sn = (t: number, w = 0.15) => snap(on, t, w)
  const verseB = sn(S.verseB)
  const theme2B = sn(S.theme2B)
  const chorus2m = sn(S.chorus2m)
  const chorus2c = sn(S.chorus2c)
  const scenes: Scene[] = [
    { id: 'intro', start: 0, end: S.verse },
    { id: 'gas', start: S.verse, end: verseB },
    { id: 'spacetime', start: verseB, end: S.theme2 },
    { id: 'lanford', start: S.theme2, end: theme2B },
    { id: 'layers', start: theme2B, end: S.chorus1 },
    { id: 'cutting', start: S.chorus1, end: S.chorus1b },
    { id: 'torus', start: S.chorus1b, end: S.rest },
    { id: 'rest', start: S.rest, end: S.chorus2 },
    { id: 'kinetic', start: S.chorus2, end: S.chorus2b },
    { id: 'fluid', start: S.chorus2b, end: S.outro },
    { id: 'outro', start: S.outro, end: Math.max(D, S.outro + 5) },
  ]

  const barT = (bar: number, off: number) => snap(on, S.bar0 + (bar - 1) * S.bar + off)
  const qa: QACue[] = QAS.map((x) => ({ qT: barT(x.qBar, x.qOff), aT: barT(x.aBar, x.aOff), end: 0 }))
  qa.forEach((c, i) => (c.end = i + 1 < qa.length ? qa[i + 1].qT : S.verse))

  // 主歌前半：分子里的原子按时间顺序落在强拍上（原子太多时均匀挑一部分同步，其余随时间插值）
  const nA = z.atomTimes.length
  const gh = pickHits(on, S.verse + 1.6, verseB - 1.0, 0.55, 0.62, nA)
  const sync = gh.length >= nA ? z.atomTimes.map((_, i) => i) : gh.map((_, k) => Math.round((k * (nA - 1)) / Math.max(1, gh.length - 1)))
  const atomHit = z.atomTimes.map(() => NaN)
  sync.forEach((ai, k) => (atomHit[ai] = gh[k]))
  const lead = Math.max(0.15, z.atomTimes[0] - z.simT0)
  const gasSim = new Knots(
    [S.verse, ...sync.map((_, k) => gh[k]), verseB],
    [z.atomTimes[0] - lead * 2.2, ...sync.map((ai) => z.atomTimes[ai]), z.simT],
  )

  // 主歌后半：粒子线逐条点亮 → 拓扑约化 → 时间层
  const morph = sn(79.11)
  const lineHit = hitsN(on, verseB + 0.3, morph - 0.6, z.particleLines, 0.45)
  const layerHit = hitsN(on, morph + 1.8, S.theme2 - 0.8, 12, 0.2)

  // 第二主题：Lanford 树逐个长出新粒子；随后时间层逐层出现
  const treeHit = hitsN(on, S.theme2 + 1.2, theme2B - 0.8, 12, 0.6)
  const sliceHit = hitsN(on, theme2B + 0.3, theme2B + 7.5, 12, 0.35)

  // 副歌一：每个强拍切下一个初等分子
  const cutHit = hitsN(on, S.chorus1 + 1.4, S.chorus1b - 1.6, z.cutSteps, 0.75)
  // 副歌一后半：射线；随后三条说明依次出现
  const rayHit = pickHits(on, S.chorus1b + 0.8, S.chorus1b + 8.6, 0.45, 0.4, 16)
  const torusNote = [S.chorus1b + 9.2, S.chorus1b + 11.6, S.chorus1b + 13.4].map((t) => sn(t))

  const summary = [145.44, 149.66, 155.99, 158.53].map((t) => sn(t))

  // 副歌二前半：气体 B 从 0 演化到 1.5（平缓前进，强拍处稍作停顿由场景负责）
  const kinSim = new Knots([S.chorus2 + 1.2, chorus2m - 0.4], [0, 1.5])
  const hydroHit = hitsN(on, chorus2m + 0.2, S.chorus2b - 1.2, 5, 1.6)

  // 副歌二后半：流线逐条出现，最后点亮“牛顿 → 玻尔兹曼 → 流体”
  const streamHit = hitsN(on, S.chorus2b + 0.4, chorus2c - 0.6, 18, 0.35)
  const chainHit = hitsN(on, chorus2c + 0.2, chorus2c + 6.5, 5, 0.9)

  return {
    duration: D,
    scenes,
    qa,
    gasSim,
    atomHit,
    lineHit,
    morph,
    layerHit,
    treeHit,
    sliceHit,
    cutHit,
    rayHit,
    torusNote,
    summary,
    kinSim,
    hydroStart: chorus2m,
    hydroHit,
    streamHit,
    chainHit,
    cuts: [S.verse, verseB, S.theme2, theme2B, S.chorus1, S.chorus1b, S.rest, S.chorus2, chorus2m, S.chorus2b, S.outro],
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
