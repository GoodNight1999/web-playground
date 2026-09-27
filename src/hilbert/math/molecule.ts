// 碰撞历史的拓扑约化（Deng–Hani–Ma, arXiv:2408.07818 §3.1；arXiv:2503.01800 定义 2.1）：
// 每次碰撞是一个原子（C-atom），两次碰撞之间的自由输运是一条边，同一粒子的边连成粒子线。
// 边的方向从上到下（从晚到早）：键 n → n′ 表示 n 是 n′ 的父亲（更晚的那次碰撞）。

import type { Collision, Sim } from './hardspheres.ts'

export type Atom = {
  /** 在分子里的编号 */
  id: number
  t: number
  /** 两条粒子线（粒子编号） */
  p: [number, number]
  ev: Collision
  /** 每条粒子线上更晚一次碰撞的原子编号（-1 表示顶端的端点） */
  up: [number, number]
  /** 每条粒子线上更早一次碰撞的原子编号（-1 表示底端的端点） */
  down: [number, number]
  layer: number
}

export type Molecule = {
  atoms: Atom[]
  /** 粒子线：粒子编号 → 该粒子的原子（按时间从早到晚） */
  lines: Map<number, number[]>
  roots: number[]
  t0: number
  T: number
  layers: number
  bonds: number
  /** 回路数（环秩）ρ = #键 − #原子 + #连通分支 */
  rho: number
  components: number
}

/**
 * 从末时刻 T 的根粒子 roots 出发，倒着追溯：一次碰撞只要牵涉到“会影响根粒子末状态”的粒子，就属于这段历史，
 * 并且它的另一个粒子从这一刻往前也开始“有影响”。时间窗为 [t0, T]，按 layers 等分成时间层。
 */
export function extractMolecule(sim: Sim, roots: number[], t0: number, T: number, layers: number): Molecule {
  const active = new Set(roots)
  const picked: Collision[] = []
  for (let k = sim.events.length - 1; k >= 0; k--) {
    const e = sim.events[k]
    if (e.t > T || e.t < t0) continue
    if (active.has(e.i) || active.has(e.j)) {
      picked.push(e)
      active.add(e.i)
      active.add(e.j)
    }
  }
  picked.reverse()
  const tau = (T - t0) / layers
  const atoms: Atom[] = picked.map((ev, id) => ({
    id,
    t: ev.t,
    p: [ev.i, ev.j],
    ev,
    up: [-1, -1],
    down: [-1, -1],
    layer: Math.min(layers, Math.max(1, Math.ceil((ev.t - t0) / tau))),
  }))
  const lines = new Map<number, number[]>()
  for (const a of atoms) for (const p of a.p) (lines.get(p) ?? lines.set(p, []).get(p)!).push(a.id)
  let bonds = 0
  for (const [p, ids] of lines) {
    for (let k = 0; k < ids.length; k++) {
      const a = atoms[ids[k]]
      const side = a.p[0] === p ? 0 : 1
      a.down[side] = k > 0 ? ids[k - 1] : -1
      a.up[side] = k + 1 < ids.length ? ids[k + 1] : -1
    }
    bonds += Math.max(0, ids.length - 1)
  }
  // 连通分支（把原子看成无向图的顶点）
  const parent = atoms.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  for (const a of atoms) for (const u of a.up) if (u >= 0) parent[find(u)] = find(a.id)
  const components = new Set(atoms.map((a) => find(a.id))).size
  return { atoms, lines, roots, t0, T, layers, bonds, rho: bonds - atoms.length + components, components }
}

export type CutKind = '4' | '3' | '2' | '33'
export type CutStep = { kind: CutKind; atoms: number[] }

/**
 * 自上而下的切割序列：每次把剩下的最高（最晚）原子当作 free 切下。切下时它的父亲都已切掉，
 * 每条连向已切原子的键在它这里都是顶部的 fixed 端，所以度数 = 4 − #已切父亲，得到 {4}、{3} 或 {2}；
 * 两个顶部 fixed 端不会同属一条粒子线，满足初等分子的要求（arXiv:2503.01800 定义 2.6）。
 * 若刚要切下的度 3 原子 n 有一个孩子 c 只差 n 这一个父亲没切，就把 {n, c} 一起切下，得到 {33A}：
 * 一次碰撞紧接着一次重碰撞，这是 ε 幂次增益的基本单位。
 * 这只是一个合法的贪心序列，不是论文里的完整算法；它不保证 {33} 足够多——这正是切割算法要解决的问题。
 */
