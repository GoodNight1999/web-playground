// 播放时钟：有音乐时以 AudioContext 的时间为准（扣除输出延迟），没有音乐时用系统时钟。

export class AudioEngine {
  private ctx: AudioContext | null = null
  private buffer: AudioBuffer | null = null
  private src: AudioBufferSourceNode | null = null
  private startedAt = 0
  private pausedAt = 0
  private wallStart = 0
  playing = false
  duration: number
  private onEnded: () => void

  constructor(duration: number, onEnded: () => void) {
    this.duration = duration
    this.onEnded = onEnded
  }

  context(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext({ latencyHint: 'interactive' })
    return this.ctx
  }

  async decode(data: ArrayBuffer): Promise<AudioBuffer> {
    return this.context().decodeAudioData(data)
  }

  setBuffer(buffer: AudioBuffer | null, duration: number) {
    this.pause()
    this.buffer = buffer
    this.duration = duration
    this.pausedAt = 0
  }

  /** 当前应当显示的画面时间 */
  time(): number {
    if (!this.playing) return this.pausedAt
    if (this.buffer && this.ctx) {
      const latency = (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0)
      return Math.max(0, this.ctx.currentTime - this.startedAt - latency)
    }
    const t = (performance.now() - this.wallStart) / 1000
    if (t >= this.duration) {
      this.playing = false
      this.pausedAt = this.duration
      this.onEnded()
      return this.duration
    }
    return t
  }

  async play() {
    if (this.playing) return
    if (this.pausedAt >= this.duration - 0.05) this.pausedAt = 0
    if (this.buffer) {
      const ctx = this.context()
      if (ctx.state !== 'running') await ctx.resume()
      const src = ctx.createBufferSource()
      src.buffer = this.buffer
      src.connect(ctx.destination)
      src.onended = () => {
        if (this.src === src) {
          this.playing = false
          this.pausedAt = this.duration
          this.src = null
          this.onEnded()
        }
      }
      src.start(0, this.pausedAt)
      this.startedAt = ctx.currentTime - this.pausedAt
      this.src = src
    } else {
      this.wallStart = performance.now() - this.pausedAt * 1000
    }
    this.playing = true
  }

  pause() {
    if (!this.playing) return
    this.pausedAt = Math.min(this.duration, this.time())
    this.playing = false
    const src = this.src
    this.src = null
    if (src) {
      src.onended = null
      src.stop()
    }
  }

  async seek(t: number) {
    const was = this.playing
    this.pause()
    this.pausedAt = Math.max(0, Math.min(this.duration, t))
    if (was) await this.play()
  }
}
