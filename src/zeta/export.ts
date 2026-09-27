// 逐帧离线导出：每一帧按精确时间渲染后交给 WebCodecs 编码，不受电脑卡顿影响。
// 优先 MP4（H.264 + AAC），浏览器不支持 AAC 编码时退回 WebM（VP9/VP8 + Opus）。

import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_VERY_HIGH,
  WebMOutputFormat,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from 'mediabunny'
import type { Renderer } from './render/renderer'

export type ExportResult = { blob: Blob; ext: string }

export async function exportVideo(opts: {
  canvas: HTMLCanvasElement
  renderer: Renderer
  duration: number
  audio: AudioBuffer | null
  fps: number
  onProgress: (ratio: number) => void
  signal: AbortSignal
}): Promise<ExportResult> {
  const { canvas, renderer, duration, audio, fps, onProgress, signal } = opts
  if (typeof VideoEncoder === 'undefined') throw new Error('当前浏览器不支持 WebCodecs，请用最新版 Chrome 或 Edge 导出。')

  const size = { width: canvas.width, height: canvas.height }
  const audioOpts = audio ? { numberOfChannels: audio.numberOfChannels, sampleRate: audio.sampleRate } : undefined
  const aac = audio ? await getFirstEncodableAudioCodec(['aac'], audioOpts) : null
  const mp4Video = await getFirstEncodableVideoCodec(['avc'], { ...size, quality: QUALITY_VERY_HIGH })
  const useMp4 = mp4Video !== null && (!audio || aac !== null)

  const format = useMp4 ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat()
  const videoCodec = useMp4 ? mp4Video : await getFirstEncodableVideoCodec(['vp9', 'vp8'], size)
  if (!videoCodec) throw new Error('当前浏览器没有可用的视频编码器。')
  const audioCodec = audio ? (useMp4 ? aac : await getFirstEncodableAudioCodec(['opus'], audioOpts)) : null
  if (audio && !audioCodec) throw new Error('当前浏览器没有可用的音频编码器。')

  const target = new BufferTarget()
  const output = new Output({ format, target })
  const video = new CanvasSource(canvas, { codec: videoCodec, quality: QUALITY_VERY_HIGH, keyFrameInterval: 2 })
  output.addVideoTrack(video, { frameRate: fps })
  const audioSource = audio && audioCodec ? new AudioBufferSource({ codec: audioCodec, quality: QUALITY_HIGH }) : null
  if (audioSource) output.addAudioTrack(audioSource)
  await output.start()

  // 音频按 1 秒一块、领先画面少许交错写入，避免封装器等待另一条轨道
  let audioSent = 0
  const feedAudio = async (until: number) => {
    if (!audioSource || !audio) return
    const end = Math.min(audio.length, Math.ceil(until * audio.sampleRate))
    while (audioSent < end) {
      const len = Math.min(audio.sampleRate, end - audioSent)
      const chunk = new AudioBuffer({ length: len, numberOfChannels: audio.numberOfChannels, sampleRate: audio.sampleRate })
      for (let ch = 0; ch < audio.numberOfChannels; ch++) {
        chunk.copyToChannel(audio.getChannelData(ch).subarray(audioSent, audioSent + len), ch)
      }
      await audioSource.add(chunk)
      audioSent += len
    }
  }

  const frames = Math.ceil(duration * fps)
  for (let i = 0; i < frames; i++) {
    if (signal.aborted) {
      await output.cancel()
      throw new DOMException('已取消', 'AbortError')
    }
    await feedAudio(i / fps + 1)
    renderer.render(i / fps)
    await video.add(i / fps, 1 / fps)
    if (i % 15 === 0) {
      onProgress(i / frames)
      await new Promise((r) => setTimeout(r, 0))
    }
  }
  await feedAudio(Infinity)
  await output.finalize()
  onProgress(1)
  const blob = new Blob([target.buffer!], { type: format.mimeType })
  return { blob, ext: format.fileExtension }
}
