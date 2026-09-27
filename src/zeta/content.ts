// 片中全部文字（中英双语，尽量短）。事实依据见文件末尾 SOURCES；信息截至 2026 年 9 月。
// $…$ 包住的部分按数学变量排成意大利体。

export type Bi = { zh: string; en: string }

/** 前奏问答里答案旁边配的小图 */
export type QAVisual =
  | 'primes'
  | 'density'
  | 'zeta'
  | 'trivial'
  | 'strip'
  | 'rho1'
  | 'rho2'
  | 'rho3'
  | 'far'
  | 'count'
  | 'none'
  | 'line'
  | 'year'
  | 'name'

/** 小节从 1 开始，off 为小节内的秒数（前奏每小节 3.75 秒，四拍，每拍 0.9375 秒） */
export type QA = { q: Bi; a: Bi; qBar: number; qOff: number; aBar: number; aOff: number; visual: QAVisual }

export const QAS: QA[] = [
  { qBar: 1, qOff: 0, aBar: 2, aOff: 0, visual: 'primes', q: { zh: '素数，有规律吗？', en: 'Do the primes follow a rule?' }, a: { zh: '看不出来。', en: 'None that anyone can see.' } },
  { qBar: 3, qOff: 0, aBar: 4, aOff: 0, visual: 'density', q: { zh: '那它们的疏密呢？', en: 'And how thinly they spread?' }, a: { zh: '由一个函数的零点决定。', en: 'The zeros of one function decide it.' } },
  { qBar: 5, qOff: 0, aBar: 5, aOff: 2.22, visual: 'zeta', q: { zh: '哪个函数？', en: 'Which function?' }, a: { zh: '黎曼 ζ 函数。', en: 'The Riemann zeta function.' } },
  { qBar: 6, qOff: 0, aBar: 6, aOff: 2.22, visual: 'trivial', q: { zh: '它的零点在哪？', en: 'Where are its zeros?' }, a: { zh: '一些是平凡的。', en: 'Some are trivial.' } },
  { qBar: 7, qOff: 0, aBar: 7, aOff: 2.22, visual: 'strip', q: { zh: '其余的呢？', en: 'And the rest?' }, a: { zh: '都在这条带里。', en: 'All inside this strip.' } },
  { qBar: 8, qOff: 0, aBar: 8, aOff: 2.22, visual: 'rho1', q: { zh: '第一个？', en: 'The first?' }, a: { zh: '', en: '' } },
  { qBar: 9, qOff: 0, aBar: 9, aOff: 2.22, visual: 'rho2', q: { zh: '第二个？', en: 'The second?' }, a: { zh: '', en: '' } },
  { qBar: 10, qOff: 0, aBar: 10, aOff: 2.22, visual: 'rho3', q: { zh: '第三个？', en: 'The third?' }, a: { zh: '', en: '' } },
  { qBar: 11, qOff: 0, aBar: 11, aOff: 0.94, visual: 'far', q: { zh: '第一百万个？', en: 'The millionth?' }, a: { zh: '实部也是 ½。', en: 'Real part ½ as well.' } },
  { qBar: 11, qOff: 1.87, aBar: 11, aOff: 2.81, visual: 'count', q: { zh: '验证了多少个？', en: 'How many are checked?' }, a: { zh: '', en: '' } },
  { qBar: 12, qOff: 0, aBar: 12, aOff: 0.94, visual: 'none', q: { zh: '有例外吗？', en: 'Any exception?' }, a: { zh: '一个也没有。', en: 'Not one.' } },
  { qBar: 12, qOff: 1.87, aBar: 12, aOff: 2.81, visual: 'line', q: { zh: '全部都在这条线上？', en: 'Do all of them lie on this line?' }, a: { zh: '没人知道。', en: 'No one knows.' } },
  { qBar: 13, qOff: 0, aBar: 13, aOff: 0.94, visual: 'none', q: { zh: '证明了吗？', en: 'Proved?' }, a: { zh: '没有。', en: 'No.' } },
  { qBar: 13, qOff: 1.87, aBar: 13, aOff: 2.81, visual: 'year', q: { zh: '多久了？', en: 'For how long?' }, a: { zh: '从 1859 年至今。', en: 'Since 1859.' } },
  { qBar: 14, qOff: 0, aBar: 14, aOff: 1.87, visual: 'name', q: { zh: '它叫什么？', en: 'What is it called?' }, a: { zh: '黎曼猜想。', en: 'The Riemann Hypothesis.' } },
]

