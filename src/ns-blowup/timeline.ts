// 把分镜（SCENES）铺到音乐时间轴上：场景切点吸附到段落变化/强拍，场景内的事件吸附到起音。

import type { AudioAnalysis, Onset } from './audio/analyze'
import { SCENES, type SceneId, type SceneSpec } from './content'

export type ScenePlan = {
  id: SceneId
  spec: SceneSpec
  start: number
  end: number
  /** 场景内卡点事件的绝对时间 */
  cues: number[]
}

export type Timeline = {
  duration: number
  scenes: ScenePlan[]
  /** 自动计算出的切点（不含首尾），用于“重置” */
  autoBoundaries: number[]
}

export function planTimeline(a: AudioAnalysis, override?: number[] | null): Timeline {
  const D = a.duration
  const n = SCENES.length
  const weights = SCENES.map((s) => s.weight)
  const total = weights.reduce((x, y) => x + y, 0)
  // 每个场景至少 3 秒；音乐太短时按比例缩小，保证切点都落在音乐时长之内
  const minScene = Math.min(3, (0.5 * D) / n)
  const { fixed, climax } = findAnchors(a, total)

  // 锚点把时间轴分成几段，每段内按权重分配场景时长
  const known = new Map<number, number>([[-1, 0], [n - 1, D], ...fixed])
  const keys = [...known.keys()].sort((x, y) => x - y)
  const planned: number[] = []
  const lens: number[] = []
  for (let k = 0; k < keys.length - 1; k++) {
    const k0 = keys[k]
    const k1 = keys[k + 1]
    const t0 = known.get(k0)!
    const t1 = known.get(k1)!
    let w = 0
    for (let i = k0 + 1; i <= k1; i++) w += weights[i]
    let acc = 0
    for (let i = k0 + 1; i <= k1; i++) {
      acc += weights[i]
      lens[i] = (weights[i] / w) * (t1 - t0)
      if (i < n - 1) planned[i] = t0 + (acc / w) * (t1 - t0)
    }
  }

  const fixedSet = new Set(fixed.map(([k]) => k))
  const autoBoundaries: number[] = []
  let prev = 0
  for (let i = 0; i < n - 1; i++) {
    // 前一个切点吸附后位置变了，就把本段剩余时间按权重重新分给后面的场景
    let target = planned[i]
    if (!fixedSet.has(i)) {
      const segEnd = keys.find((k) => k >= i)!
      let wRem = 0
      for (let j = i; j <= segEnd; j++) wRem += weights[j]
      target = prev + (weights[i] / wRem) * (known.get(segEnd)! - prev)
    }
    const len = Math.min(lens[i], lens[i + 1])
    const radius = fixedSet.has(i) ? 1.2 : Math.min(Math.max(2.5, 0.3 * len), 0.45 * len)
    let b = snapBoundary(a, target, radius, Math.min(0.55 * len, 6))
    b = Math.min(Math.max(b, prev + minScene), D - (n - 1 - i) * minScene)
    autoBoundaries.push(b)
    prev = b
  }
  const boundaries = validOverride(override, n - 1, D) ? override! : autoBoundaries
  const edges = [0, ...boundaries, D]
  const scenes = SCENES.map((spec, i) => {
    const start = edges[i]
    const end = edges[i + 1]
    return { id: spec.id, spec, start, end, cues: scheduleCues(a, spec, start, end, climax) }
  })
  return { duration: D, scenes, autoBoundaries }
}

/** 区间 [t0, t1] 内的平均响度 */
function meanEnergy(a: AudioAnalysis, t0: number, t1: number): number {
  const i0 = Math.max(0, Math.floor(t0 * a.fps))
  const i1 = Math.min(a.energy.length, Math.ceil(t1 * a.fps))
  if (i1 <= i0) return 0
  let sum = 0
  for (let i = i0; i < i1; i++) sum += a.energy[i]
  return sum / (i1 - i0)
}

/**
 * 高潮点：安静一段之后乐队重新进入的那一下（起音前后响度差最大的强起音）。
 * “爆破”一场的奇点闪光对准它。
 */
