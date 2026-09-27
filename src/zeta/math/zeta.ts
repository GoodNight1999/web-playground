// 黎曼 ζ 函数的数值计算（双精度）。
// Re s ≥ ½：Borwein 交错级数加速计算 η(s)，再用 ζ(s) = η(s) / (1 − 2^{1−s})；
// Re s < ½：函数方程 ζ(s) = 2^s π^{s−1} sin(πs/2) Γ(1−s) ζ(1−s)。
// 与 mpmath 的对照见 scripts/check-zeta.mjs。适用范围 |Im s| ≲ 100。

export type Complex = { re: number; im: number }

const N = 110
/** Borwein 系数：c_k = (−1)^k (d_n − d_k) / d_n */
const COEF = (() => {
  const d = new Float64Array(N + 1)
  let term = 1 / N
  let sum = term
  d[0] = N * sum
  for (let i = 1; i <= N; i++) {
    term *= (4 * (N + i - 1) * (N - i + 1)) / (2 * i * (2 * i - 1))
    sum += term
    d[i] = N * sum
  }
  const c = new Float64Array(N)
  for (let k = 0; k < N; k++) c[k] = ((k % 2 === 0 ? 1 : -1) * (d[N] - d[k])) / d[N]
  return c
})()
const LOGK = Float64Array.from({ length: N }, (_, k) => Math.log(k + 1))

/** 仅在 Re s > 0 时收敛；供 zeta 内部在 Re s ≥ ½ 时调用 */
function zetaBorwein(sr: number, si: number): Complex {
  let er = 0
  let ei = 0
  for (let k = 0; k < N; k++) {
    // (k+1)^{-s} = exp(−s·ln(k+1))
    const l = LOGK[k]
    const m = COEF[k] * Math.exp(-sr * l)
    er += m * Math.cos(si * l)
    ei -= m * Math.sin(si * l)
  }
  // 1 − 2^{1−s}
  const l2 = Math.LN2
  const m2 = Math.exp((1 - sr) * l2)
  const dr = 1 - m2 * Math.cos(-si * l2)
  const di = -m2 * Math.sin(-si * l2)
  const den = dr * dr + di * di
  return { re: (er * dr + ei * di) / den, im: (ei * dr - er * di) / den }
}

// Lanczos 近似（g = 7, n = 9），给出复数 ln Γ(z)，Re z ≥ ½
const LG = 7
const LC = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
]

function lnGamma(zr: number, zi: number): Complex {
  const xr = zr - 1
  let ar = LC[0]
  let ai = 0
  for (let i = 1; i < 9; i++) {
    const dr = xr + i
    const den = dr * dr + zi * zi
    ar += (LC[i] * dr) / den
    ai -= (LC[i] * zi) / den
  }
  const tr = xr + LG + 0.5
  const ti = zi
  // (x + ½) ln t − t + ½ ln 2π + ln a
  const lnTr = 0.5 * Math.log(tr * tr + ti * ti)
  const lnTi = Math.atan2(ti, tr)
  const pr = xr + 0.5
  const pi = zi
  return {
    re: pr * lnTr - pi * lnTi - tr + 0.5 * Math.log(2 * Math.PI) + 0.5 * Math.log(ar * ar + ai * ai),
    im: pr * lnTi + pi * lnTr - ti + Math.atan2(ai, ar),
  }
}

export function zeta(sr: number, si: number): Complex {
  if (sr >= 0.5) return zetaBorwein(sr, si)
  // 函数方程
  const z1 = zetaBorwein(1 - sr, -si)
  const lg = lnGamma(1 - sr, -si)
  // ln(2^s π^{s−1}) = s ln 2 + (s − 1) ln π
  const lr = sr * Math.LN2 + (sr - 1) * Math.log(Math.PI) + lg.re
  const li = si * Math.LN2 + si * Math.log(Math.PI) + lg.im
  const mag = Math.exp(lr)
  const fr = mag * Math.cos(li)
  const fi = mag * Math.sin(li)
  // sin(πs/2) = sin a cosh b + i cos a sinh b
  const a = (Math.PI * sr) / 2
  const b = (Math.PI * si) / 2
  const snr = Math.sin(a) * Math.cosh(b)
  const sni = Math.cos(a) * Math.sinh(b)
  const gr = fr * snr - fi * sni
  const gi = fr * sni + fi * snr
  return { re: gr * z1.re - gi * z1.im, im: gr * z1.im + gi * z1.re }
}

/** 冯·曼戈尔特显式公式中前 n 对零点的贡献：2 Σ Re(x^ρ / ρ)，ρ = ½ + iγ */
export function zeroSum(x: number, gammas: ArrayLike<number>, n: number): number {
  const lx = Math.log(x)
  const sx = Math.sqrt(x)
  let sum = 0
  for (let k = 0; k < n; k++) {
    const g = gammas[k]
    const c = Math.cos(g * lx)
    const s = Math.sin(g * lx)
    sum += (0.5 * c + g * s) / (0.25 + g * g)
  }
  return 2 * sx * sum
}

/** 显式公式右端（只取前 n 个零点）：ψ₀(x) ≈ x − Σ x^ρ/ρ − ln 2π − ½ ln(1 − x⁻²) */
export function psiExplicit(x: number, gammas: ArrayLike<number>, n: number): number {
  return x - zeroSum(x, gammas, n) - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x))
}

/** 切比雪夫函数 ψ(x) = Σ_{p^k ≤ x} ln p（精确值） */
export function psiExact(x: number): number {
  let sum = 0
  for (let n = 2; n <= x; n++) {
    const p = primePowerBase(n)
    if (p) sum += Math.log(p)
  }
  return sum
}

/** n 是素数幂 p^k 时返回 p，否则返回 0 */
export function primePowerBase(n: number): number {
  for (let p = 2; p * p <= n; p++) {
    if (n % p === 0) {
      let m = n
      while (m % p === 0) m /= p
      return m === 1 ? p : 0
    }
  }
  return n >= 2 ? n : 0
}

export function isPrime(n: number): boolean {
  return primePowerBase(n) === n && n >= 2
}
