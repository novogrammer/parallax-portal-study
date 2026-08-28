# Study検証条件

## 実装値

| 項目 | 値 |
| --- | --- |
| Renderer | `WebGPURenderer`、`alpha: true`、`antialias: true` |
| animation loop | `setAnimationLoop()` |
| DPR上限 | `2` |
| responsive breakpoint | `768px` |
| Narrow基準FOV | `50deg` |
| Wide基準FOV | `42deg` |
| Runtime共通基準投影高 | `3m` |
| Introduction Camera Y | `7.5m` から `0m` |
| Showcase Camera Y | `3m` から `0m` |
| Camera near / far | packageのデフォルト `0.1` / `1000` |

基準投影高はSceneやviewport条件によって変更しない。wideとnarrowは同じ高さを異なる基準FOVで観測する。

## レイアウト

| 条件 | 期待結果 |
| --- | --- |
| ルートURL | Study一覧とVertical Parallax、Layered Compositionへのリンクを表示する |
| Vertical Parallax URL | `/studies/vertical-parallax/` でStudyを直接表示できる |
| Layered Composition URL | `/studies/layered-composition/` でStudyを直接表示できる |
| Study内の一覧リンク | ルートのStudy一覧へ戻れる |
| ページ全体 | Hero、Introduction、Showcase、Footerの順に並ぶ |
| Portal UI | sectionを示す外枠を表示しない |
| NarrowのHeroとFooter | 幅375pxのデザイン基準をvw換算する |
| NarrowのIntroduction | 幅、高さ、余白、文字サイズをvw換算する |
| NarrowのPortal高 | IntroductionがShowcaseの2.5倍になる |
| NarrowのShowcase | 幅375pxのデザイン基準をvw換算する |
| WideのHero、Footer、Showcase | 幅1200pxのデザイン基準をvw換算する |
| WideのIntroduction | Sceneは画面幅いっぱい、Portal高は1800pxになる |
| WideのIntroductionコンテンツ | 768pxの中央領域内で600pxのカードが右側に配置される |
| WideのIntroduction文字と余白 | px指定を使う |
| Portal間でCSS高とCamera移動高の比率が異なる | 比率を揃えず、それぞれの見え方として維持する |

## 3D表示とスクロール

| 条件 | 期待結果 |
| --- | --- |
| Introduction | 暖色のBox群を表示する |
| Showcase | 寒色のSphereとCylinder群を表示する |
| Scene内のZ距離が異なる | スクロール中の視差が変化する |
| 1m間隔の診断Cube | DOMと同じReference Plane上をCamera移動に合わせて追従する |
| Portalが部分表示 | 構図が切り替わらず、表示範囲だけが狭くなる |
| 2つのPortalが同時表示 | 各Sceneが対応するDOM領域だけに表示される |
| Portal外 | Canvasが透明で背面のDOM背景を表示する |
| resize | Canvas、Portal実測矩形、Camera aspectが新しいviewportへ追従する |
| wide / narrow切り替え | 全Portalの基準FOVが同時に切り替わる |
| スクロールとresizeの継続操作 | Console errorを繰り返さず、描画が継続する |
| 通常URL | WebGPU backendを試し、利用不可ならWebGL 2へfallbackする |
| `?forceWebGL=1` | WebGL 2 backendを強制して同じPortal表示になる |
| Canvasの `data-renderer-backend` | 初期化されたbackendを `webgpu` または `webgl2` として確認できる |

## 所有権と終了処理

| 条件 | 期待結果 |
| --- | --- |
| 初期化時にCanvasがない | Study初期化を停止し、fallback背景を表示する |
| 対象Portal DOMがない | StudyApp初期化を例外で停止する |
| pagehide | animation loopとresize listenerを解除する |
| StudyAppを破棄 | Runtime、Sceneリソース、Rendererを各所有者が破棄する |

Portal Geometry、responsive選択、Camera clipping plane、Renderer状態復元の一般的な合格条件は、package側の[検証条件](https://github.com/novogrammer/parallax-portal/blob/main/docs/validation.md)を正本とする。

## Layered Composition初期構成

| 条件 | 期待結果 |
| --- | --- |
| section構成と本文 | Vertical Parallaxと同じHero、Introduction、Showcase、Footerを表示する |
| Portal数 | 2つ |
| 各Scene直下のオブジェクト数 | `0` |
| Portal表示 | 各Sceneのclear colorだけを表示し、3Dオブジェクトを描画しない |
| 通常URL | WebGPU backendで初期化できる |
| `?forceWebGL=1` | WebGL 2 backendで同じ空Sceneを表示できる |
| 今回の対象外 | 透過画像、`data-depth`、DOM矩形の逆投影 |

## 自動検証

```sh
npm ci
npm test
npm run build
```

本番ビルドでは、Study一覧、Vertical Parallax、Layered CompositionのHTMLがそれぞれ `dist/` に生成されることを確認する。Studyの単体テストでは、wide / narrowの共有FOV、共通基準投影高、PortalごとのCamera Y範囲、Layered Compositionの空Scene、`setAnimationLoop()` による開始と停止を確認する。見た目に影響する変更ではブラウザで通常のWebGPU経路と `?forceWebGL=1` の双方について、各Portalの表示とConsole error不在を確認する。
