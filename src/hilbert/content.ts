// 片中全部文字（中英双语，尽量短）。事实依据见文件末尾 SOURCES；信息截至 2026 年 9 月。
// $…$ 包住的部分按数学变量排成意大利体；较长的式子用 MathJax 预渲染（scripts/render-formulas.mjs）。

import type { FormulaId } from './formulas.gen'

export type Bi = { zh: string; en: string }

/** 前奏问答里答案上方配的小图 */
export type QAVisual =
  | 'hilbert'
  | 'route'
  | 'spheres'
  | 'scaling'
  | 'boltzmann'
  | 'chaos'
  | 'lanford'
  | 'series'
  | 'recollision'
  | 'perturbative'
  | 'longtime'
  | 'lifespan'
  | 'fluid'
  | 'theorem'
  | 'molecule'

/** 小节从 1 开始，off 为小节内的秒数（前奏每小节 3.75 秒，四拍，每拍 0.9375 秒） */
export type QA = { q: Bi; a: Bi; qBar: number; qOff: number; aBar: number; aOff: number; visual: QAVisual; station: string }

export const QAS: QA[] = [
  {
    qBar: 1, qOff: 0, aBar: 2, aOff: 0, visual: 'hilbert', station: '第六问题',
    q: { zh: '希尔伯特第六问题，要的是什么？', en: 'What does Hilbert’s sixth problem ask for?' },
    a: { zh: '从原子论到连续介质运动定律的极限过程。', en: 'The limiting processes from the atomistic view to the laws of motion of continua.' },
  },
  {
    qBar: 3, qOff: 0, aBar: 4, aOff: 0, visual: 'route', station: '途径',
    q: { zh: '他指明的途径？', en: 'The route he pointed to?' },
    a: { zh: '玻尔兹曼的动理学理论。', en: 'Boltzmann’s kinetic theory.' },
  },
  {
    qBar: 5, qOff: 0, aBar: 5, aOff: 2.22, visual: 'spheres', station: '硬球',
    q: { zh: '微观模型？', en: 'The microscopic model?' },
    a: { zh: '直径 ε 的硬球，弹性碰撞。', en: 'Hard spheres of diameter ε, elastic collisions.' },
  },
  {
    qBar: 6, qOff: 0, aBar: 6, aOff: 2.22, visual: 'scaling', station: '标度',
    q: { zh: '什么标度？', en: 'Which scaling?' },
    a: { zh: 'Boltzmann–Grad 标度。', en: 'The Boltzmann–Grad scaling.' },
  },
  {
    qBar: 7, qOff: 0, aBar: 7, aOff: 2.22, visual: 'boltzmann', station: '方程',
    q: { zh: '极限方程？', en: 'The limiting equation?' },
    a: { zh: '玻尔兹曼方程。', en: 'The Boltzmann equation.' },
  },
  {
    qBar: 8, qOff: 0, aBar: 8, aOff: 2.22, visual: 'chaos', station: '混沌',
    q: { zh: '它依赖什么假设？', en: 'What does it rest on?' },
    a: { zh: '分子混沌。', en: 'Molecular chaos — the Stosszahlansatz.' },
  },
  {
    qBar: 9, qOff: 0, aBar: 9, aOff: 2.22, visual: 'lanford', station: 'Lanford',
    q: { zh: '能证明吗？', en: 'Can it be proved?' },
    a: { zh: 'Lanford，1975：仅在短时间内。', en: 'Lanford, 1975: for short times only.' },
  },
  {
    qBar: 10, qOff: 0, aBar: 10, aOff: 2.22, visual: 'series', station: '收敛半径',
    q: { zh: '为什么只有短时间？', en: 'Why only short times?' },
    a: { zh: '展开式只在 $t$ < $C$⁻¹ 时收敛。', en: 'The expansion converges only for $t$ < $C$⁻¹.' },
  },
  {
    qBar: 11, qOff: 0, aBar: 11, aOff: 0.94, visual: 'recollision', station: '重碰撞',
    q: { zh: '难点？', en: 'The difficulty?' },
    a: { zh: '重碰撞与关联。', en: 'Recollisions and correlations.' },
  },
  {
    qBar: 11, qOff: 1.87, aBar: 11, aOff: 2.81, visual: 'perturbative', station: '微扰',
    q: { zh: '此后近五十年？', en: 'The next half-century?' },
    a: { zh: '只在微扰情形。', en: 'Perturbative regimes only.' },
  },
  {
    qBar: 12, qOff: 0, aBar: 12, aOff: 0.94, visual: 'longtime', station: '2024',
    q: { zh: '长时间呢？', en: 'And for long times?' },
    a: { zh: 'Deng · Hani · Ma，2024。', en: 'Deng · Hani · Ma, 2024.' },
  },
  {
    qBar: 12, qOff: 1.87, aBar: 12, aOff: 2.81, visual: 'lifespan', station: '寿命',
    q: { zh: '多长？', en: 'How long?' },
    a: { zh: '玻尔兹曼解的整个存在区间。', en: 'The full lifespan of the Boltzmann solution.' },
  },
  {
    qBar: 13, qOff: 0, aBar: 13, aOff: 0.94, visual: 'fluid', station: '流体',
    q: { zh: '流体方程？', en: 'The fluid equations?' },
    a: { zh: '2025：环面上的 NSF 与 Euler。', en: '2025: NSF and Euler on the torus.' },
  },
  {
    qBar: 13, qOff: 1.87, aBar: 13, aOff: 2.81, visual: 'theorem', station: '定理',
    q: { zh: '分子混沌呢？', en: 'And molecular chaos?' },
    a: { zh: '由假设成为定理。', en: 'From assumption to theorem.' },
  },
  {
    qBar: 14, qOff: 0, aBar: 14, aOff: 1.87, visual: 'molecule', station: '分子',
    q: { zh: '证明的核心？', en: 'The heart of the proof?' },
    a: { zh: '图：分子。', en: 'Diagrams: molecules.' },
  },
]

