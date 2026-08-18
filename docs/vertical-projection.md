# 垂直投影モデル

## 目的

Projection Profileで指定する基準FOV、PortalRuntime内で共有する基準投影高、Scene Configurationで指定するCamera Y範囲、画面全体の `position: fixed` Canvasで使う描画CameraのFOVを分離して定義する。

設定値の `referenceFovY` は基準投影領域とCamera距離を定義する設計用FOVであり、描画Cameraへ直接適用しない。実際の描画では、PortalのCSS実測高とCanvas高の比を反映した `renderCameraFovY` を導出し、固定Canvas上でCSSと3Dの垂直スケールが対応するように投影する。

## 記号

| 記号 | 正式名称 | 意味 | 単位 |
| --- | --- | --- | --- |
| `Vh` | canvas height | `position: fixed` Canvas / viewportの高さ | CSS px |
| `y` | portal top | full Portal rectの上端 | CSS px |
| `h` | portal height | full Portal rectの高さ | CSS px |
| `phiR` | `referenceFovY` | 構図設計上の基準vertical FOV | rad |
| `Hp` | `referenceProjectionHeightMeters` | Reference Plane上で基準FOVに収める高さ | m |
| `Ty` | `cameraTopY` | Portal上端がviewport中央に来たときのCamera Y | m |
| `By` | `cameraBottomY` | Portal下端がviewport中央に来たときのCamera Y | m |
| `pi` | 円周率 | 約3.14159 | 無次元 |

前提条件は次のとおり。

- `Vh > 0`
- `h > 0`
- `Hp > 0`
- `0 < phiR < pi`
- `abs(Ty - By) > 0`

数式中の三角関数はradを使う。設定値をdegreeで保持する場合は計算境界でradへ変換する。

## Reference Projection

Projection Profileの `referenceFovY` とRuntime共通設定の `referenceProjectionHeightMeters` は、基準Camera距離を決める独立した入力値である。FOVを1m当たりの換算値として扱わない。

Reference Planeまでの基準Camera距離は次の導出値になる。

```text
referenceCameraDistance = Hp / (2 * tan(phiR / 2))
```

## Camera Y Motion

full Portal rectからスクロール進行値を求める。

```text
centerProgress = (Vh / 2 - y) / h
```

- Portal上端がviewport中央に来たとき `0`
- Portal下端がviewport中央に来たとき `1`
- 範囲外では0未満または1超の値をそのまま使う

Camera YはScene Configurationの上下端を補間して求める。

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

PortalのCSS高とCamera移動高はデザイン入力であり、`cameraMetersPerCssPixel` をPortal間で一致させることはシステム要件ではない。pxとvwの混在やviewport幅の変化によってPortalごとの値が異なる場合も正常とし、Portal Geometryは与えられた比率をそのまま投影へ反映する。

`referenceCameraDistance`を維持したまま、画面全体のCanvasへ `renderProjectionHeightMeters` を収めるFOVを描画Cameraへ設定する。

```text
renderCameraFovY =
  2 * atan(
    tan(referenceFovY / 2)
    * canvasHeight / portalHeight
    * cameraTravelHeightMeters / referenceProjectionHeightMeters
  )
```

`renderCameraFovY` は導出値であり、設定には保存しない。DOM窓の現在Y位置はCamera Yにだけ使い、FOV変換には含めない。

導出した `renderCameraFovY` は有限値かつ次の範囲でなければならない。

```text
0 < renderCameraFovY < pi
```

設定値の違反は初期化時に例外とする。resizeなどの実行時入力が一時的に不正な場合は、前回の正常なCamera状態全体を維持し、正常な状態がなければ対象Portalを描画しない。エラーは状態遷移時だけ出力し、Three.jsへ渡すdegree値も `0 < fov < 180` であることを確認する。

## 基準投影高とCamera移動高

`referenceProjectionHeightMeters` と `cameraTravelHeightMeters` は常に個別の数値として指定または導出し、一致モードのような分岐を設けない。

両者が同値の場合は、一般式中の「Camera移動高 / 基準投影高」が結果的に1となり、参照実装相当の関係になる。同値でない設定も正常とする。

## DOM寸法と実行時矩形

Portalの寸法はCSSだけが所有する。Projection Profile、Runtime共通基準投影高、Scene ConfigurationにはDOM寸法やCSS単位を保持しない。

- CSSではpx、vw、media queryなどを自由に使える。
- Runtimeは毎フレーム `getBoundingClientRect()` から実測矩形を取得する。
- style文字列、`element.style`、`getComputedStyle()` の値を幾何入力として解析しない。
- CSSの記述単位にかかわらず、Portal GeometryへはCSS pxの数値を渡す。
- device pixelとCSS pxを区別し、DPRを幾何計算へ含めない。

FOV、進行値、Camera Yにはclip前のfull Portal rectの `y` と `h` を使う。Portalとviewportの交差矩形はscissorだけに使い、部分表示高をFOV計算へ代入しない。
