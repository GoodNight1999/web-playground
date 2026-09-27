// 用 MathJax 把视频里用到的 TeX 公式预渲染成 SVG，生成 src/ns-blowup/formulas.gen.ts。
// 运行时不再依赖 MathJax。改了下面的公式后执行：npm run formulas
import MathJax from '@mathjax/src'
import { writeFileSync } from 'node:fs'

const FORMULAS = {
  // 方程逐项拆开，便于逐项卡点出现
  eq_dtu: String.raw`\partial_t u`,
  eq_conv: String.raw`(u\cdot\nabla)u`,
  eq_visc: String.raw`\nu\Delta u`,
  eq_grad: String.raw`\nabla p`,
  eq_f: String.raw`f`,
  eq_div: String.raw`\nabla\cdot u=0`,
  eq_plus: String.raw`{}+{}`,
  eq_minus: String.raw`{}-{}`,
  eq_eq: String.raw`{}={}`,
  eq_comma: String.raw`,`,

  ns_compact: String.raw`\partial_t u+(u\cdot\nabla)u-\nu\Delta u+\nabla p=f,\qquad \nabla\cdot u=0`,

  // OpenAI (2026) Theorem 1.1，逐字对应论文陈述
  thm_l1: String.raw`\forall\,\nu>0\quad \exists\; f\in C_c^{\infty}\big(\mathbb{R}^3\times(0,\infty);\,\mathbb{R}^3\big),\quad K\subset\mathbb{R}^3\ \text{compact},\quad u,\,p\ \text{smooth on}\ \mathbb{R}^3\times[0,1)`,
  thm_l2: String.raw`\partial_t u+(u\cdot\nabla)u-\nu\Delta u+\nabla p=f,\qquad \nabla\cdot u=0,\qquad u(\cdot,0)=0`,
  thm_l3: String.raw`\operatorname{supp}u(\cdot,t)\cup\operatorname{supp}p(\cdot,t)\subset K\quad (0\le t<1)`,
  thm_l4: String.raw`\displaystyle\sup_{0\le t<1}\|u(t)\|_{L^2(\mathbb{R}^3)}<\infty,\qquad \limsup_{t\uparrow 1}\|u(t)\|_{L^\infty(\mathbb{R}^3)}=\infty`,

  // 论文 §2.1 的核心尺度律
  sc_lr: String.raw`\ell_r\asymp\tau^{1/2}`,
  sc_lz: String.raw`\ell_z\asymp\tau^{1/2-h}`,
  sc_u: String.raw`|u_\theta|,\ |u_z|\asymp\tau^{-1/2-h}`,
  sc_tau: String.raw`\tau=1-t,\qquad 0<h<\tfrac{1}{100}`,
  lbl_lr: String.raw`\ell_r`,
  lbl_lz: String.raw`\ell_z`,

  // 示意曲线的坐标标注
  g_linf: String.raw`\|u(t)\|_{L^\infty}`,
  g_l2: String.raw`\|u(t)\|_{L^2}`,
  g_t: String.raw`t`,
  g_0: String.raw`0`,
  g_1: String.raw`1`,
  g_t1: String.raw`t=1`,
  g_inf: String.raw`\to\infty`,
  g_sup: String.raw`\sup_{t<1}\|u(t)\|_{L^2}<\infty`,

  // 费弗曼问题陈述的四个命题
  q_r3: String.raw`\mathbb{R}^3`,
  q_t3: String.raw`\mathbb{R}^3/\mathbb{Z}^3`,
  q_f0: String.raw`f\equiv 0`,
  q_fs: String.raw`f\in C^{\infty}`,
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

writeFileSync(new URL('../src/ns-blowup/formulas.gen.ts', import.meta.url), out)
console.log(`wrote ${entries.length} formulas`)
