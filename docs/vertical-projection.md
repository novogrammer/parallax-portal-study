# 垂直投影モデル

## 目的

Projection Profileで指定する基準FOV、DOMスクロールに連動するCamera Y、fixed Canvasの描画Cameraへ設定するFOVを分離して定義する。

## 記号

| 記号 | 正式名称 | 意味 | 単位 |
| --- | --- | --- | --- |
| `Vh` | canvas height | fixed Canvas / viewportの高さ | CSS px |
| `y` | portal top | full Portal rectの上端 | CSS px |
| `h` | portal height | full Portal rectの高さ | CSS px |
| `phiR` | `referenceFovY` | 構図設計上の基準vertical FOV | rad |
| `Hp` | `referenceProjectionHeightMeters` | Reference Plane上で基準FOVに収める高さ | m |
| `Ty` | `cameraTopY` | Portal上端がviewport中央に来たときのCamera Y | m |
| `By` | `cameraBottomY` | Portal下端がviewport中央に来たときのCamera Y | m |
| `pi` | 円周率 | 約3.14159 | 無次元 |

会話中の仮記号との対応は、`p.height = Hp`、`t.y = Ty`、`b.y = By` とする。

前提条件は次のとおり。

- `Vh > 0`
- `h > 0`
- `Hp > 0`
- `0 < phiR < pi`
- `abs(Ty - By) > 0`

数式中の三角関数はradを使う。設定値をdegreeで保持する場合は計算境界でradへ変換する。

## Reference Projection

`referenceFovY` と `referenceProjectionHeightMeters` は、Sceneの見せ方を決める独立した入力値である。FOVを1m当たりの換算値として扱わない。

Reference Planeまでの基準Camera距離は次の導出値になる。

```text
referenceCameraDistance = Hp / (2 * tan(phiR / 2))
```

`referenceFovY` は描画Cameraへ直接設定しない。

## Camera Y Motion

full Portal rectからスクロール進行値を求める。

```text
centerProgress = (Vh / 2 - y) / h
```

- Portal上端がviewport中央に来たとき `0`
- Portal下端がviewport中央に来たとき `1`
- 範囲外では0未満または1超の値をそのまま使う

Camera YはProfileの上下端を補間して求める。

```text
cameraY = lerp(Ty, By, centerProgress)
```

`centerProgress` はclampせず、全範囲で線形補間または線形外挿する。これはPortalがviewportへ出入りするときのCamera移動を自然に連続させるための仕様である。

Camera Yの移動高は設定として重複保持しない。

```text
cameraTravelHeightMeters = abs(Ty - By)
```

`Ty` と `By` の順序はCameraの移動方向に使い、FOV変換では絶対差を高さとして使う。`Ty == By` は有効な投影を作れない設定ミスとして例外を投げ、処理を終了する。

## Render Projection

DOM高に対するCamera Y移動高から、実行時の垂直スケールを求める。

```text
cameraMetersPerCssPixel = cameraTravelHeightMeters / h
renderProjectionHeightMeters = Vh * cameraMetersPerCssPixel
```

`referenceCameraDistance`を維持したまま、fixed Canvas全体へ `renderProjectionHeightMeters` を収めるFOVを描画Cameraへ設定する。

```text
renderCameraFovY =
  2 * atan(
    tan(referenceFovY / 2)
    * canvasHeight / portalHeight
    * cameraTravelHeightMeters / referenceProjectionHeightMeters
  )
```

`renderCameraFovY` は導出値であり、Projection Profileには保存しない。DOM窓の現在Y位置はCamera Yにだけ使い、FOV変換には含めない。

## 基準投影高とCamera移動高

`referenceProjectionHeightMeters` と `cameraTravelHeightMeters` は常に個別の数値として指定または導出し、一致モードのような分岐を設けない。

両者が同値の場合は、一般式中の「Camera移動高 / 基準投影高」が結果的に1となり、参照実装相当の関係になる。同値でない設定も正常とする。

## DOM単位と実行時矩形

`referenceDomHeight.unit` は `"css-px"` または `"vw"` とし、PC / SPなどの端末区分とは結び付けない。

- PC相当のviewportでvwを使える。
- SP相当のviewportでCSS pxを使える。
- 実行時には `getBoundingClientRect()` 相当の結果をCSS pxとして計算へ渡す。
- device pixelとCSS pxを区別し、DPRを幾何計算へ含めない。

FOV、進行値、Camera Yにはclip前のfull Portal rectの `y` と `h` を使う。Portalとviewportの交差矩形はscissorだけに使い、部分表示高をFOV計算へ代入しない。

## 横方向の導出

CameraのaspectにはPortalのaspectではなく、fixed Canvas全体のaspectを使う。

```text
canvasAspect = canvasWidth / canvasHeight
```

水平FOVは `renderCameraFovY` とCanvas aspectから導出する。

```text
renderCameraFovX =
  2 * atan(tan(renderCameraFovY / 2) * canvasAspect)
```

Reference Plane上のCanvas可視高と可視幅、および共通スケールは次のとおり。

```text
canvasVisibleHeightMeters =
  2 * referenceCameraDistance * tan(renderCameraFovY / 2)

canvasVisibleWidthMeters =
  canvasVisibleHeightMeters * canvasAspect

metersPerCssPixel =
  canvasVisibleHeightMeters / canvasHeight
```

full Portal rectの幅を `portalWidth` とすると、Portal内で見える幅は次の導出値になる。

```text
portalVisibleWidthMeters = portalWidth * metersPerCssPixel
```

独立した基準幅、contain、coverは設定しない。Camera Xは初期値に固定し、PortalのX位置からRegistrationしない。左右に寄ったPortalは、fixed Canvas上の対応する投影領域をscissorして表示する。
