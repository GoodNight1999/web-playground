// 用 MathJax 把视频里用到的 TeX 公式预渲染成 SVG，生成 src/zeta/formulas.gen.ts。
// 运行时不再依赖 MathJax。改了下面的公式后执行：npm run formulas
import MathJax from '@mathjax/src'
import { writeFileSync } from 'node:fs'

const FORMULAS = {
  zeta_def: String.raw`\zeta(s)=\sum_{n=1}^{\infty}\frac{1}{n^{s}}`,
  trivial: String.raw`-2,\ \ -4,\ \ -6,\ \ \ldots`,
  strip: String.raw`0<\operatorname{Re}s<1`,
  line: String.raw`\operatorname{Re}s=\tfrac{1}{2}`,
  rho1: String.raw`\tfrac{1}{2}+14.1347\ldots\,i`,
  rho2: String.raw`\tfrac{1}{2}+21.0220\ldots\,i`,
  rho3: String.raw`\tfrac{1}{2}+25.0108\ldots\,i`,
  zeta_line: String.raw`\zeta\!\left(\tfrac{1}{2}+it\right)`,
  arg: String.raw`\arg\zeta(s)`,
  psi: String.raw`\psi(x)=x-\sum_{\rho}\frac{x^{\rho}}{\rho}-\log 2\pi-\tfrac{1}{2}\log\!\left(1-x^{-2}\right)`,
  psi_label: String.raw`\psi(x)`,
  x_label: String.raw`x`,
  final: String.raw`\operatorname{Re}(s)=\tfrac{1}{2}\ \ ?`,
  half: String.raw`\tfrac{1}{2}`,
  zero: String.raw`0`,
  one: String.raw`1`,
  re_axis: String.raw`\operatorname{Re}s`,
  im_axis: String.raw`\operatorname{Im}s`,
}

await MathJax.init({
  loader: { load: ['input/tex', 'output/svg'] },
  svg: { fontCache: 'none' },
})

const entries = []
for (const [id, tex] of Object.entries(FORMULAS)) {
  const node = await MathJax.tex2svgPromise(tex, { display: true })
  const html = MathJax.startup.adaptor.outerHTML(node)
  const svgs = html.match(/<svg[\s\S]*?<\/svg>/g)
  if (!svgs || svgs.length !== 1) throw new Error(`${id}: expected exactly one <svg>, got ${svgs?.length}`)
  let svg = svgs[0]
  if (svg.includes('merror')) throw new Error(`${id}: TeX error in ${tex}`)
  const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
  svg = svg
    .replace(/<rect data-background[^>]*><\/rect>/g, '')
    .replace(/\s(style|width|height|role|focusable)="[^"]*"/g, '')
    .replace(/\sdata-[\w-]+="[^"]*"/g, '')
  // viewBox 以 1/1000 em 为单位，y 轴原点在基线
  const em = (v) => Math.round(v) / 1000
  entries.push({ id, tex, w: em(vb[2]), h: em(vb[3]), ascent: em(-vb[1]), svg })
}

const body = entries
  .map(
    (e) =>
      `  ${e.id}: {\n    tex: ${JSON.stringify(e.tex)},\n    w: ${e.w}, h: ${e.h}, ascent: ${e.ascent},\n    svg: ${JSON.stringify(e.svg)},\n  },`,
  )
  .join('\n')

const out = `// 由 scripts/render-formulas.mjs 生成，不要手改。
// 尺寸单位为 em；svg 里的 currentColor 在运行时替换成实际颜色。

export type FormulaId =
${entries.map((e) => `  | '${e.id}'`).join('\n')}

export type FormulaData = { tex: string; w: number; h: number; ascent: number; svg: string }

export const FORMULAS: Record<FormulaId, FormulaData> = {
${body}
}
`

writeFileSync(new URL('../src/zeta/formulas.gen.ts', import.meta.url), out)
console.log(`wrote ${entries.length} formulas`)
