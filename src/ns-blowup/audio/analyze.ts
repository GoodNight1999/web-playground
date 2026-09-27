// 在浏览器里分析用户载入的音频：起音（onset）、节拍、段落变化、能量包络。
// 视频的场景切换和动画重音都从这里的结果取时间点，所以音乐换一版也能自动卡点。

export type Onset = { t: number; s: number }

export type AudioAnalysis = {
  duration: number
  /** 特征帧率（帧/秒） */
  fps: number
  /** 平滑后的响度包络，0..1 */
  energy: Float32Array
  /** 全频段起音，按时间排序，s 为强度 0..1 */
  onsets: Onset[]
  /** 低频起音（大致对应底鼓/贝斯） */
  lowOnsets: Onset[]
  beats: number[]
  bpm: number
  /** 段落边界候选，s 为新颖度 0..1 */
  sections: Onset[]
  synthetic: boolean
}

const SR = 22050
const N = 1024
const HOP = 256

type Progress = (ratio: number) => void

export async function analyzeAudio(buffer: AudioBuffer, onProgress?: Progress): Promise<AudioAnalysis> {
  const x = await toMono22k(buffer)
  const fps = SR / HOP
  const frames = Math.max(1, Math.floor(x.length / HOP))

  const flux = new Float32Array(frames)
  const lowFlux = new Float32Array(frames)
  const highFlux = new Float32Array(frames)
  const rms = new Float32Array(frames)

  const fft = makeFft(N)
  const win = new Float32Array(N)
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N)
  const re = new Float64Array(N)
  const im = new Float64Array(N)
  const half = N / 2
  let prev = new Float32Array(half)
  let cur = new Float32Array(half)
  const lowBin = Math.round((200 * N) / SR)
  const highBin = Math.round((5000 * N) / SR)

  for (let f = 0; f < frames; f++) {
    // 帧以 f*HOP 为中心
    const start = f * HOP - half
    let sq = 0
    for (let i = 0; i < N; i++) {
      const j = start + i
      const v = j >= 0 && j < x.length ? x[j] : 0
      sq += v * v
      re[i] = v * win[i]
      im[i] = 0
    }
    rms[f] = Math.sqrt(sq / N)
    fft(re, im)
    let all = 0
    let lo = 0
    let hi = 0
    for (let k = 1; k < half; k++) {
      const m = Math.log1p(Math.hypot(re[k], im[k]))
      cur[k] = m
      const d = m - prev[k]
      if (d > 0) {
        all += d
        if (k <= lowBin) lo += d
        else if (k >= highBin) hi += d
      }
    }
    flux[f] = all
    lowFlux[f] = lo
    highFlux[f] = hi
    const tmp = prev
    prev = cur
    cur = tmp
    if (f % 2000 === 0) {
      onProgress?.(f / frames)
      await new Promise((r) => setTimeout(r, 0))
    }
  }
  flux[0] = 0
  lowFlux[0] = 0
  highFlux[0] = 0

  const env = normalize(flux)
  const lowEnv = normalize(lowFlux)
  const onsets = pickOnsets(env, fps)
  const lowOnsets = pickOnsets(lowEnv, fps)
  const { bpm, beats } = trackBeats(env, fps)
  const energy = energyEnvelope(rms, fps)
  const sections = detectSections(rms, lowFlux, highFlux, flux, fps, onsets)
  onProgress?.(1)

  return { duration: buffer.duration, fps, energy, onsets, lowOnsets, beats, bpm, sections, synthetic: false }
}

/** 没有载入音乐时的预览：均匀节拍网格 */
export function syntheticAnalysis(duration = 240, bpm = 120): AudioAnalysis {
  const fps = 50
  const period = 60 / bpm
  const beats: number[] = []
  const onsets: Onset[] = []
  const lowOnsets: Onset[] = []
  for (let i = 0, t = 0.5; t < duration; i++, t = 0.5 + i * period) {
    beats.push(t)
    const down = i % 4 === 0
    onsets.push({ t, s: down ? 1 : 0.55 })
    if (down) lowOnsets.push({ t, s: 1 })
  }
  const sections: Onset[] = []
  for (let t = 0.5 + 32 * period; t < duration; t += 32 * period) sections.push({ t, s: 1 })
  const energy = new Float32Array(Math.ceil(duration * fps)).fill(0.6)
  return { duration, fps, energy, onsets, lowOnsets, beats, bpm, sections, synthetic: true }
}

async function toMono22k(buffer: AudioBuffer): Promise<Float32Array> {
  const length = Math.max(1, Math.ceil(buffer.duration * SR))
  const off = new OfflineAudioContext(1, length, SR)
  const src = off.createBufferSource()
  src.buffer = buffer
  src.connect(off.destination)
  src.start()
  const rendered = await off.startRendering()
  return rendered.getChannelData(0)
}

