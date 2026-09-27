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
  const total = SCENES.reduce((s, x) => s + x.weight, 0)
  const n = SCENES.length
  // 每个场景至少 3 秒；音乐太短时按比例缩小，保证切点都落在音乐时长之内
  const minScene = Math.min(3, (0.5 * D) / n)
  const autoBoundaries: number[] = []
  let acc = 0
  let prev = 0
  for (let i = 0; i < n - 1; i++) {
    acc += SCENES[i].weight
    const planned = (acc / total) * D
    const len = (SCENES[i].weight / total) * D
    let b = snapBoundary(a, planned, Math.min(Math.max(2.5, 0.22 * len), 0.45 * len))
    b = Math.min(Math.max(b, prev + minScene), D - (n - 1 - i) * minScene)
    autoBoundaries.push(b)
    prev = b
  }
  const boundaries = validOverride(override, SCENES.length - 1, D) ? override! : autoBoundaries
  const edges = [0, ...boundaries, D]
  const scenes = SCENES.map((spec, i) => {
    const start = edges[i]
    const end = edges[i + 1]
    return { id: spec.id, spec, start, end, cues: scheduleCues(a, spec, start, end) }
  })
  return { duration: D, scenes, autoBoundaries }
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

/** 在 planned±radius 内挑段落边界；没有就挑最强的起音；最后再对齐到最近的节拍 */
function snapBoundary(a: AudioAnalysis, planned: number, radius: number): number {
  let best = planned
  let bestScore = -Infinity
  for (const s of a.sections) {
    const d = Math.abs(s.t - planned)
    if (d > radius) continue
    const score = s.s - 0.5 * (d / radius)
    if (score > bestScore) {
      bestScore = score
      best = s.t
    }
  }
  if (bestScore === -Infinity) {
    best = strongestNear(a.onsets, planned, Math.min(radius, 1.5)) ?? planned
  }
  const beat = nearest(a.beats, best, 0.12)
  return beat ?? best
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

function scheduleCues(a: AudioAnalysis, spec: SceneSpec, start: number, end: number): number[] {
  const n = spec.cues
  const lead = Math.min(0.5, (end - start) * 0.05)
  const tail = Math.min(2.2, (end - start) * 0.12)
  const w0 = start + lead
  const w1 = Math.max(w0 + 0.1, end - tail)
  // 每个 cue 需要的最短停留时间不超过窗口允许的范围
  const gap = Math.min(spec.minGap, (w1 - w0) / Math.max(1, n))
  if (!spec.accent) return spread(a, n, w0, w1, gap)

  // 先定高潮点（区间内最强的起音），再把其余 cue 分布在它前后
  const { cue, from, to } = spec.accent
  const lo = Math.max(start + from * (end - start), w0 + cue * gap)
  const hi = Math.min(start + to * (end - start), w1 - (n - 1 - cue) * gap)
  let accent = (lo + hi) / 2
  let bestS = -1
  for (const o of a.onsets) {
    if (o.t < lo) continue
    if (o.t > hi) break
    if (o.s > bestS) {
      bestS = o.s
      accent = o.t
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
