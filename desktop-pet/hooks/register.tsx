import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

const PANE = 'desktop-pet'
const TITLE = '桌宠'

// 帧来自原 GIF：169 帧 / 30ms，隔 2 帧取 1 帧，速度保持不变
const FRAME_COUNT = 57
const FRAME_MS = 90
// 帧图本身是 240×240，面板里按 CSS 像素缩放显示
const FRAME_PIXELS = 240
const MAX_WIDTH = 220
const IDLE_AFTER_MS = 8000

const frame = atom({ plugin: 'desktop-pet', key: 'frame' } as const, 0)
const isDancing = atom({ plugin: 'desktop-pet', key: 'isDancing' } as const, true)
const bubble = atom({ plugin: 'desktop-pet', key: 'bubble' } as const, '你好呀～')

const PAT_LINES = [
  '诶嘿嘿～',
  '帽子要被摸歪啦！',
  '再摸就要收费了哦',
  '（开心地转圈）',
  '今天也要加油写代码！',
  '摸头杀，效果拔群！',
]

const IDLE_LINES = ['（发呆中…）', '（哼着小曲）', '有什么要帮忙的吗？', '（打了个哈欠）']

const TOOL_LINES: Record<string, string> = {
  Bash: '噼里啪啦敲命令中…',
  Read: '翻书中 📖',
  Edit: '写写改改 ✏️',
  Write: '奋笔疾书 ✏️',
  Grep: '找找看在哪 🔍',
  Glob: '找找看在哪 🔍',
  WebSearch: '上网查资料 🌐',
  WebFetch: '上网查资料 🌐',
  Agent: '叫小伙伴来帮忙！',
}

// 模块变量在热重载时会清空，session.start 会重新读一遍
let frames: string[] = []
let ticker: Timer | undefined
let idleTimer: Timer | undefined

function pick(lines: readonly string[]) {
  return lines[Math.floor(Math.random() * lines.length)] ?? ''
}

// 把一帧 WebP 包进 SVG：桌面端没有 Image 元素，只能画 Svg
function svgOf(base64: string) {
  const href = `data:image/webp;base64,${base64}`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${FRAME_PIXELS}" height="${FRAME_PIXELS}" viewBox="0 0 ${FRAME_PIXELS} ${FRAME_PIXELS}">` +
    `<image width="${FRAME_PIXELS}" height="${FRAME_PIXELS}" href="${href}" xlink:href="${href}"/>` +
    `</svg>`
  )
}

async function loadFrames($: EngineInterface) {
  const names = Array.from({ length: FRAME_COUNT }, (_, i) => String(i).padStart(2, '0'))
  const files = await Promise.all(
    names.map(name => $.fs.read(`${$.plugin.root}/assets/frames/${name}.webp`, { as: 'bytes' })),
  )
  frames = files.map(file => file.base64)
}

function stopDancing() {
  ticker?.cancel()
  ticker = undefined
}

async function startDancing($: EngineInterface) {
  if (ticker || frames.length === 0 || !(await read($, isDancing))) {
    return
  }
  ticker = $.clock.every(FRAME_MS, () => {
    void update($, frame, n => (n + 1) % frames.length)
  })
}

// 说一句话，过一会儿没新动静就回到发呆状态
async function say($: EngineInterface, text: string) {
  await update($, bubble, () => text)
  idleTimer?.cancel()
  idleTimer = $.clock.after(IDLE_AFTER_MS, () => {
    void update($, bubble, () => pick(IDLE_LINES))
  })
}

async function toggleDance($: EngineInterface) {
  if (await read($, isDancing)) {
    stopDancing()
    await update($, isDancing, () => false)
    await update($, frame, () => 0)
    await say($, '休息一下～')
  } else {
    await update($, isDancing, () => true)
    await startDancing($)
    await say($, '继续跳舞！')
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pet',
      description: '打开桌宠面板',
    })
    await loadFrames($)
    void $.ui.open({ id: PANE, title: TITLE })
    await startDancing($)

    return next(e)
  })

  on('command.run', { command: 'pet' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    await startDancing($)
    await say($, '我来啦！')

    return { text: '桌宠已经出来啦。' }
  })

  // 面板关掉后停止计时器，不在后台空转
  on('ui.close', { id: PANE }, ($, e, next) => {
    stopDancing()

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await say($, '收到～让我想想！')

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    await say($, TOOL_LINES[e.tool] ?? `正在用 ${e.tool}…`)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const line =
      e.reason === 'answer' ? '搞定啦！✨' : e.reason === 'aborted' ? '诶，被打断了…' : '出错了 QAQ'
    await say($, line)

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const text = await read($, bubble)
    const dancing = await read($, isDancing)
    const index = await read($, frame)

    const controls = (
      <Box flexDirection="row" gap={1}>
        <Button key="pat" label="摸摸头" hotkey="p" onPress={() => say($, pick(PAT_LINES))} />
        <Button key="dance" label={dancing ? '休息' : '跳舞'} hotkey="d" onPress={() => toggleDance($)} />
      </Box>
    )

    if (e.surface === 'terminal') {
      return (
        <Box flexDirection="column" gap={1}>
          <Text>💬 {text}</Text>
          <Text dimColor>桌宠的动画要在 Claude 桌面端才看得到。</Text>
          {controls}
        </Box>
      )
    }

    const { Svg } = $.ui.resolve(e)
    const current = frames[dancing ? index % Math.max(frames.length, 1) : 0]
    const width = Math.min(MAX_WIDTH, Math.max(120, e.props.bodyColumns * 7))

    return (
      <Box flexDirection="column" alignItems="center" gap={1}>
        <Box borderStyle="round" paddingX={1}>
          <Text>{text}</Text>
        </Box>
        {current === undefined ? (
          <Text dimColor>桌宠加载中…</Text>
        ) : (
          <Svg source={svgOf(current)} alt="跳舞的桌宠" width={width} height={width} />
        )}
        {controls}
      </Box>
    )
  })
}