function makeFft(n: number) {
  const levels = Math.log2(n)
  const rev = new Uint32Array(n)
  for (let i = 0; i < n; i++) {
    let r = 0
    for (let b = 0; b < levels; b++) r |= ((i >> b) & 1) << (levels - 1 - b)
    rev[i] = r
  }
  const cos = new Float64Array(n / 2)
  const sin = new Float64Array(n / 2)
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n)
    sin[i] = Math.sin((2 * Math.PI * i) / n)
  }
  return (re: Float64Array, im: Float64Array) => {
    for (let i = 0; i < n; i++) {
      const j = rev[i]
      if (j > i) {
        let t = re[i]
        re[i] = re[j]
        re[j] = t
        t = im[i]
        im[i] = im[j]
        im[j] = t
      }
    }
    for (let size = 2; size <= n; size *= 2) {
      const halfSize = size / 2
      const step = n / size
      for (let i = 0; i < n; i += size) {
        for (let j = 0, k = 0; j < halfSize; j++, k += step) {
          const a = i + j
          const b = a + halfSize
          const tr = re[b] * cos[k] + im[b] * sin[k]
          const ti = -re[b] * sin[k] + im[b] * cos[k]
          re[b] = re[a] - tr
          im[b] = im[a] - ti
          re[a] += tr
          im[a] += ti
        }
      }
    }
  }
}

function percentile(a: ArrayLike<number>, q: number): number {
  const s = Float32Array.from(a).sort()
  if (s.length === 0) return 0
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))]
}

function normalize(a: Float32Array): Float32Array {
  const p = percentile(a, 0.98) || 1
  const out = new Float32Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] / p
  return out
}

function movingMean(a: Float32Array, i: number, before: number, after: number): number {
  let sum = 0
  let n = 0
  for (let j = Math.max(0, i - before); j <= Math.min(a.length - 1, i + after); j++) {
    sum += a[j]
    n++
  }
  return n ? sum / n : 0
}

function pickOnsets(env: Float32Array, fps: number): Onset[] {
  const w = Math.max(1, Math.round(0.03 * fps))
  const meanW = Math.round(0.12 * fps)
  const minGap = Math.round(0.06 * fps)
  const raw: { i: number; v: number }[] = []
  let last = -Infinity
  for (let i = 1; i < env.length - 1; i++) {
    const v = env[i]
    let isMax = true
    for (let j = Math.max(0, i - w); j <= Math.min(env.length - 1, i + w); j++) {
      if (env[j] > v) {
        isMax = false
        break
      }
    }
    if (!isMax) continue
    if (v < movingMean(env, i, meanW, meanW) + 0.08) continue
    if (i - last < minGap) continue
    raw.push({ i, v })
    last = i
  }
  const top = percentile(
    raw.map((r) => r.v),
    0.95,
  )
  return raw.map(({ i, v }) => {
    // 抛物线插值，把峰值时间细化到帧以下
    const a = env[i - 1]
    const b = env[i]
    const c = env[i + 1]
    const denom = a - 2 * b + c
    const shift = denom !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom)) : 0
    return { t: (i + shift) / fps, s: Math.min(1, v / (top || 1)) }
  })
}

/** 自相关估计速度 + Ellis 动态规划节拍追踪 */
function trackBeats(env: Float32Array, fps: number): { bpm: number; beats: number[] } {
  const n = env.length
  let mean = 0
  for (let i = 0; i < n; i++) mean += env[i]
  mean /= n || 1
  const minLag = Math.floor((60 / 220) * fps)
  const maxLag = Math.ceil((60 / 55) * fps)
  let bestLag = Math.round((60 / 120) * fps)
  let bestScore = -Infinity
  const scores = new Float64Array(maxLag + 2)
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let acc = 0
    for (let i = lag; i < n; i++) acc += (env[i] - mean) * (env[i - lag] - mean)
    const bpm = (60 * fps) / lag
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2)
    scores[lag] = (acc / (n - lag)) * prior
  }
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (scores[lag] > bestScore) {
      bestScore = scores[lag]
      bestLag = lag
    }
  }
  let lagF = bestLag
  const a = scores[bestLag - 1]
  const b = scores[bestLag]
  const c = scores[bestLag + 1]
  const denom = a - 2 * b + c
  if (bestLag > minLag && denom !== 0) lagF = bestLag + Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom))
  const bpm = (60 * fps) / lagF

  const period = lagF
  const tight = 100
  const score = new Float64Array(n)
  const back = new Int32Array(n).fill(-1)
  for (let i = 0; i < n; i++) {
    let best = 0
    let arg = -1
    const lo = Math.max(0, Math.floor(i - 2 * period))
    const hi = Math.floor(i - period / 2)
    for (let j = lo; j <= hi; j++) {
      const pen = Math.log((i - j) / period)
      const v = score[j] - tight * pen * pen
      if (arg === -1 || v > best) {
        best = v
        arg = j
      }
    }
    score[i] = env[i] + (arg >= 0 ? best : 0)
    back[i] = arg
  }
  let end = n - 1
  let endScore = -Infinity
  for (let i = Math.max(0, Math.floor(n - period)); i < n; i++) {
    if (score[i] > endScore) {
      endScore = score[i]
      end = i
    }
  }
  const beats: number[] = []
  for (let i = end; i >= 0; i = back[i]) {
    beats.push(i / fps)
    if (back[i] < 0) break
  }
  beats.reverse()
  return { bpm, beats }
}

