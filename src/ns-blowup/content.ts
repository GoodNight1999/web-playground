// 视频的全部文字内容（中英双语）与分镜参数。
// 事实依据见文件末尾 SOURCES；信息截至 2026 年 9 月。措辞刻意区分“论文声称”和“已获认定”。

export type SceneId =
  | 'open'
  | 'title'
  | 'equations'
  | 'millennium'
  | 'question'
  | 'history'
  | 'announce'
  | 'theorem'
  | 'mechanism'
  | 'blowup'
  | 'verify'
  | 'status'
  | 'credits'
  | 'end'

export type Bi = { zh: string; en: string }
export type Sub = Bi & { cue: number }

export type SceneSpec = {
  id: SceneId
  /** 相对时长 */
  weight: number
  /** 场景内需要卡点的事件数 */
  cues: number
  /** 相邻 cue 的最小间隔（秒），保证字幕读得完 */
  minGap: number
  /** 这个 cue 取场景内 [from, to] 区间最强的起音，用作高潮点 */
  accent?: { cue: number; from: number; to: number }
  marker?: Bi
  subs: Sub[]
  /** 背景流线的不透明度 */
  flow: number
}

export const SCENES: SceneSpec[] = [
  {
    id: 'open',
    weight: 7,
    cues: 2,
    minGap: 3,
    flow: 1,
    marker: { zh: '序', en: 'Prologue' },
    subs: [
      { cue: 0, zh: '流体的运动，由一组偏微分方程描述。', en: 'The motion of a fluid is described by a system of partial differential equations.' },
      { cue: 1, zh: '纳维（1822）· 斯托克斯（1845）', en: 'Navier (1822) · Stokes (1845)' },
    ],
  },
  {
    id: 'title',
    weight: 4,
    cues: 2,
    minGap: 1.2,
    flow: 0.55,
    subs: [],
  },
  {
    id: 'equations',
    weight: 10,
    cues: 7,
    minGap: 1.1,
    flow: 0.28,
    marker: { zh: 'I · 方程', en: 'The Equations' },
    subs: [
      { cue: 0, zh: '三维不可压缩纳维–斯托克斯方程', en: 'The three-dimensional incompressible Navier–Stokes equations' },
      { cue: 6, zh: '$u$ 为速度场，$p$ 为压强，$ν$ > 0 为粘性系数，$f$ 为外力。', en: '$u$ is the velocity field, $p$ the pressure, $ν$ > 0 the viscosity, $f$ the external force.' },
    ],
  },
  {
    id: 'millennium',
    weight: 9,
    cues: 9,
    minGap: 0.55,
    flow: 0.18,
    marker: { zh: 'II · 千禧年大奖难题', en: 'Millennium Prize Problems' },
    subs: [
      { cue: 0, zh: '2000 年，克雷数学研究所公布七个千禧年大奖难题，每题奖金一百万美元。', en: 'In 2000 the Clay Mathematics Institute named seven Millennium Prize Problems, each with a prize of one million US dollars.' },
      { cue: 8, zh: '其中之一：纳维–斯托克斯方程解的存在性与光滑性。', en: 'One of them: Navier–Stokes existence and smoothness.' },
    ],
  },
  {
    id: 'question',
    weight: 10,
    cues: 6,
    minGap: 1.2,
    flow: 0.2,
    marker: { zh: 'III · 问题', en: 'The Problem' },
    subs: [
      { cue: 0, zh: '粘性的光滑作用，能否始终阻止三维流动在有限时间内出现奇点？', en: 'Is viscous smoothing always enough to prevent a finite-time singularity in three dimensions?' },
      { cue: 5, zh: '费弗曼撰写的官方问题陈述给出四个命题，证明其中之一即可。', en: "Fefferman's official problem statement asks for a proof of one of four statements." },
    ],
  },
  {
    id: 'history',
    weight: 11,
    cues: 8,
    minGap: 0.8,
    flow: 0.25,
    marker: { zh: 'IV · 部分答案', en: 'Partial Answers' },
    subs: [
      { cue: 0, zh: '近一个世纪里，数学家得到了许多重要的部分结果。', en: 'For nearly a century, mathematicians obtained many important partial results.' },
      { cue: 7, zh: 'Córdoba、Martínez-Zoroa 等人：通过跨尺度放大，构造带外力的奇点。', en: 'Córdoba, Martínez-Zoroa and coauthors: forced singularities through amplification across scales.' },
    ],
  },
  {
    id: 'announce',
    weight: 8,
    cues: 5,
    minGap: 1.3,
    flow: 0.35,
    marker: { zh: 'V · 2026', en: 'Announcement' },
    subs: [
      { cue: 1, zh: 'OpenAI 发布论文《Finite Time Blowup for Navier–Stokes》。', en: 'OpenAI released the paper “Finite Time Blowup for Navier–Stokes”.' },
      { cue: 3, zh: '据 OpenAI 介绍：约一万个 AI 智能体协作，用时 88 小时。', en: 'According to OpenAI: about 10,000 AI agents working together over 88 hours.' },
      { cue: 4, zh: '论文称：它证明了费弗曼陈述中的命题 (C)，并由此推出 (D)。', en: 'The paper states that it establishes alternative (C) of Fefferman’s statement, and (D) as a corollary.' },
    ],
  },
  {
    id: 'theorem',
    weight: 12,
    cues: 5,
    minGap: 2.2,
    flow: 0.12,
    marker: { zh: 'VI · 定理', en: 'The Theorem' },
    subs: [
      { cue: 1, zh: '对任意粘性 $ν$ > 0，存在光滑、在时空中紧支的外力 $f$，', en: 'For every viscosity $ν$ > 0 there is a smooth force $f$, compactly supported in space and time,' },
      { cue: 2, zh: '使从静止出发的流体满足纳维–斯托克斯方程；', en: 'driving a fluid that starts from rest under the Navier–Stokes equations;' },
      { cue: 3, zh: '其动能始终有界，而当 $t$ → 1 时速度无界。', en: 'its kinetic energy stays bounded, while its velocity becomes unbounded as $t$ → 1.' },
      { cue: 4, zh: '因此：在同一外力与初值下，不存在动能一致有界的全局光滑解。', en: 'Hence no global smooth solution with uniformly bounded energy exists for this force and initial datum.' },
    ],
  },
  {
    id: 'mechanism',
    weight: 14,
    cues: 5,
    minGap: 2.6,
    flow: 0,
    marker: { zh: 'VII · 机制', en: 'The Mechanism' },
    subs: [
      { cue: 0, zh: '构造的核心：一个自相似收缩的涡旋。', en: 'At the heart of the construction: a self-similar, contracting vortex.' },
      { cue: 1, zh: '流体螺旋着流向轴线，再沿轴向流出。', en: 'Fluid spirals in toward the axis and flows out along it.' },
      { cue: 2, zh: '径向收缩快于轴向：涡核愈发细长，速度无界增长。', en: 'It contracts faster radially than axially: the core grows slender as its speeds grow without bound.' },
      { cue: 3, zh: '环状振荡脉冲的非线性动量通量，抵消了残差中的奇异部分，', en: 'The nonlinear momentum flux of oscillatory ring pulses cancels the singular part of the residual,' },
      { cue: 4, zh: '再经逐阶修正，所需外力在奇点时刻依然光滑。', en: 'Further corrections leave a force that stays smooth through the singular time.' },
    ],
  },
  {
    id: 'blowup',
    weight: 10,
    cues: 4,
    minGap: 1.8,
    accent: { cue: 2, from: 0.5, to: 0.82 },
    flow: 0.08,
    marker: { zh: 'VIII · 爆破', en: 'Blowup' },
    subs: [
      { cue: 0, zh: '动能：始终有界。', en: 'Kinetic energy: bounded throughout.' },
      { cue: 1, zh: '最大速度：无界。', en: 'Maximum speed: unbounded.' },
      { cue: 2, zh: '$t$ = 1：奇点形成。', en: '$t$ = 1: a singularity forms.' },
      { cue: 3, zh: '从静止与光滑外力出发，在有限时间内爆破。', en: 'From rest, under a smooth force, blowup in finite time.' },
    ],
  },
  {
    id: 'verify',
    weight: 8,
    cues: 4,
    minGap: 2.2,
    flow: 0.12,
    marker: { zh: 'IX · 形式化验证', en: 'Formal Verification' },
    subs: [
      { cue: 0, zh: '论文共 166 页，并附有 Lean 4 形式化证明。', en: 'The paper runs to 166 pages and comes with a formal proof in Lean 4.' },
      { cue: 2, zh: '形式化证明由计算机逐步检验，代码已公开。', en: 'The formal proof is checked step by step by computer; the code is public.' },
      { cue: 3, zh: '机器检验保证形式化命题的证明无误；命题是否忠实刻画原问题，仍需数学家审阅。', en: 'Machine checking certifies the proof of the formal statement; whether that statement faithfully captures the problem still needs human review.' },
    ],
  },
  {
    id: 'status',
    weight: 10,
    cues: 5,
    minGap: 2.2,
    flow: 0.12,
    marker: { zh: 'X · 现状', en: 'Status' },
    subs: [],
  },
  {
    id: 'credits',
    weight: 9,
    cues: 4,
    minGap: 2.2,
    flow: 0.3,
    marker: { zh: 'XI · 致谢', en: 'Acknowledgements' },
    subs: [
      { cue: 0, zh: '这一结果建立在几代数学家的工作之上。', en: 'This result builds on the work of generations of mathematicians.' },
      { cue: 3, zh: '相关独立工作：Alpöge 与 Buckmaster 于 2026 年 9 月公开了欧拉、Boussinesq 与多孔介质方程带光滑外力的有限时间爆破证明。', en: 'Related independent work: in September 2026 Alpöge and Buckmaster made public proofs of finite-time blowup with smooth forcing for the Euler, Boussinesq and porous-media equations.' },
    ],
  },
  {
    id: 'end',
    weight: 7,
    cues: 2,
    minGap: 1.5,
    flow: 0.45,
    subs: [],
  },
]

