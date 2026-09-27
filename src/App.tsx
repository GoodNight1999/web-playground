import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">web-playground</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          React + TypeScript + Vite + Tailwind CSS
        </p>
      </div>
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-500 active:scale-95"
      >
        点了 {count} 次
      </button>
      <a
        href={`${import.meta.env.BASE_URL}zeta/`}
        className="rounded-lg px-5 py-3 text-center ring-1 ring-slate-300 transition hover:bg-slate-100 dark:ring-slate-700 dark:hover:bg-slate-900"
      >
        <span className="block font-medium">黎曼猜想</span>
        <span className="block text-sm text-slate-500">动态演示视频 · 配乐ハイスイノナサ「地下鉄の動態」</span>
      </a>
      <p className="text-sm text-slate-500">
        修改{' '}
        <code className="rounded bg-slate-200 px-1.5 py-0.5 dark:bg-slate-800">
          src/App.tsx
        </code>{' '}
        开始开发
      </p>
    </main>
  )
}

export default App
