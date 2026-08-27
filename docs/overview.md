# Vertical Parallax Study 構成

## 目的

DOM上をスクロールする2つの窓へ独立したThree.js Sceneを表示し、1枚の固定Canvas、単一の `WebGPURenderer`、単一の描画ループで垂直パララックスを検証する。WebGPUが利用できない環境では、WebGPURendererのWebGL 2 backendへfallbackする。

Portal Geometry、投影数式、responsive選択、Portal用Camera、scissor描画、Renderer状態復元は、別リポジトリの未公開package [parallax-portal](https://github.com/novogrammer/parallax-portal) を利用する。ライブラリ一般仕様は[package側の文書](https://github.com/novogrammer/parallax-portal/tree/main/docs)を正本とし、この文書では習作への組み込み方だけを扱う。

## 構造

Viteのrootは `src/` とする。`src/index.html` はStudy一覧を表示し、各Studyを独立したHTMLエントリとして開く。現在のStudyは次の構成とする。

```text
src/studies/vertical-parallax/index.html
├── Hero
├── Portal 01: Introduction
├── Portal 02: Showcase
└── Footer
        |
        | data-portal-id / CSS実測矩形
        v
StudyApp
├── studyConfig
├── studyScene
├── parallax-portal / PortalRuntime
└── StudyRenderer
        |
        v
fixed Canvas / WebGPURenderer / setAnimationLoop
```

依存方向はStudyからpackageへの一方向とする。packageはこの習作のDOM構成、CSS、Scene、設定値、Standalone描画ループを知らない。

## Study側のファイル

| ファイル | 責務 |
| --- | --- |
| `src/index.html` | Study一覧と各Studyへのリンクを定義する |
| `src/studies/vertical-parallax/index.html` | Study固有のDOMとCanvasを定義する |
| `src/studies/vertical-parallax/main.ts` | Canvasを取得し、StudyAppを初期化して開始する |
| `src/studies/vertical-parallax/StudyApp.ts` | DOM要素、Scene、設定、PortalRuntime、StudyRendererを組み立てて破棄する |
| `src/studies/vertical-parallax/StudyRenderer.ts` | WebGPURenderer、Canvas resize、DPR上限、全体の透明clear、animation loopを所有する |
| `src/studies/vertical-parallax/studyConfig.ts` | この習作で使うFOV、基準投影高、Camera Y範囲を定義する |
| `src/studies/vertical-parallax/studyScene.ts` | 暖色・寒色の検証Sceneを生成し、所有するGPUリソースを破棄する |
| `src/studies/vertical-parallax/style.scss` | ページ、Portal寸法、コンテンツのレスポンシブレイアウトを定義する |

Study固有のHTML、コード、将来追加するassetsは `src/studies/<study-name>/` へまとめる。ルートの一覧は各Studyへの入口だけを持ち、Study間でRuntimeやSceneを共有しない。

## PageとPortal

ページはHero、Introduction、Showcase、Footerの順に並ぶ。IntroductionとShowcaseがPortalであり、それぞれ一意な `data-portal-id` を持つ。Portalの外枠は表示せず、見出しと通常コンテンツを3D Sceneの前面へ重ねる。

Canvasは `position: fixed` でviewport全体を覆い、DOMコンテンツの背面に置く。Portal外は透明にclearし、HeroとFooterでは通常のDOM背景を表示する。

Portal同士はDOM上で重ならない。隣接する境界では同じフレームに両方が見える場合があり、各Sceneを対応するscissor領域だけへ描画する。

## CSS設計

breakpointは `768px` とする。

### Narrow

- HeroとFooterは幅 `375px` のデザイン基準をvwへ換算する。
- Introductionは幅、高さ、余白、文字サイズを同じvw基準で指定する。
- Introduction高はShowcase高の `2.5倍` とする。
- Showcaseは幅 `375px` のデザイン基準をvwへ換算する。

### Wide

- Hero、Footer、Showcaseは幅 `1200px` のデザイン基準をvwへ換算する。
- IntroductionのSceneは画面幅いっぱいに表示し、Portal高は `1800px` とする。
- Introductionのコンテンツ領域は中央の `768px` 幅とし、各 `600px` 幅のカードを `margin-left: auto` で右側へ置く。
- Introduction内の余白と文字サイズはpxで指定する。

CSSの単位やPortal間の垂直スケールをRuntime側で統一しない。Runtimeへ渡るのは `getBoundingClientRect()` から得たCSS pxの実測値であり、pxとvwの違いはデザイン結果として許容する。

## Sceneと設定

Introductionには暖色のBox群、Showcaseには寒色のSphereとCylinder群を置く。各Sceneは近景・中景・遠景とLightを持ち、オブジェクトの位置は `studyScene.ts` で調整する。

Scene rootのpositionとrotationは0、scaleは1を維持し、`1 world unit = 1m` として扱う。Camera Y範囲とDOM高の対応を確認するため、`X = 0m`、`Z = 0m` にY方向1m間隔の小さなCubeを置く。

この習作で選んだ具体値は[検証条件](./validation.md)を参照する。数式と各設定値の意味はpackage側の[垂直投影モデル](https://github.com/novogrammer/parallax-portal/blob/main/docs/vertical-projection.md)を参照する。

## Standalone統合

`PortalRuntime` は既存Rendererを借りるライブラリであり、Standaloneアプリケーションに必要な所有権はStudy側で補う。

`StudyRenderer` は次を所有する。

- `alpha: true`、`antialias: true` の `WebGPURenderer`
- DPR上限 `2`
- viewportに合わせたRenderer resize
- `setAnimationLoop()` による非同期初期化と単一描画ループ
- 各フレーム冒頭のCanvas全体の透明clear
- 終了時のRenderer破棄

`StudyApp` はSceneを生成して `PortalRuntime` へ貸し出す。終了時はStudyRendererがanimation loopを停止してRendererを破棄し、続いてRuntimeのlistenerとSceneのGeometry、Materialを各所有者が解放する。

`StudyRenderer.start()` は `await renderer.setAnimationLoop()` で初期化と描画開始を行い、終了時は `setAnimationLoop(null)` で停止する。明示的な `renderer.init()` と手動requestAnimationFrameは使わない。

1フレームではStudyRendererがCanvas全体を透明にclearし、その後 `PortalRuntime.render()` を呼ぶ。PortalごとのCamera計算、WebGPU左上原点のscissor、clear、Scene描画とRenderer状態復元はpackage側の責務である。

通常URLではWebGPU backendを試し、利用できなければ自動fallbackする。`?forceWebGL=1` を付けた場合は、表示比較のためWebGL 2 backendを強制する。このqueryはStudy固有であり、package APIには含めない。
