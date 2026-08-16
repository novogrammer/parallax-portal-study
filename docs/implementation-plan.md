# 実装計画

## 目的と状態

WebGL基準実装を比較基準として、同じPortal体験をWebGPUへ移行できるか段階的に検証する。幾何と投影は[垂直投影モデル](./vertical-projection.md)、機能上の合格条件は[検証条件](./validation.md)を正本とする。

| 段階 | 状態 |
| --- | --- |
| 第1段階: WebGL基準実装 | 完了 |
| 第2段階: WebGPU移行検証 | 未着手 |

## 共通方針

- 状態とライフサイクルはクラス、幾何計算とVariant選択は純粋関数で表現する。
- 型、Portal Geometry、responsive選択処理は `src/lib/parallax-portal/` のリポジトリ内Coreへ配置し、利用側は `index.ts` を入口としてRuntimeから一方向に依存する。
- RuntimeはStandalone所有と既存WebGLRendererを借りるEmbedded利用を分離し、共通のPortal Render Passを使う。
- Portal GeometryへDOM型、Three.js型、Scene固有値を持ち込まない。
- Scene生成と描画制御を分離する。
- 参照実装の固有名称、Scene構成、責務集中を引き継がない。
- 各段階の対象を越える演出や描画機能を追加しない。

## 第1段階: WebGL基準実装

WebGLRendererで、垂直投影、スクロール連動Camera、2つのPortalのscissor描画を実装した。

### 実装範囲

- 共有する1枚の透明な固定Canvasと、Portalごとに独立したSceneとCamera
- App共通基準投影高、responsive Projection Profile、Scene Configuration
- full Portal rectによるCamera Y、Camera距離、Render Camera FOVの導出
- Portalとviewportの交差矩形によるscissor、Portal単位のclearとrender
- resize、Camera aspect、DPR上限、常時requestAnimationFrame
- 初期化時の設定検証、実行時不正値に対するCamera状態維持
- Runtime、Media Query listener、Three.jsリソースの破棄
- 描画やブラウザAPIに依存しないPortal Coreと、`matchMedia()`を所有するRuntime Controllerの分離
- 画面全体の既存Canvas、単一Renderer、単一RAFへ追加できるEmbedded RuntimeとRenderer状態復元
- 純粋関数の単体テストとChromeでの表示確認

GLB、独自Shader、ポストプロセス、追加Motion、UIの本格的な作り込み、Renderer切り替え抽象化は対象外とした。現在の責務分割は[設計概要](./overview.md)、具体的な実装値は[検証条件](./validation.md)を参照する。

## 第2段階: WebGPU移行検証

### 開始条件

WebGL版の描画結果を比較基準として確認できること。

### 目的

機能とSceneを追加せず、WebGL基準実装と同じPortal体験をWebGPURendererで再現できるか検証する。

### 対象範囲

- Three.jsのimportを `three/webgpu` へ統一し、WebGPURendererへ置き換える。
- Rendererの非同期初期化に対応する。
- WebGPUの座標原点に合わせてviewportとscissorを調整する。
- 透明Canvas、Portal単位のclear、複数Scene描画を確認する。
- WebGPU backendと自動WebGL 2 fallbackを確認する。
- スクロール位置、構図、透明領域、resize挙動をWebGL版と比較する。
- 移行で変更が必要になったRuntime境界を整理する。

WebGPU専用compute、TSL、独自Material、ポストプロセス、WebGL版にない視覚効果、移行と無関係なSceneやUI変更は対象外とする。

### 完了条件

- 同じ入力からWebGL版と同等のCamera位置、投影、scissor、透明領域を得られる。
- スクロール、resize、Variant切り替えの連続性を保てる。
- WebGPU backendとWebGL 2 fallbackの双方で基本機能が成立する。
- 型検査、本番ビルド、Chromeでの表示確認が成功する。
- 不要になったWebGL固有処理が残っていない。

## 未決事項

- WebGL版を移行後も比較用として保持するか、WebGPURendererへ置き換えるか