function energyEnvelope(rms: Float32Array, fps: number): Float32Array {
  const db = new Float32Array(rms.length)
  for (let i = 0; i < rms.length; i++) db[i] = 20 * Math.log10(rms[i] + 1e-6)
  const lo = percentile(db, 0.1)
  const hi = percentile(db, 0.98)
  const out = new Float32Array(rms.length)
  const att = 1 - Math.exp(-1 / (0.05 * fps))
  const rel = 1 - Math.exp(-1 / (0.5 * fps))
  let y = 0
  for (let i = 0; i < db.length; i++) {
    const v = Math.max(0, Math.min(1, (db[i] - lo) / (hi - lo || 1)))
    y += (v > y ? att : rel) * (v - y)
    out[i] = y
  }
  return out
}

/** 段落边界：比较前后 4 秒的音色/响度统计量（新颖度曲线），取峰值 */
function detectSections(
  rms: Float32Array,
  low: Float32Array,
  high: Float32Array,
  all: Float32Array,
  fps: number,
  onsets: Onset[],
): Onset[] {
  const block = Math.round(fps / 2)
  const nb = Math.floor(rms.length / block)
  if (nb < 20) return []
  const feats: number[][] = []
  for (let b = 0; b < nb; b++) {
    let r = 0
    let l = 0
    let h = 0
    let a = 0
    for (let i = b * block; i < (b + 1) * block; i++) {
      r += rms[i]
      l += low[i]
      h += high[i]
      a += all[i]
    }
    feats.push([Math.log(r / block + 1e-6), Math.log1p(l), Math.log1p(h), Math.log1p(a)])
  }
  const dims = feats[0].length
  for (let d = 0; d < dims; d++) {
    let m = 0
    for (const f of feats) m += f[d]
    m /= nb
    let v = 0
    for (const f of feats) v += (f[d] - m) ** 2
    const sd = Math.sqrt(v / nb) || 1
    for (const f of feats) f[d] = (f[d] - m) / sd
  }
  const W = 8
  const nov = new Float32Array(nb)
  for (let b = W; b < nb - W; b++) {
    let dist = 0
    for (let d = 0; d < dims; d++) {
      let before = 0
      let after = 0
      for (let k = 0; k < W; k++) {
        before += feats[b - 1 - k][d]
        after += feats[b + k][d]
      }
      dist += ((after - before) / W) ** 2
    }
    nov[b] = Math.sqrt(dist)
  }
  let max = 0
  for (const v of nov) max = Math.max(max, v)
  const out: Onset[] = []
  for (let b = W; b < nb - W; b++) {
    let isMax = true
    for (let k = Math.max(0, b - 4); k <= Math.min(nb - 1, b + 4); k++) if (nov[k] > nov[b]) isMax = false
    if (!isMax || nov[b] < 0.25 * max) continue
    // 对齐到附近最强的起音
    const t0 = (b * block) / fps
    let bestT = t0
    let bestS = -1
    for (const o of onsets) {
      if (o.t < t0 - 0.6) continue
      if (o.t > t0 + 0.6) break
      if (o.s > bestS) {
        bestS = o.s
        bestT = o.t
      }
    }
    out.push({ t: bestT, s: nov[b] / (max || 1) })
  }
  return out
}

// ---- 渲染时的查询 ----

export function sampleArray(a: Float32Array, fps: number, t: number): number {
  if (a.length === 0) return 0
  const x = Math.max(0, Math.min(a.length - 1, t * fps))
  const i = Math.floor(x)
  const f = x - i
  return a[i] * (1 - f) + a[Math.min(a.length - 1, i + 1)] * f
}

/** 返回时间 ≤ t 的最后一个元素的下标（二分），没有则为 -1 */
export function lastIndexBefore<T>(arr: readonly T[], t: number, time: (v: T) => number): number {
  let lo = 0
  let hi = arr.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (time(arr[mid]) <= t) {
      ans = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return ans
}

const onsetTime = (o: Onset) => o.t

/** 起音冲击：最近若干个起音按指数衰减叠加后的最大值 */
export function pulseAt(onsets: Onset[], t: number, decay = 0.18, minStrength = 0): number {
  let i = lastIndexBefore(onsets, t, onsetTime)
  let best = 0
  for (let k = 0; k < 8 && i >= 0; k++, i--) {
    const o = onsets[i]
    const age = t - o.t
    if (age > decay * 6) break
    if (o.s < minStrength) continue
    best = Math.max(best, o.s * Math.exp(-age / decay))
  }
  return best
}
