// 预计算的画面数据（全部是真实计算）：
//   气体 A：T² 上 N = 100、ε = 0.012 的硬球，末时刻两个根粒子的碰撞历史 → 分子 → 切割序列；
//   气体 B：N = 400、ε = 0.004、初速率全为 1，用来看速度分布向 Maxwell 分布弛豫；
//   流场：NSF 的精确解（|k|² = 25 的本征模叠加）的流线与示踪粒子；以及胶片颗粒贴图。

import { makeFlow, type Flow } from '../math/flow'
import { simulate, type Sim } from '../math/hardspheres'
import { cutTopDown, extractMolecule, layerClusters, layoutMolecule, type CutStep, type Layout, type Molecule } from '../math/molecule'
import { rng } from './draw'

/** 气体 A 与分子的参数（种子与根粒子由穷举挑出：14 个原子、12 条粒子线、ρ = 3） */
export const GAS_A = { n: 100, eps: 0.012, T: 4, seed: 47, sigma: 0.7, roots: [35, 51], t0: 2.8, tau: 0.1, layers: 12 }
export const GAS_B = { n: 400, eps: 0.004, T: 1.6, seed: 11 }

export type Visuals = {
  simA: Sim
  mol: Molecule
  layout: Layout
  steps: CutStep[]
  /** 每层的碰撞团簇（整个气体 A，时间窗与分子相同） */
  clusters: ReturnType<typeof layerClusters>
  simB: Sim
  flow: Flow
  grain: HTMLCanvasElement[]
}

export function buildVisuals(): Visuals {
  const A = GAS_A
  const simA = simulate({ n: A.n, eps: A.eps, T: A.T, seed: A.seed, init: 'maxwell', sigma: A.sigma })
  const mol = extractMolecule(simA, A.roots, A.t0, A.T, A.layers)
  const simB = simulate({ n: GAS_B.n, eps: GAS_B.eps, T: GAS_B.T, seed: GAS_B.seed, init: 'ring' })
  return {
    simA,
    mol,
    layout: layoutMolecule(mol),
    steps: cutTopDown(mol),
    clusters: layerClusters(simA, A.t0, A.tau, A.layers),
    simB,
    flow: makeFlow(),
    grain: makeGrain(),
  }
}

function makeGrain(): HTMLCanvasElement[] {
  const r = rng(20120523)
  return Array.from({ length: 4 }, () => {
    const c = document.createElement('canvas')
    c.width = c.height = 384
    const g = c.getContext('2d')!
    const img = g.createImageData(384, 384)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(r() * 255)
      img.data[i] = v
      img.data[i + 1] = v
      img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
    return c
  })
}