/** 主歌：硬球动力学（arXiv:2503.01800 定义 1.1） */
export const GAS: { title: Bi; params: string; history: Bi; roots: Bi } = {
  title: { zh: '硬球动力学', en: 'Hard-sphere dynamics' },
  params: 'd = 2   N = 100   ε = 0.012',
  history: { zh: '末时刻两个粒子在 [t₀, T] 内的碰撞历史', en: 'The collision history on [t₀, T] of two particles at the final time' },
  roots: { zh: '根粒子', en: 'roots' },
}

export const SPACETIME: { title: Bi; reduce: Bi[]; layers: Bi } = {
  title: { zh: '时空中的世界线', en: 'World-lines in space-time' },
  reduce: [
    { zh: '碰撞 → 原子', en: 'collision → atom' },
    { zh: '自由输运 → 边', en: 'free transport → edge' },
    { zh: '同一粒子 → 粒子线', en: 'one particle → one particle line' },
  ],
  layers: { zh: '拓扑约化：分子', en: 'Topological reduction: a molecule' },
}

export const LANFORD: { title: Bi; note: Bi } = {
  title: { zh: 'Lanford：BBGKY 层级的 Duhamel 展开', en: 'Lanford: Duhamel expansion of the BBGKY hierarchy' },
  note: { zh: '每一项是一棵倒向碰撞树', en: 'Each term is a backward collision tree' },
}

export const LAYERS: { title: Bi; partial: Bi; arrow: Bi; cluster: Bi } = {
  title: { zh: '时间分层', en: 'Time layering' },
  cluster: { zh: '每一层内，碰撞团簇很小', en: 'Within each layer, collision clusters are small' },
  arrow: { zh: '只靠同一个（对速度翻转不变的）范数的小性无法逐层归纳：玻尔兹曼方程不可逆', en: 'Smallness in one velocity-flip-invariant norm cannot be propagated layer by layer: the Boltzmann equation is irreversible' },
  partial: { zh: '部分时间展开：只把累积量一直展开到 $t$ = 0', en: 'Partial time expansion: only cumulants are expanded down to $t$ = 0' },
}

export const CUTTING: { title: Bi; kinds: { id: string; zh: string; en: string }[]; greedy: Bi } = {
  title: { zh: '切割：按 Fubini 定理选择积分次序', en: 'Cutting: choosing the order of integration' },
  kinds: [
    { id: '{3}', zh: '碰撞 · 正常', en: 'collision · normal' },
    { id: '{2}', zh: '重碰撞 · 正常', en: 'recollision · normal' },
    { id: '{33}', zh: '碰撞后重碰撞 · 好', en: 'collision then recollision · good' },
    { id: '{4}', zh: '坏', en: 'bad' },
  ],
  greedy: { zh: '难点：让 {33} 的个数 ≳ ρ', en: 'The difficulty: produce ≳ ρ good {33} components' },
}

export const TORUS: { title: Bi; twice: Bi; measure: Bi; bfk: Bi; long: Bi; club: Bi } = {
  title: { zh: '环面上的新现象', en: 'What is new on the torus' },
  twice: { zh: '两粒子可以相继碰撞两次', en: 'Two particles may collide twice in a row' },
  measure: { zh: '此时 $v$ − $v$′ 几乎平行于某个 $m$ ≠ 0：测度 O(εᵈ⁻¹)', en: 'then $v$ − $v$′ is almost parallel to some $m$ ≠ 0: measure O(εᵈ⁻¹)' },
  bfk: { zh: '固定个数的粒子可碰撞任意多次：Burago–Ferleger–Kononenko 上界失效', en: 'Finitely many particles may collide arbitrarily often: no Burago–Ferleger–Kononenko bound' },
  long: { zh: '长键：相邻碰撞在时间上 O(1) 分离', en: 'Long bonds: adjacent collisions O(1)-separated in time' },
  club: { zh: '含长键的 {33A}', en: '{33A} with a long bond' },
}

