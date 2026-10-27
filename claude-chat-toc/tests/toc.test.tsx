import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'chat-toc',
  component: 'Pane',
  requestId: 'chat-toc',
  props: {
    title: '对话目录',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const prompt = (requestId: string, text: string, kind = 'composer') =>
  ({
    plugin: 'chat-toc',
    component: 'UserMessage',
    requestId,
    surface: 'desktop',
    props: { text, origin: { kind }, isExpanded: true, onScreen: null },
  }) as const

test('列出每条提问，点击跳到对应消息', async ($, on) => {
  const clock = mock.clock(on)
  // The engine's own drawing of a transcript row, beneath the plugin.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>row</Text>
  })
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push(JSON.stringify(e))
    return { value: undefined }
  })

  for (const row of [
    prompt('m1', '什么是闭包？'),
    prompt('m2', '  useEffect\n 依赖数组怎么写 '),
    prompt('n1', '后台任务完成', 'task-notification'),
  ]) {
    const ui = await $.ui.mount(row as never)
    await ui.unmount()
  }
  await clock.advance(100)

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const buttons = await ui.findAll({ type: 'Button' })
    expect(buttons).toHaveLength(2)
    expect(await ui.find({ type: 'Button', text: /useEffect 依赖数组怎么写/ })).toBeDefined()
    expect(await ui.find({ type: 'Button', text: /后台任务/ })).toBeUndefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'q-m2' })
  await clock.settle()
  // The kit draws no transcript, so nothing beneath answers the scroll: the
  // toast names the call the press made.
  expect(toasts.join('\n')).toContain('ui.scroll')
  expect((await ui.find({ type: 'Button', text: /▶ 2\./ })) !== undefined).toBe(true)
  await ui.unmount()
})

test('没有提问时显示提示', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text' }))?.text).toContain('还没有提问')
  await ui.unmount()
})

test('输入框上方的横栏：折叠一行，展开列出提问', async ($, on) => {
  const clock = mock.clock(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>row</Text>
  })
  const row = await $.ui.mount(prompt('m1', '什么是闭包？') as never)
  await row.unmount()
  await clock.advance(100)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'chat-toc',
      component: 'AbovePrompt',
      requestId: 'above-prompt',
      surface,
      props: {
        hasSurvey: false,
        isWorking: false,
        maxRows: 10,
        bodyColumns: 60,
        scroll: { offset: 0, bodyRows: 10 },
        view: {},
      },
    } as never)
    expect((await ui.find({ type: 'Text', text: /1 条提问/ })) !== undefined).toBe(true)
    expect(await ui.find({ key: 'b-m1' })).toBeUndefined()
    await ui.press({ key: 'toggle' })
    expect((await ui.find({ key: 'b-m1' }))?.text).toContain('什么是闭包')
    await ui.press({ key: 'toggle' })
    await ui.unmount()
  }
})