export const TITLE: Bi & { tagZh: string; tagEn: string } = {
  zh: '纳维–斯托克斯方程的有限时间爆破',
  en: 'Finite Time Blowup for Navier–Stokes',
  tagZh: '千禧年大奖难题的最新进展',
  tagEn: 'A new development on a Millennium Prize Problem',
}

export const EQUATION_TERMS: { id: 'eq_dtu' | 'eq_conv' | 'eq_visc' | 'eq_grad' | 'eq_f' | 'eq_div'; label: Bi }[] = [
  { id: 'eq_dtu', label: { zh: '局部加速度', en: 'local acceleration' } },
  { id: 'eq_conv', label: { zh: '对流项（非线性）', en: 'convection (nonlinear)' } },
  { id: 'eq_visc', label: { zh: '粘性', en: 'viscosity' } },
  { id: 'eq_grad', label: { zh: '压强梯度', en: 'pressure gradient' } },
  { id: 'eq_f', label: { zh: '外力', en: 'external force' } },
  { id: 'eq_div', label: { zh: '不可压缩', en: 'incompressibility' } },
]

/** 克雷研究所官网的排列顺序 */
export const MILLENNIUM: (Bi & { note?: Bi; ns?: boolean })[] = [
  { zh: '贝赫和斯维讷通-戴尔猜想', en: 'Birch and Swinnerton-Dyer Conjecture' },
  { zh: '霍奇猜想', en: 'Hodge Conjecture' },
  { zh: '纳维–斯托克斯方程', en: 'Navier–Stokes Equation', ns: true, note: { zh: '2026 · 已提出解答，尚待认定', en: '2026 · proposed solution, not yet recognized' } },
  { zh: 'P 与 NP 问题', en: 'P vs NP' },
  { zh: '庞加莱猜想', en: 'Poincaré Conjecture', note: { zh: '已解决 · 佩雷尔曼', en: 'Solved · Perelman' } },
  { zh: '黎曼猜想', en: 'Riemann Hypothesis' },
  { zh: '杨–米尔斯存在性与质量间隙', en: 'Yang–Mills Existence and Mass Gap' },
]