/** Platt & Trudgian (2021)：高度 3·10¹² 以下的全部零点 */
export const CHECKED_ZEROS = '12 363 153 437 138'
export const CHECKED_NOTE = 'Platt & Trudgian, 2021'

export const HYPOTHESIS: Bi = {
  zh: '猜想：所有非平凡零点都在 Re $s$ = ½ 上',
  en: 'Conjecture: every nontrivial zero lies on Re $s$ = ½',
}

export const PHASE_NOTE: Bi = { zh: '所有相位线交汇之处，就是零点', en: 'Where every phase line meets, there is a zero' }

export const SUMMARY: Bi[] = [
  { zh: '算出的零点，全在 Re $s$ = ½ 上', en: 'Every zero computed lies on Re $s$ = ½' },
  { zh: '已证：无穷多个在线上（Hardy，1914）', en: 'Proved: infinitely many are on it (Hardy, 1914)' },
  { zh: '已证：超过五分之二在线上（Conrey，1989）', en: 'Proved: more than two-fifths are (Conrey, 1989)' },
  { zh: '全部？尚未证明', en: 'All of them? Unproved' },
]

export const WAVES_NOTE: Bi = { zh: '每个零点，贡献一段振荡', en: 'Each zero adds one oscillation' }
export const PRIMES_NOTE: Bi = { zh: '零点叠加，素数显形', en: 'Summed over zeros, the primes appear' }

export const OUTRO: Bi = { zh: '黎曼猜想 · 1859 · 未解', en: 'The Riemann Hypothesis · 1859 · open' }
export const OUTRO_NOTE: Bi = {
  zh: '片中零点与曲线均由数值计算得到 · 信息截至 2026 年 9 月',
  en: 'All zeros and curves are computed numerically · as of September 2026',
}
export const MUSIC_CREDIT = '音乐 Music　ハイスイノナサ「地下鉄の動態」'

/** 页面下方列出的出处，方便核对 */
export const SOURCES: { label: string; url: string }[] = [
  { label: '克雷数学研究所 — 黎曼猜想（千禧年大奖难题）', url: 'https://www.claymath.org/millennium/riemann-hypothesis/' },
  { label: 'E. Bombieri — 黎曼猜想官方问题陈述（Clay）', url: 'https://www.claymath.org/wp-content/uploads/2022/05/riemann.pdf' },
  { label: 'D. Platt, T. Trudgian — The Riemann hypothesis is true up to 3·10¹²（2021）', url: 'https://arxiv.org/abs/2004.09765' },
  { label: 'J. B. Conrey — More than two fifths of the zeros … are on the critical line（1989）', url: 'https://doi.org/10.1515/crll.1989.399.1' },
  { label: 'G. H. Hardy — Sur les zéros de la fonction ζ(s) de Riemann（1914）', url: 'https://en.wikipedia.org/wiki/Riemann_hypothesis#Zeros_on_the_critical_line' },
  { label: 'B. Riemann — Über die Anzahl der Primzahlen unter einer gegebenen Grösse（1859）', url: 'https://en.wikipedia.org/wiki/On_the_Number_of_Primes_Less_Than_a_Given_Magnitude' },
  { label: '大西景太 — 地下鉄の動態 MV（视觉风格参考）', url: 'https://www.keitaonishi.com/dynamics-of-the-subway' },
]
