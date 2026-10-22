/** 头顶气泡里的一句话 */
export type Bubble = string

declare module 'claude-code' {
  interface PluginState {
    'desktop-pet': {
      /** 当前播放到第几帧 */
      frame: number
      /** 是否在跳舞（false 时停在第一帧） */
      isDancing: boolean
      bubble: Bubble
    }
  }
}