/** Fefferman 官方问题陈述中的四个命题 */
export const ALTERNATIVES: { key: string; title: Bi; domain: 'q_r3' | 'q_t3'; forced: boolean }[] = [
  { key: 'A', title: { zh: '存在性与光滑性', en: 'Existence and smoothness' }, domain: 'q_r3', forced: false },
  { key: 'B', title: { zh: '存在性与光滑性', en: 'Existence and smoothness' }, domain: 'q_t3', forced: false },
  { key: 'C', title: { zh: '解的破裂', en: 'Breakdown of solutions' }, domain: 'q_r3', forced: true },
  { key: 'D', title: { zh: '解的破裂', en: 'Breakdown of solutions' }, domain: 'q_t3', forced: true },
]

export const HISTORY: { year: string; who: string; what: Bi }[] = [
  { year: '1934', who: 'Leray', what: { zh: '全局有限能量弱解', en: 'global finite-energy weak solutions' } },
  { year: '1982', who: 'Caffarelli · Kohn · Nirenberg', what: { zh: '部分正则性', en: 'partial regularity' } },
  { year: '2003', who: 'Escauriaza · Seregin · Šverák', what: { zh: 'L³ 范数有界时的正则性', en: 'regularity under a bounded L³ norm' } },
  { year: '2016', who: 'Tao', what: { zh: '平均化方程的有限时间爆破', en: 'blowup for an averaged equation' } },
  { year: '2019', who: 'Buckmaster · Vicol', what: { zh: '弱解的非唯一性', en: 'non-uniqueness of weak solutions' } },
  { year: '2022', who: 'Albritton · Brué · Colombo', what: { zh: '带外力 Leray 解的非唯一性', en: 'non-uniqueness of forced Leray solutions' } },
  { year: '2023–', who: 'Córdoba · Martínez-Zoroa · Zheng', what: { zh: '欧拉等方程带外力的奇点', en: 'forced singularities for Euler and related equations' } },
]