export function cutTopDown(m: Molecule): CutStep[] {
  const cut = new Array<boolean>(m.atoms.length).fill(false)
  const fixedEnds = (a: Atom, except = -1) => a.up.filter((u) => u >= 0 && u !== except && cut[u]).length
  const steps: CutStep[] = []
  const order = [...m.atoms].sort((a, b) => b.t - a.t)
  for (const a of order) {
    if (cut[a.id]) continue
    const f = fixedEnds(a)
    if (f === 1) {
      // 找一个孩子 c：c 与 a 之间只有一条键，c 的另一个父亲已切
      const kids = a.down.filter((c) => c >= 0)
      const single = kids.filter((c) => kids.indexOf(c) === kids.lastIndexOf(c))
      const c = single.find((c) => {
        const ca = m.atoms[c]
        return !cut[c] && ca.up.filter((u) => u === a.id).length === 1 && fixedEnds(ca, a.id) === 1
      })
      if (c !== undefined) {
        cut[a.id] = cut[c] = true
        steps.push({ kind: '33', atoms: [a.id, c] })
        continue
      }
    }
    cut[a.id] = true
    steps.push({ kind: f === 0 ? '4' : f === 1 ? '3' : '2', atoms: [a.id] })
  }
  return steps
}

/** 同一对粒子相邻两次碰撞之间没有别的碰撞：双键（环面上才可能出现，arXiv:2503.01800 §1.4） */
export function doubleBonds(m: Molecule): [number, number][] {
  const out: [number, number][] = []
  for (const a of m.atoms) {
    if (a.up[0] >= 0 && a.up[0] === a.up[1]) out.push([a.id, a.up[0]])
  }
  return out
}

export type Layout = {
  /** 原子的横坐标（0..1）与纵坐标（0 = t0，1 = T） */
  ax: number[]
  ay: number[]
  /** 粒子线的横坐标（底端与顶端的端点画在这里） */
  lane: Map<number, number>
}

/** 分子的平面画法：纵向就是时间（时间层是水平带），横向用重心法排列粒子线以减少交叉 */
export function layoutMolecule(m: Molecule): Layout {
  const parts = [...m.lines.keys()]
  const pos = new Map<number, number>()
  // 初始顺序：按第一次碰撞的时间
  parts
    .slice()
    .sort((a, b) => m.atoms[m.lines.get(a)![0]].t - m.atoms[m.lines.get(b)![0]].t)
    .forEach((p, k) => pos.set(p, k))
  for (let it = 0; it < 60; it++) {
    const want = new Map<number, number>()
    for (const p of parts) {
      let s = 0
      let w = 0
      for (const id of m.lines.get(p)!) {
        const a = m.atoms[id]
        const other = a.p[0] === p ? a.p[1] : a.p[0]
        s += pos.get(other)!
        w += 1
      }
      want.set(p, 0.5 * pos.get(p)! + 0.5 * (w ? s / w : pos.get(p)!))
    }
    parts
      .slice()
      .sort((a, b) => want.get(a)! - want.get(b)! || a - b)
      .forEach((p, k) => pos.set(p, k))
  }
  const n = parts.length
  const lane = new Map<number, number>()
  for (const p of parts) lane.set(p, n > 1 ? pos.get(p)! / (n - 1) : 0.5)
  const ax = m.atoms.map((a) => (lane.get(a.p[0])! + lane.get(a.p[1])!) / 2)
  const ay = m.atoms.map((a) => (a.t - m.t0) / (m.T - m.t0))
  // 沿粒子线做几次平滑，让折线更舒展（端点固定在各自的粒子线位置）
  for (let it = 0; it < 30; it++) {
    const nx = ax.slice()
    for (const a of m.atoms) {
      let s = 0
      for (let k = 0; k < 2; k++) {
        const p = a.p[k]
        const nb = [a.up[k], a.down[k]].map((u) => (u >= 0 ? ax[u] : lane.get(p)!))
        s += (nb[0] + nb[1]) / 2
      }
      nx[a.id] = 0.5 * ax[a.id] + 0.5 * (s / 2)
    }
    for (let i = 0; i < ax.length; i++) ax[i] = nx[i]
  }
  return { ax, ay, lane }
}

/** 整个气体在每个时间层内的碰撞团簇（层内由碰撞连通的粒子集合），返回每层每个碰撞所属团簇的编号与大小 */
export function layerClusters(sim: Sim, t0: number, tau: number, L: number) {
  const out: { events: number[]; cluster: number[]; size: number[]; maxSize: number }[] = []
  for (let l = 0; l < L; l++) {
    const a = t0 + l * tau
    const b = a + tau
    const evs: number[] = []
    sim.events.forEach((e, k) => {
      if (e.t >= a && e.t < b) evs.push(k)
    })
    const parent = new Map<number, number>()
    const find = (i: number): number => {
      const p = parent.get(i) ?? i
      if (p === i) return i
      const r = find(p)
      parent.set(i, r)
      return r
    }
    for (const k of evs) {
      const e = sim.events[k]
      const ri = find(e.i)
      const rj = find(e.j)
      if (ri !== rj) parent.set(ri, rj)
    }
    const members = new Map<number, Set<number>>()
    for (const k of evs) {
      const e = sim.events[k]
      const r = find(e.i)
      const s = members.get(r) ?? members.set(r, new Set()).get(r)!
      s.add(e.i)
      s.add(e.j)
    }
    const cluster = evs.map((k) => find(sim.events[k].i))
    const size = cluster.map((r) => members.get(r)!.size)
    out.push({ events: evs, cluster, size, maxSize: Math.max(0, ...size) })
  }
  return out
}
