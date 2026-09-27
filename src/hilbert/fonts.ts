// 字体随站点一起打包（fontsource），不依赖 Google Fonts，国内网络和发布会现场离线都能用。
// 思源宋体按 unicode-range 切片，只会下载实际用到的字所在的切片。
import '@fontsource-variable/noto-serif-sc/index.css'
import '@fontsource-variable/source-serif-4/opsz.css'
import '@fontsource-variable/source-serif-4/opsz-italic.css'
import '@fontsource/ibm-plex-mono/300.css'
import '@fontsource/ibm-plex-mono/400.css'
import * as content from './content'

function collectText(v: unknown, out: string[]) {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) v.forEach((x) => collectText(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => collectText(x, out))
}

/** 画布绘制前必须确保字体已加载，否则第一帧会用回退字体 */
export async function loadFonts(): Promise<void> {
  const parts: string[] = []
  collectText(content, parts)
  const sample = Array.from(new Set(Array.from(parts.join('') + '0123456789·–—“”‘’ABCDEFGHIJKLMNOPQRSTUVWXYZ'))).join('')
  const faces = [
    '300 40px "Noto Serif SC Variable"',
    '400 40px "Noto Serif SC Variable"',
    '600 40px "Noto Serif SC Variable"',
    '700 40px "Noto Serif SC Variable"',
    '400 40px "Source Serif 4 Variable"',
    '600 40px "Source Serif 4 Variable"',
    'italic 400 40px "Source Serif 4 Variable"',
    'italic 300 40px "Source Serif 4 Variable"',
    '300 40px "IBM Plex Mono"',
    '400 40px "IBM Plex Mono"',
  ]
  await Promise.all(faces.map((f) => document.fonts.load(f, sample)))
  await document.fonts.ready
}