export const ANNOUNCE = {
  date: { zh: '2026 年 9 月 8 日', en: '8 September 2026' },
  paper: 'Finite Time Blowup for Navier–Stokes',
  stats: [
    { big: '166', zh: '页', en: 'pages' },
    { big: 'Lean 4', zh: '形式化证明', en: 'formal proof' },
    { big: '(C) · (D)', zh: '论文声称的命题', en: 'alternatives claimed' },
  ],
}

/** 论文目录（原文） */
export const PAPER_TOC: [string, string][] = [
  ['1', 'Introduction'],
  ['2', 'Physical description of the blowup'],
  ['3', 'Proof outline'],
  ['4', 'Constructing the leading order flow'],
  ['5', 'Correcting the base flow to every order'],
  ['6', 'Auxiliary torus and separation of oscillatory supports'],
  ['7', 'Oscillatory realization and correction of the residual stress'],
  ['8', 'Compactly supported mean corrections'],
  ['9', 'Residual improvement and the local field'],
  ['10', 'Compact forcing and whole-space breakdown'],
  ['A', 'Matching radial moments and constructing the heat exterior'],
  ['B', 'Analytic profiles near the axis and their continuation'],
  ['C', 'Realizing the admissible stress cone'],
]

export const STATUS_HEAD: Bi = { zh: '学术现状 · 截至 2026 年 9 月', en: 'Status as of September 2026' }
export const STATUS: Bi[] = [
  { zh: '论文尚未经同行评审发表', en: 'Not yet published after peer review' },
  { zh: '克雷数学研究所：问题状态为 “Active”，尚未认定', en: 'Clay Mathematics Institute: status “Active”, not yet recognized' },
  { zh: '认定条件：在合格刊物发表，满两年，并获数学界普遍认可', en: 'Recognition requires publication in a qualifying outlet, two years’ wait, and general acceptance' },
  { zh: '无外力（$f$ ≡ 0）时光滑解是否会爆破，仍是开放问题', en: 'Whether smooth solutions can blow up without forcing ($f$ ≡ 0) remains open' },
]

