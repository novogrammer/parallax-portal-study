# 検証条件

## 検証ケース

| ケース | 期待結果 |
| --- | --- |
| `centerProgress = 0` | `cameraY = cameraTopY` |
| `centerProgress = 1` | `cameraY = cameraBottomY` |
| Camera移動高と基準投影高が同じ | FOV変換の高さ比が1になる |
| Camera移動高と基準投影高が異なる | 高さ比を含むRender Camera FOVが得られる |
| Portalが部分表示 | scissorだけが変化し、Camera YとFOVは連続する |
| viewportより大きいPortal | full Portal rectによる計算が維持される |
| 複数Portalを同時表示 | 各Sceneが対応するscissor領域だけに描画される |
| 同じSceneを異なるProfileで使用 | 各Portalが独立したCamera結果を持つ |
| 異なるSceneとProfileを使用 | 一方の設定変更が他方へ影響しない |
| CSSでvw指定 | `getBoundingClientRect()` のCSS px実測値で計算できる |
| CSSでpx指定 | `getBoundingClientRect()` のCSS px実測値で同じ計算を使える |
| resize | 実測DOM矩形とCanvas寸法から連続的に再計算される |
| ブラウザズーム | CSS pxへ正規化した寸法比で再計算される |
| progressが0未満または1超 | clampせず、同じ式でCamera Yが線形外挿される |
| `cameraTopY == cameraBottomY` | 設定例外を投げて処理を終了する |
| Portalがないフレーム | requestAnimationFrame自体は継続する |
| Canvasのaspectが変化 | Render Camera FOV Xと可視幅が再導出される |
| Portal幅が変化 | 同じm/CSS pxでPortal可視幅が変化する |
| Portalが左右に寄る | Camera Xは固定され、Canvas上の対応領域がscissorされる |

## 合格条件

- vertical FOVの上側が3D空間の正のY方向、下側が負のY方向へ投影される。
- Reference FOVと基準投影高から基準Camera距離を一意に導出できる。
- Camera Yの上下端からCamera移動高を一意に導出できる。
- `centerProgress` を範囲外でもclampせず、Camera Yを線形外挿する。
- Camera Y移動高が0なら設定例外を投げて処理を終了する。
- Reference FOV、Canvas / DOM高比、Camera移動高 / 基準投影高比からRender Camera FOVを一意に導出できる。
- Camera移動高と基準投影高の同値を必須条件にしない。
- CSSの記述単位を解析せず、`getBoundingClientRect()` のCSS px実測値だけで計算できる。
- 部分表示時に交差矩形をFOVまたはCamera Yの計算へ使わない。
- Scene内の実際のZ距離に応じて透視投影上の視差が変化する。
- Scene IDやProfile IDによる条件分岐をPortal Geometryへ埋め込まない。
- Portalの描画順が各PortalのCamera計算へ影響しない。
- 表示対象Portalの有無にかかわらずrequestAnimationFrameを継続する。
- Render Camera FOV Yと画面全体の `position: fixed` Canvasのaspectから水平FOVを一意に導出できる。
- CanvasとPortalの可視幅を共通のm/CSS pxスケールから導出できる。
- Camera XをPortal位置またはスクロールによって変更しない。
