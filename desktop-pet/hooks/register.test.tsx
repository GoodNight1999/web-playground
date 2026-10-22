import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const PANE = {
  plugin: 'desktop-pet',
  component: 'Pane',
  requestId: 'desktop-pet',
  props: {
    title: '桌宠',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

// 测试里没有真实文件系统：每一帧的 base64 用帧号代替，方便断言当前播放到哪一帧
function engine(on: On, { opensPane = true } = {}) {
  on('command.register', () => ({ value: { command: 'pet' } }))
  if (opensPane) {
    on('ui.open', () => ({ value: { isPlaced: true } }))
  }
  on('fs.read', (_, e) => ({ value: { base64: `F${e.path.slice(-7, -5)}` } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('prompt.submit', (_, e) => ({ text: e.text }))

  return mock.clock(on)
}

const svgSource = async (ui: { find: (q: { type: string }) => Promise<{ props: Record<string, unknown> } | undefined> }) =>
  String((await ui.find({ type: 'Svg' }))?.props.source ?? '')

test('桌面端：画出当前帧，并随时钟逐帧播放', async ($, on) => {
  const clock = engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const before = await svgSource(ui)
    expect(before).toContain('data:image/webp;base64,F')
    await clock.advance(90)
    expect(await svgSource(ui)).not.toBe(before)
    await ui.unmount()
  }
})

test('Claude 调用工具时，气泡会说话', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'ls' })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /敲命令/ }))?.text).toBe('噼里啪啦敲命令中…')
  await ui.unmount()
})

test('点「休息」停在第一帧，时钟走了也不动；再点「跳舞」继续', async ($, on) => {
  const clock = engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  await ui.press({ key: 'dance' })
  expect(await svgSource(ui)).toContain('base64,F00')
  expect((await ui.find({ key: 'dance' }))?.props.label).toBe('跳舞')
  await clock.advance(900)
  expect(await svgSource(ui)).toContain('base64,F00')

  await ui.press({ key: 'dance' })
  await clock.advance(90)
  expect(await svgSource(ui)).not.toContain('base64,F00')
  await ui.unmount()
})

test('摸摸头会换一句话', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  await ui.press({ key: 'pat' })
  expect(await ui.find({ type: 'Text', text: /你好呀/ })).toBeUndefined()
  await ui.unmount()
})

test('终端里没有 Svg，给出文字提示', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /桌面端/ })).toBeDefined()
  await ui.unmount()
})

test('发消息时面板没显示就再打开一次，已经显示就不重复打开', async ($, on) => {
  engine(on, { opensPane: false })
  let placed = false
  let isAsked = false
  let opens = 0
  on('ui.panes', () => ({
    value: [{ id: 'desktop-pet', title: '桌宠', isShown: placed, isFocused: false, isPlaced: placed }],
  }))
  // 插件在 session.start 里自己开的面板，窄窗口下不显示；用户发消息时再开就会显示
  on('ui.open', () => {
    opens += 1
    placed = isAsked

    return { value: placed ? { isPlaced: true } : { isPlaced: false, reason: 'narrow' } }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(opens).toBe(1)

  isAsked = true
  const typed = { wait: false, origin: { kind: 'composer' } } as const
  await $.prompt.submit({ ...typed, text: '你好' })
  expect(opens).toBe(2)
  await $.prompt.submit({ ...typed, text: '再来' })
  expect(opens).toBe(2)
})