function findClimax(a: AudioAnalysis): number | null {
  const D = a.duration
  let best: number | null = null
  let bestScore = 0.18
  for (const o of a.onsets) {
    if (o.t < 0.4 * D || o.t > 0.85 * D || o.s < 0.4) continue
    const before = meanEnergy(a, o.t - 6, o.t - 0.25)
    const after = meanEnergy(a, o.t + 0.25, o.t + 3)
    const score = (after - before) * (0.5 + 0.5 * o.s)
    if (score > bestScore) {
      bestScore = score
      best = o.t
    }
  }
  // 最响的那一下常常比真正的进入点晚半拍，往前找响度跳变最大的起音
  return best === null ? null : refineEntry(a, best, 1.0)
}

/** 在 t 之前 window 秒内找响度突增最大的起音（乐队进入的第一下），找不到就返回 t */
function refineEntry(a: AudioAnalysis, t: number, window: number): number {
  let best = t
  let bestJump = 0.15
  for (const list of [a.onsets, a.lowOnsets]) {
    for (const o of list) {
      if (o.t < t - window) continue
      if (o.t > t + 0.15) break
      if (o.s < 0.3) continue
      const jump = meanEnergy(a, o.t + 0.05, o.t + 0.5) - meanEnergy(a, o.t - 0.5, o.t - 0.05)
      if (jump > bestJump) {
        bestJump = jump
        best = o.t
      }
    }
  }
  return best
}

/** 尾声：歌曲最后一次明显变弱的位置，片尾从这里开始 */
function findOutro(a: AudioAnalysis): number | null {
  const D = a.duration
  let best: number | null = null
  let bestScore = 0.2
  for (let t = 0.78 * D; t < D - 12; t += 0.25) {
    const score = meanEnergy(a, t - 8, t) - meanEnergy(a, t, D - 3)
    if (score > bestScore) {
      bestScore = score
      best = t
    }
  }
  if (best === null) return null
  return strongestNear(a.onsets, best, 0.6) ?? best
}

/** 固定切点：boundary 下标 i 表示第 i 个场景的结束时刻 */
function findAnchors(a: AudioAnalysis, total: number): { fixed: [number, number][]; climax: number | null } {
  const D = a.duration
  const n = SCENES.length
  const fixed: [number, number][] = []
  if (a.synthetic || D < 90) return { fixed, climax: null }
  let climax: number | null = null
  const bi = SCENES.findIndex((s) => s.accent)
  const c = bi > 0 ? findClimax(a) : null
  if (c !== null) {
    const spec = SCENES[bi]
    const len = Math.max(12, (spec.weight / total) * D)
    const frac = (spec.accent!.from + spec.accent!.to) / 2
    const start = c - frac * len
    const end = c + (1 - frac) * len
    // 前后都要给其余场景留出足够时间
    if (start > bi * 8 && D - end > (n - 1 - bi) * 8) {
      fixed.push([bi - 1, start], [bi, end])
      climax = c
    }
  }
  const outro = findOutro(a)
  const after = fixed.length ? fixed[fixed.length - 1][1] : 0
  const between = n - 2 - (climax !== null ? bi : -1)
  if (outro !== null && outro - after > between * 10 && D - outro >= 10) fixed.push([n - 2, outro])
  return { fixed, climax }
}

function validOverride(o: number[] | null | undefined, n: number, D: number): boolean {
  if (!o || o.length !== n) return false
  let prev = 0
  for (const b of o) {
    if (!Number.isFinite(b) || b <= prev + 0.5 || b >= D) return false
    prev = b
  }
  return true
}

/**
 * 在 planned 附近挑段落边界：普通段落在 radius 内找，明显的段落变化（强度 ≥ 0.8）放宽到 wide；
 * 选中后细化到乐队进入的那一下。没有段落变化就挑附近最强的起音，再对齐到最近的节拍。
 */
function snapBoundary(a: AudioAnalysis, planned: number, radius: number, wide = radius): number {
  let best = planned
  let bestScore = -Infinity
  for (const s of a.sections) {
    const r = s.s >= 0.8 ? Math.max(radius, wide) : radius
    const d = Math.abs(s.t - planned)
    if (d > r) continue
    const score = s.s - 0.5 * (d / r)
    if (score > bestScore) {
      bestScore = score
      best = s.t
    }
  }
  if (bestScore > -Infinity) return refineEntry(a, best, 0.6)
  best = strongestNear(a.onsets, planned, Math.min(radius, 1.5)) ?? planned
  return nearest(a.beats, best, 0.12) ?? best
}

