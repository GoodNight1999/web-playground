// 把预渲染的 MathJax SVG 栅格化成离屏画布，绘制时按需要的字号缩放。

import { FORMULAS, type FormulaId } from '../formulas.gen'
import { BLACK, WHITE } from './draw'

/** 栅格化用的几档 em 尺寸；绘制时选不小于目标尺寸的那一档，缩小倍数不超过 2（场景里字号不超过 80） */
const SIZES = [40, 80]
const COLORS = { white: WHITE, black: BLACK }
export type FormulaColor = keyof typeof COLORS
/** 只有歇息段（白底）用到黑色公式 */
const BLACK_IDS: FormulaId[] = ['sum_chaos']

type Raster = { canvas: HTMLCanvasElement; em: number }

export type FormulaOpts = {
  em: number
  color?: FormulaColor
  align?: 'left' | 'center' | 'right'
  /** baseline：y 为基线；middle：y 为公式竖直中点 */
  valign?: 'baseline' | 'middle'
  alpha?: number
}

export class FormulaCache {
  private rasters = new Map<string, Raster>()

  async prepare(): Promise<void> {
    const jobs: Promise<void>[] = []
    for (const id of Object.keys(FORMULAS) as FormulaId[]) {
      for (const em of SIZES) jobs.push(this.rasterize(id, 'white', em))
    }
    for (const id of BLACK_IDS) for (const em of SIZES) jobs.push(this.rasterize(id, 'black', em))
    await Promise.all(jobs)
  }

  private async rasterize(id: FormulaId, color: FormulaColor, em: number) {
    const f = FORMULAS[id]
    const w = f.w * em
    const h = f.h * em
    const svg = f.svg
      .replace('<svg ', `<svg width="${w}" height="${h}" `)
      .replaceAll('currentColor', COLORS[color])
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(w) + 2
      canvas.height = Math.ceil(h) + 2
      canvas.getContext('2d')!.drawImage(img, 1, 1, w, h)
      this.rasters.set(`${id}|${color}|${em}`, { canvas, em })
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  width(id: FormulaId, em: number): number {
    return FORMULAS[id].w * em
  }

  height(id: FormulaId, em: number): number {
    return FORMULAS[id].h * em
  }

  draw(g: CanvasRenderingContext2D, id: FormulaId, x: number, y: number, o: FormulaOpts) {
    const alpha = o.alpha ?? 1
    if (alpha <= 0.001) return
    const color = o.color ?? 'white'
    const size = SIZES.find((s) => s >= o.em) ?? SIZES[SIZES.length - 1]
    const r = this.rasters.get(`${id}|${color}|${size}`)
    if (!r) return
    const f = FORMULAS[id]
    const k = o.em / r.em
    const w = f.w * o.em
    const left = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x
    const top = o.valign === 'middle' ? y - (f.h * o.em) / 2 : y - f.ascent * o.em
    const prev = g.globalAlpha
    g.globalAlpha = prev * alpha
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    g.drawImage(r.canvas, left - k, top - k, r.canvas.width * k, r.canvas.height * k)
    g.globalAlpha = prev
  }
}
