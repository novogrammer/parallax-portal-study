# 実装計画

## 目的と状態

WebGL基準実装を比較対象として、同じPortal体験をWebGPUへ移行できるか段階的に検証する。Study固有の構成は[概要](./overview.md)、実装値と表示上の合格条件は[検証条件](./validation.md)を参照する。

Portal Runtime、Geometry、投影数式の正本は、別リポジトリの[parallax-portal](https://github.com/novogrammer/parallax-portal)に置く。

| 段階 | 状態 |
| --- | --- |
| 第1段階: WebGL基準実装 | 完了 |
| 第2段階: WebGPU移行検証 | 進行中 |

## 共通方針

- `parallax-portal` をGitHubのcommit SHAへ固定して利用する。
- 習作固有のApp、Renderer、設定、Sceneは `main.ts` と同じ `src/` 直下へ置く。
- StudyがCanvas、WebGPURenderer、resize、`setAnimationLoop()`、全体clear、Sceneリソースを所有する。
- packageから借りる `PortalRuntime` へRenderer、DOM要素、Scene、Projection設定を渡す。
- Scene内のオブジェクト配置はStudyのScene生成コードで調整する。
- packageの一般仕様をStudyへ複製せず、この習作で選んだ値と検証結果だけを記録する。
- 各段階の対象を越える演出や描画機能を追加しない。

## 第1段階: WebGL基準実装

`WebGLRenderer` と `parallax-portal` を使い、垂直投影、スクロール連動Camera、2つのPortalのscissor描画を実装した。

### 実装範囲

- viewport全体を覆う1枚の透明な固定Canvas
- 単一のWebGLRenderer、resize処理、DPR上限、requestAnimationFrame
- Portal 01: Introductionと暖色のBox Scene
- Portal 02: Showcaseと寒色のSphere / Cylinder Scene
- responsive条件で共有FOVを切り替えるStudy設定
- PortalごとのCamera Y範囲とRuntime共通基準投影高
- Hero、2つのPortal、Footerからなるページ構成
- narrowのvwベースとwideのpx / vw混在レイアウト
- Studyが所有するSceneリソースとRendererの終了処理
- packageを既存Rendererと単一RAFへ組み込むStandalone利用例
- 設定の単体テストとChromeでの表示確認

GLB、独自Shader、ポストプロセス、追加Motion、UIの本格的な作り込みは対象外とした。

## 第2段階: WebGPU移行検証

### 開始条件

WebGL版の描画結果を比較基準として確認できること。

### 目的

機能とSceneを追加せず、WebGL基準実装と同じPortal体験を `WebGPURenderer` で再現できるか検証する。

### 対象範囲

- Three.jsのimportを `three/webgpu` へ統一し、WebGPURendererへ置き換える。
- `setAnimationLoop()` にRendererの非同期初期化と描画開始を委ねる。
- WebGPUの座標原点に合わせてviewportとscissorを調整する。
- 透明Canvas、Portal単位のclear、複数Scene描画を確認する。
- WebGPU backendと自動WebGL 2 fallbackを確認する。
- スクロール位置、構図、透明領域、resize挙動をWebGL版と比較する。
- package側に必要となる変更と、Study固有の変更を分けて整理する。

WebGPU専用compute、TSL、独自Material、ポストプロセス、WebGL版にない視覚効果、移行と無関係なSceneやUI変更は対象外とする。

### 完了条件

- WebGL版と同じ入力から同等のCamera位置、投影、Portal領域、透明領域を得られる。
- スクロール、resize、responsive Projection切り替えの連続性を保てる。
- WebGPU backendとWebGL 2 fallbackの双方で基本機能が成立する。
- 型検査、本番ビルド、Chromeでの表示確認が成功する。
- packageとStudyの責務境界が文書化されている。

## 未決事項

- WebGPU版のブラウザ検証後、packageとStudyをmainへマージするか
