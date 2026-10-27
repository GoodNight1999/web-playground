export type Prompt = { id: string; text: string }

declare module 'claude-code' {
  interface PluginState {
    'chat-toc': { prompts: Shaped<Prompt[]>; current: string | null; isExpanded: boolean }
  }
}
