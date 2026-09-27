// 用 MathJax 把视频里用到的 TeX 公式预渲染成 SVG，生成 src/hilbert/formulas.gen.ts。
// 运行时不再依赖 MathJax。改了下面的公式后执行：npm run formulas
import MathJax from '@mathjax/src'
import { writeFileSync } from 'node:fs'

const FORMULAS = {
  // 前奏
  scaling: String.raw`N\varepsilon^{d-1}=\alpha`,
  collision: String.raw`v_i'=v_i-\big((v_i-v_j)\cdot\omega\big)\,\omega,\qquad v_j'=v_j+\big((v_i-v_j)\cdot\omega\big)\,\omega`,
  omega: String.raw`\omega=\frac{x_i-x_j}{\varepsilon}\in\mathbb{S}^{d-1}`,
  boltzmann: String.raw`(\partial_t+v\cdot\nabla_x)\,n=\alpha\int_{\mathbb{R}^d}\!\int_{\mathbb{S}^{d-1}}\big((v-v_1)\cdot\omega\big)_+\,(n'n_1'-n\,n_1)\,d\omega\,dv_1`,
  chaos: String.raw`f_2(t,z_1,z_2)\approx f(t,z_1)\,f(t,z_2)`,
  series: String.raw`\sum_{n}C^{n}t^{n}`,
  chaos_s: String.raw`f_s(t)\approx n(t)^{\otimes s}`,
  torus: String.raw`\mathbb{T}^d=\mathbb{R}^d/\mathbb{Z}^d`,
  // 主歌
  torus2: String.raw`\mathbb{T}^2`,
  // 第二主题：Lanford 与时间分层
  duhamel: String.raw`f_s(t)=\sum_{n\ge 0}\alpha^{n}\!\int_0^{t}\!\!\int_0^{t_1}\!\!\cdots\!\int_0^{t_{n-1}} S_s(t-t_1)\,\mathcal{C}_{s,s+1}\,S_{s+1}(t_1-t_2)\cdots\mathcal{C}_{s+n-1,s+n}\,S_{s+n}(t_n)\,f^{0}_{s+n}\,dt_n\cdots dt_1`,
  count: String.raw`\frac{(s+n-1)!}{(s-1)!}\cdot\frac{t^{n}}{n!}\ \lesssim\ C^{n}t^{n}`,
  layers: String.raw`[(\ell-1)\tau,\ \ell\tau],\quad \ell=1,\dots,L`,
  cumulant: String.raw`f_s=\prod_{j\in[s]}f_A(z_j)+\sum_{\emptyset\ne H\subseteq[s]}\Big(\prod_{j\in[s]\setminus H}f_A(z_j)\Big)\,E_H(z_H)`,
  cumbound: String.raw`\|E_H(\ell\tau)\|_{L^1}\le\varepsilon^{c|H|}`,
  molsum: String.raw`|E_H|\le\sum_{\mathbb{M}}|\mathcal{IN}_{\mathbb{M}}|`,
  // 副歌一：切割
  im: String.raw`\mathcal{I}_{\mathbb{M}}(Q)=\varepsilon^{-(d-1)(|\mathcal{E}|-2|\mathcal{M}|)}\int\prod_{\mathfrak{n}\in\mathcal{M}}\Delta_{\mathfrak{n}}\cdot Q\;dz_{\mathcal{E}}\,dt_{\mathcal{M}}`,
  fubini: String.raw`\mathcal{I}_{\mathbb{M}}=\mathcal{I}_{\mathbb{M}_1}\circ\mathcal{I}_{\mathbb{M}_2}`,
  gain3: String.raw`\lesssim|\log\varepsilon|^{C^*}`,
  gain33: String.raw`\lesssim\varepsilon^{\upsilon}`,
  gain4: String.raw`\lesssim\varepsilon^{-(d-1)}`,
  goal: String.raw`\upsilon\cdot\#\{\mathrm{good}\}+(d-1)\big(|H|-\#\{\mathrm{bad}\}\big)\ \ge\ c\,\rho`,
  nummol: String.raw`\#\mathbb{M}\le C^{|\mathbb{M}|}\,|\log\varepsilon|^{C\rho}`,
  eachmol: String.raw`\|\mathcal{IN}_{\mathbb{M}}\|_{L^1}\le\tau^{|\mathbb{M}|}\,\varepsilon^{\upsilon\rho}`,
  rho: String.raw`\rho=\#\{\text{bonds}\}-\#\{\text{atoms}\}+\#\{\text{components}\}`,
  // 副歌一后半：环面
  lattice: String.raw`|x-x'+t(v-v')-m|=\varepsilon,\qquad m\in\mathbb{Z}^d`,
  longbond: String.raw`|t_{\mathfrak{n}_1}-t_{\mathfrak{n}_2}|\gtrsim 1`,
  club: String.raw`\text{excess}\ \le\ \varepsilon^{\,d-1-\theta}`,
  excess: String.raw`\prod_j\sigma_j\ \le\ \varepsilon^{\,d-1+1/(15d)}`,
  // 歇息：阶段总结
  sum_chaos: String.raw`f_s\approx n^{\otimes s},\quad s\le|\log\varepsilon|`,
  // 副歌二：定理与流体极限
  thm1: String.raw`\Big\|\,f_s(t)-\prod_{j=1}^{s}n(t,z_j)\,\mathbb{1}_{D_s}\Big\|_{L^1(\mathbb{T}^{ds}\times\mathbb{R}^{ds})}\le\varepsilon^{\theta}`,
  thm1range: String.raw`t\in[0,t_{\mathrm{fin}}],\qquad s\le|\log\varepsilon|`,
  cond: String.raw`\max(1,\alpha)\cdot\max(1,A)\cdot\max(1,t_{\mathrm{fin}})\ll(\log|\log\varepsilon|)^{1/2}`,
  rayleigh: String.raw`\frac{|v|}{T}\,e^{-|v|^{2}/2T},\qquad T=\tfrac12`,
  maxwellian: String.raw`\mathcal{M}=\frac{\rho}{(2\pi T)^{d/2}}\,e^{-|v-u|^{2}/2T}`,
  hydro: String.raw`\alpha=\delta^{-1}\to\infty`,
  nsf: String.raw`\begin{cases}\partial_t u+u\cdot\nabla u-\mu_1\Delta u=-\nabla p\\ \partial_t\rho+u\cdot\nabla\rho-\mu_2\Delta\rho=0\\ \operatorname{div}u=0\end{cases}`,
  euler: String.raw`\begin{cases}\partial_t\rho+\nabla\cdot(\rho u)=0\\ \partial_t(\rho u)+\nabla\cdot(\rho u\otimes u)+\nabla p=0\\ \partial_t\big(\rho\,\frac{dT+|u|^2}{2}\big)+\nabla\cdot\big(\rho u\,\frac{dT+|u|^2}{2}\big)+\nabla\cdot(pu)=0,\quad p=\rho T\end{cases}`,
  nsfscale: String.raw`\mathbb{E}(N)\approx\varepsilon^{-(d-1)}\delta^{-1},\qquad t\in[0,\delta^{-1}T_{\mathrm{fin}}]`,
  nsff1: String.raw`\Big\|f_1-\frac{e^{-|v|^2/2}}{(2\pi)^{d/2}}\Big(1+\delta\big(\tfrac{2+d-|v|^2}{2}\,\rho(\delta t)+v\cdot u(\delta t)\big)\Big)\Big\|_{L^1_{x,v}}\lesssim\delta^{3/2}`,
  exact: String.raw`\psi=e^{-100\pi^2\mu_1 t}\sum_{|k|^2=25}a_k\,e^{2\pi i k\cdot x},\qquad (u,\rho)=(\nabla^{\perp}\psi,\,0)`,
  empirical: String.raw`\frac{1}{\delta N}\sum_{j=1}^{N}\mathbb{1}_{|v_j(t)|\le\varepsilon^{-\kappa}}\,\psi(x_j(t))\,v_j(t)\ \xrightarrow[\ \varepsilon,\delta\to0\ ]{\mathrm{prob.}}\ \int_{\mathbb{T}^d}\psi(x)\,u(\delta t,x)\,dx`,
  limit1: String.raw`\varepsilon\to0,\ \ N\varepsilon^{d-1}=\alpha`,
  limit2: String.raw`\alpha=\delta^{-1}\to\infty`,
  // 尾声
  dims: String.raw`\mathbb{T}^d,\ \ d=2,3`,
}

