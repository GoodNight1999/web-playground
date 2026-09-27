# 用 mpmath 计算黎曼 ζ 函数前 N 个非平凡零点的虚部，生成 src/zeta/data/zeros.gen.ts。
# 依赖：pip install mpmath；运行：python3 scripts/compute-zeros.py 500
import sys, pathlib, mpmath

mpmath.mp.dps = 30
N = int(sys.argv[1]) if len(sys.argv) > 1 else 500
gammas = []
for k in range(1, N + 1):
    z = mpmath.zetazero(k)
    assert abs(z.real - 0.5) < 1e-20  # 前 N 个零点都在临界线上
    gammas.append(repr(float(z.imag)))  # 双精度的最短往返表示

out = pathlib.Path(__file__).resolve().parent.parent / 'src/zeta/data/zeros.gen.ts'
body = ',\n'.join('  ' + ', '.join(gammas[i:i + 6]) for i in range(0, N, 6))
out.write_text(
    '// 由 scripts/compute-zeros.py 用 mpmath（30 位精度）生成，不要手改。\n'
    f'// 黎曼 ζ 函数前 {N} 个非平凡零点 ρ = ½ + iγ 的虚部 γ（均已验证实部为 ½）。\n\n'
    f'export const ZETA_ZEROS: readonly number[] = [\n{body},\n]\n'
)
print('wrote', out, N)