export const CREDITS: string[][] = [
  ['C.-L. Navier', 'G. G. Stokes', 'J. Leray', 'L. Caffarelli · R. Kohn · L. Nirenberg', 'L. Escauriaza · G. Seregin · V. Šverák', 'C. L. Fefferman'],
  ['T. Tao', 'T. Buckmaster · V. Vicol', 'D. Albritton · E. Brué · M. Colombo', 'D. Córdoba · L. Martínez-Zoroa · F. Zheng', 'S. Friedlander · M. Vishik', 'A. Lifschitz · E. Hameiri'],
]

export const CREDITS_MORE: Bi = { zh: '以及论文引用的其他作者', en: 'and the other authors cited in the paper' }

export const SCHEMATIC: Bi = { zh: '示意图 · 比例已夸张', en: 'Schematic · proportions exaggerated' }
export const SCHEMATIC_CURVE: Bi = { zh: '示意曲线', en: 'Schematic curves' }

export const END_REFS: string[] = [
  'OpenAI, “Finite Time Blowup for Navier–Stokes”, 2026 · openai.com/index/navier-stokes-solution',
  'Lean 4 formalization · github.com/openai/NavierStokesAndEuler',
  'C. L. Fefferman, “Existence and smoothness of the Navier–Stokes equation”, Clay Mathematics Institute',
]
export const END_NOTE: Bi = {
  zh: '流场画面为示意动画，非数值模拟结果 · 信息截至 2026 年 9 月',
  en: 'Flow visuals are schematic illustrations, not numerical simulations · Information as of September 2026',
}
export const MUSIC_CREDIT = '音乐 Music　ハイスイノナサ「地下鉄の動態」'

/** 页面下方列出的出处，方便核对 */
export const SOURCES: { label: string; url: string }[] = [
  { label: 'OpenAI — Finite Time Blowup for Navier–Stokes（论文 PDF，166 页）', url: 'https://cdn.openai.com/pdf/32d9f210-8b73-45e0-91bc-82a30aef8a9a/navier-stokes.pdf' },
  { label: 'OpenAI — On the Navier–Stokes Millennium Prize Problem（发布博文）', url: 'https://openai.com/index/navier-stokes-solution/' },
  { label: 'Lean 4 形式化代码 openai/NavierStokesAndEuler', url: 'https://github.com/openai/NavierStokesAndEuler' },
  { label: 'C. L. Fefferman — 克雷研究所官方问题陈述', url: 'https://www.claymath.org/wp-content/uploads/2022/06/navierstokes.pdf' },
  { label: '克雷研究所 — 纳维–斯托克斯方程问题页（当前状态）', url: 'https://www.claymath.org/millennium/navier-stokes-equation/' },
  { label: '克雷研究所 — 千禧年大奖难题规则', url: 'https://www.claymath.org/millennium-problems/rules/' },
  { label: 'T. Tao — Alpöge 与 Buckmaster 的相关工作（2026-09-07）', url: 'https://terrytao.wordpress.com/2026/09/07/finite-time-blowup-with-smooth-forcing-term-for-the-incompressible-porous-medium-boussinesq-and-incompressible-euler-equations/' },
  { label: 'Quanta Magazine 报道（2026-09-08）', url: 'https://www.quantamagazine.org/ai-has-solved-one-of-maths-1-million-millennium-prize-problems-20260908/' },
  { label: 'Nature 新闻（2026-09）', url: 'https://www.nature.com/articles/d41586-026-02842-5' },
]