await MathJax.init({
  loader: { load: ['input/tex', 'output/svg'] },
  svg: { fontCache: 'none' },
})

const entries = []
for (const [id, tex] of Object.entries(FORMULAS)) {
  const node = await MathJax.tex2svgPromise(tex, { display: true })
  const html = MathJax.startup.adaptor.outerHTML(node)
  // 可伸缩的大括号等由内嵌的 <svg> 拼成：数一数最外层的 <svg> 只能有一个（MathJax 自动断行时会产生多个）
  let depth = 0
  let top = 0
  for (const m of html.matchAll(/<svg\b|<\/svg>/g)) {
    if (m[0] === '</svg>') depth--
    else if (depth++ === 0) top++
  }
  if (top !== 1) throw new Error(`${id}: expected exactly one outer <svg>, got ${top}`)
  let svg = html.slice(html.indexOf('<svg'), html.lastIndexOf('</svg>') + 6)
  if (svg.includes('merror')) throw new Error(`${id}: TeX error in ${tex}`)
  const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
  const open = svg.slice(0, svg.indexOf('>') + 1)
  svg =
    open.replace(/\s(style|width|height|role|focusable)="[^"]*"/g, '') +
    svg
      .slice(open.length)
      .replace(/<rect data-background[^>]*><\/rect>/g, '')
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

writeFileSync(new URL('../src/hilbert/formulas.gen.ts', import.meta.url), out)
console.log(`wrote ${entries.length} formulas`)
