import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Prompt } from '../types'

const PANE = 'chat-toc'
const TITLE = '对话目录'
// Change the tag when Prompt's fields change: it declines what an earlier
// version stored, which outlives a reload.
const prompts = atom({ plugin: 'chat-toc', key: 'prompts' } as const, [], {
  shape: 'prompts-1',
})
// The prompt row the transcript showed most recently: the reader's place.
const current = atom({ plugin: 'chat-toc', key: 'current' } as const, null)
// Whether the band above the prompt lists the prompts or keeps to one row.
const isExpanded = atom({ plugin: 'chat-toc', key: 'isExpanded' } as const, false)

// Rows the person wrote, not notifications or other agents' messages.
const OWN = new Set(['composer', 'bridge', 'sdk', 'unclassified'])

// Drawing is pure: a prompt row is noted here while it draws and written to
// state just after.
let pending = new Map<string, string>()
let seenHere: string | null = null
let isFlushing = false

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

const clip = (text: string, room: number) =>
  text.length > room ? `${text.slice(0, Math.max(1, room - 1))}…` : text

async function flush($: EngineInterface) {
  if (isFlushing) return
  isFlushing = true
  await $.clock.sleep(30)
  isFlushing = false
  const rows = pending
  const here = seenHere
  pending = new Map()
  seenHere = null

  if (rows.size > 0) {
    await update($, prompts, all => {
      const known = new Set(all.map(one => one.id))
      const list = all.map(one => ({ ...one, text: rows.get(one.id) ?? one.text }))
      for (const [id, text] of rows) {
        if (!known.has(id)) list.push({ id, text })
      }
      return list
    })
  }
  if (here !== null && (await read($, current)) !== here) {
    await update($, current, () => here)
  }
}

function label(one: Prompt, index: number, here: string | null, room: number) {
  return `${one.id === here ? '▶' : ' '} ${index + 1}. ${clip(one.text, room)}`
}

async function jump($: EngineInterface, one: Prompt) {
  await update($, current, () => one.id)
  try {
    const moved = await $.ui.scroll({ to: { requestId: one.id }, block: 'start' })
    if ('deny' in moved) $.ui.toast(`跳转失败：${moved.deny}`)
  } catch (error) {
    $.ui.toast(`跳转失败：${String(error)}`)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'toc',
      description: '打开对话目录：列出每条提问，点击跳转',
    })
    void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  })

  on('command.run', { command: 'toc' }, async $ => {
    await update($, isExpanded, () => true)
    const opened = await $.ui.open({ id: PANE, title: TITLE })
    if (opened.isPlaced) return { text: '对话目录已打开（侧边面板，输入框上方也有）。' }

    return { text: `侧边面板没有放出来：${opened.reason}。目录已在输入框上方展开。` }
  })

  // Every prompt row the transcript draws is recorded by its message id, the
  // render instance `$.ui.scroll` brings back into view.
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const { text, origin, task, from, onScreen } = e.props
    const isOwn = OWN.has(origin.kind) && task === undefined && from === undefined
    const line = oneLine(text)

    if (isOwn && line !== '') {
      const found = (await read($, prompts)).find(one => one.id === e.requestId)
      if (found?.text !== line) pending.set(e.requestId, line)
      if (onScreen) seenHere = e.requestId
      if (pending.size > 0 || seenHere !== null) void flush($)
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const list = await read($, prompts)
    const here = await read($, current)
    const room = Math.max(12, (e.props.bodyColumns ?? 40) - 8)

    return (
      <Box flexDirection="column">
        {list.length === 0 && <Text dimColor>还没有提问。发一条消息后这里会出现目录。</Text>}
        {list.length > 0 && <Text dimColor>共 {list.length} 条提问 · 点击跳到对应问答</Text>}
        {list.map((one, index) => (
          <Button
            key={`q-${one.id}`}
            label={label(one, index, here, room)}
            hotkey={index < 9 ? String(index + 1) : undefined}
            variant={one.id === here ? 'primary' : undefined}
            plain
            onPress={() => jump($, one)}
          />
        ))}
      </Box>
    )
  })

  // The same list in the band above the prompt: one row folded, the prompts
  // unfolded. Surfaces that seat no pane still draw this band.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const list = await read($, prompts)
    const here = await read($, current)
    const isOpen = await read($, isExpanded)
    const room = Math.max(12, e.props.bodyColumns - 8)

    return (
      <Box flexDirection="column">
        <Box>
          <Text dimColor>📑 对话目录 · {list.length} 条提问 </Text>
          <Button
            key="toggle"
            label={isOpen ? '收起' : '展开'}
            plain
            dimColor
            onPress={() => update($, isExpanded, open => !open)}
          />
        </Box>
        {isOpen &&
          list.map((one, index) => (
            <Button
              key={`b-${one.id}`}
              label={label(one, index, here, room)}
              variant={one.id === here ? 'primary' : undefined}
              plain
              onPress={() => jump($, one)}
            />
          ))}
      </Box>
    )
  })
}