function strongestNear(onsets: Onset[], t: number, radius: number): number | null {
  let best: Onset | null = null
  let bestScore = -Infinity
  for (const o of onsets) {
    if (o.t < t - radius) continue
    if (o.t > t + radius) break
    const score = o.s - 0.35 * (Math.abs(o.t - t) / radius)
    if (score > bestScore) {
      bestScore = score
      best = o
    }
  }
  return best ? best.t : null
}

function nearest(times: number[], t: number, radius: number): number | null {
  let best: number | null = null
  for (const x of times) {
    if (x < t - radius) continue
    if (x > t + radius) break
    if (best === null || Math.abs(x - t) < Math.abs(best - t)) best = x
  }
  return best
}

function scheduleCues(a: AudioAnalysis, spec: SceneSpec, start: number, end: number, climax: number | null): number[] {
  const n = spec.cues
  const lead = Math.min(0.5, (end - start) * 0.05)
  const tail = Math.min(2.2, (end - start) * 0.12)
  const w0 = start + lead
  const w1 = Math.max(w0 + 0.1, end - tail)
  // 每个 cue 需要的最短停留时间不超过窗口允许的范围
  const gap = Math.min(spec.minGap, (w1 - w0) / Math.max(1, n))
  if (spec.firstCueAtStart && n > 0) return [start, ...spread(a, n - 1, start + gap, w1, gap)]
  if (!spec.accent) return spread(a, n, w0, w1, gap)

  // 先定高潮点（区间内最强的起音），再把其余 cue 分布在它前后
  const { cue, from, to } = spec.accent
  const lo = Math.max(start + from * (end - start), w0 + cue * gap)
  const hi = Math.min(start + to * (end - start), w1 - (n - 1 - cue) * gap)
  let accent = (lo + hi) / 2
  if (climax !== null && climax >= lo && climax <= hi) accent = climax
  else {
    let bestS = -1
    for (const o of a.onsets) {
      if (o.t < lo) continue
      if (o.t > hi) break
      if (o.s > bestS) {
        bestS = o.s
        accent = o.t
      }
    }
  }
  const before = spread(a, cue, w0, accent - gap, gap)
  const after = spread(a, n - 1 - cue, accent + gap, w1, gap)
  return [...before, accent, ...after]
}

/** 在 [w0, w1] 里均匀放 n 个目标点，每个吸附到附近最强的起音，退而求其次吸附到节拍 */
function spread(a: AudioAnalysis, n: number, w0: number, w1: number, gap: number): number[] {
  const step = n > 1 ? (w1 - w0) / n : w1 - w0
  const cues: number[] = []
  let prev = -Infinity
  for (let k = 0; k < n; k++) {
    const target = w0 + k * step
    const lo = Math.max(k === 0 ? w0 : prev + gap, target - step * 0.45)
    const hi = Math.min(w1, target + step * 0.45)
    let pick: number | null = null
    let bestScore = -Infinity
    for (const o of a.onsets) {
      if (o.t < lo) continue
      if (o.t > hi) break
      const score = o.s - 0.4 * (Math.abs(o.t - target) / (step || 1))
      if (score > bestScore) {
        bestScore = score
        pick = o.t
      }
    }
    if (pick === null) pick = nearest(a.beats, Math.max(lo, target), step * 0.45)
    if (pick === null || pick < lo) pick = Math.max(lo, Math.min(hi, target))
    cues.push(pick)
    prev = pick
  }
  return cues
}

export function sceneAt(tl: Timeline, t: number): number {
  const s = tl.scenes
  for (let i = s.length - 1; i >= 0; i--) if (t >= s[i].start) return i
  return 0
}

/** 场景区间 [a, b] 内的节拍（用于逐拍出现的列表） */
export function beatsIn(a: AudioAnalysis, from: number, to: number): number[] {
  return a.beats.filter((b) => b >= from && b <= to)
}