export type Summary = { zh: string; en: string; formula?: FormulaId }

export const SUMMARY: Summary[] = [
  { zh: '分子混沌：由假设成为定理', en: 'Molecular chaos: from hypothesis to theorem', formula: 'sum_chaos' },
  { zh: '有效于玻尔兹曼解的整个存在区间', en: 'Valid on the full lifespan of the Boltzmann solution' },
  { zh: '累积量的部分时间展开，化为分子的组合问题', en: 'Partial time expansion of cumulants: a combinatorial problem on molecules' },
  { zh: '切割算法：足够多的 {33}，每个增益 ευ', en: 'The cutting algorithm: enough {33} components, each gaining ευ' },
]

export const KINETIC: { title: Bi; sample: Bi; hydro: Bi; nsf: Bi; euler: Bi } = {
  title: { zh: '定理 1（环面，d = 2, 3）', en: 'Theorem 1 (torus, d = 2, 3)' },
  sample: { zh: '硬球 N = 400，ε = 0.004，初速 |$v$| = 1：速度的经验分布', en: 'Hard spheres, N = 400, ε = 0.004, initial speeds |$v$| = 1: empirical velocity distribution' },
  hydro: { zh: '流体力学极限：碰撞率 α → ∞', en: 'Hydrodynamic limit: collision rate α → ∞' },
  nsf: { zh: '不可压 Navier–Stokes–Fourier', en: 'Incompressible Navier–Stokes–Fourier' },
  euler: { zh: '可压 Euler', en: 'Compressible Euler' },
}

export const FLUID: { exact: Bi; empirical: Bi; chainTitle: Bi; chain: [string, string, string]; chainEn: [string, string, string] } = {
  chainTitle: { zh: '从牛顿到流体', en: 'From Newton to fluids' },
  exact: { zh: 'NSF 的一个精确解：|$k$|² = 25 的本征模叠加', en: 'An exact NSF solution: a superposition of |$k$|² = 25 eigenmodes' },
  empirical: { zh: '宏观量由粒子的经验平均直接得到', en: 'Fluid fields are limits of empirical averages over particles' },
  chain: ['牛顿', '玻尔兹曼', '流体'],
  chainEn: ['Newton', 'Boltzmann', 'Navier–Stokes–Fourier · Euler'],
}

export const OUTRO: Bi = { zh: '希尔伯特第六问题', en: 'Hilbert’s Sixth Problem' }
export const OUTRO_SCOPE: Bi = {
  zh: '稀薄硬球气体 · Boltzmann–Grad 标度 · 环面，d = 2, 3',
  en: 'Rarefied hard-sphere gas · Boltzmann–Grad scaling · torus, d = 2, 3',
}
export const OUTRO_REFS = 'Y. Deng, Z. Hani, X. Ma   arXiv:2408.07818 · arXiv:2503.01800'
export const OUTRO_FIELDS: Bi = { zh: '邓煜 · 2026 年菲尔兹奖', en: 'Yu Deng · Fields Medal 2026' }
export const OUTRO_NOTE: Bi = {
  zh: '片中硬球轨迹、分子与切割序列由事件驱动模拟算出，流场为精确解 · 信息截至 2026 年 9 月',
  en: 'Trajectories, molecules and cuttings come from an event-driven simulation; the flow is an exact solution · as of September 2026',
}
export const MUSIC_CREDIT = '音乐 Music　ハイスイノナサ「地下鉄の動態」'

/** 页面下方列出的出处，方便核对 */
export const SOURCES: { label: string; url: string }[] = [
  { label: 'Y. Deng, Z. Hani, X. Ma — Long time derivation of the Boltzmann equation from hard sphere dynamics（2024）', url: 'https://arxiv.org/abs/2408.07818' },
  { label: 'Y. Deng, Z. Hani, X. Ma — Hilbert’s sixth problem: derivation of fluid equations via Boltzmann’s kinetic theory（2025）', url: 'https://arxiv.org/abs/2503.01800' },
  { label: 'D. Hilbert — Mathematical Problems（1900），第六问题', url: 'https://en.wikipedia.org/wiki/Hilbert%27s_sixth_problem' },
  { label: 'O. E. Lanford — Time evolution of large classical systems（1975）', url: 'https://doi.org/10.1007/3-540-07171-7_1' },
  { label: 'IMU — 2026 年菲尔兹奖（邓煜的获奖评语提及由硬球动力学严格推导玻尔兹曼方程）', url: 'https://www.mathunion.org/imu-awards/fields-medal/fields-medals-2026' },
  { label: 'S. Gao — 对该结果物理意义的评论（arXiv:2504.06297）', url: 'https://arxiv.org/abs/2504.06297' },
  { label: '大西景太 — 地下鉄の動態 MV（视觉风格参考）', url: 'https://www.keitaonishi.com/dynamics-of-the-subway' },
]
