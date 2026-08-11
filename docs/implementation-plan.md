# 実装計画

## 目的

設計済みのParallax Portalを、まずWebGLで基準実装し、その描画結果を基準としてWebGPUへの移行を検証する。

実装順序と各段階の対象範囲は本書を正本とする。幾何と投影の仕様は[垂直投影モデル](./vertical-projection.md)、機能上の合格条件は[検証条件](./validation.md)を正本とし、本書では重複して定義しない。

## 状態

| 段階 | 状態 |
| --- | --- |
| 第1段階: WebGL基準実装 | 完了 |
| 第2段階: WebGPU移行検証 | 未着手 |

## 実装方針

- 状態とライフサイクルを所有する責務はクラスで表現する。
- 幾何計算とVariant選択は、副作用や内部状態を持たない純粋関数とする。
- Portal GeometryへDOM型、Three.js型、Scene固有値を持ち込まない。
- Scene生成と描画制御を分離する。
- 参照実装は挙動を理解する材料とし、固有の名称、Scene構成、単一クラスへの責務集中は引き継がない。
- 各段階では対象範囲を越える演出や描画機能を追加しない。

## 第1段階: WebGL基準実装

### 目的

WebGLRendererを使い、垂直投影、スクロール連動Camera、複数Portalのscissor描画が設計どおり成立する基準実装を作る。

### 対象範囲

- ページ全体で共有する1枚の透明な `position: fixed` Canvas
- Three.jsのWebGLRenderer
- 2つのPortal
- Portalごとに独立したScene、PerspectiveCamera、Scene Configuration
- PCとSPを想定した共有Projection Profile
- 全Sceneとviewport条件で共有する基準投影高
- 近景、中景、遠景の視差を確認できるプリミティブGeometryによる検証Scene
- full Portal rectを使ったCamera Y、Camera距離、Render Camera FOVの導出
- Portalとviewportの交差矩形を使ったscissor描画
- Portal描画前のscissor内color bufferとdepth bufferのclear
- Canvas resize、Camera aspect更新、DPR上限
- PCとSPを想定した2種類以上のresponsive Variant
- Media Query変更時のProjection Profileの再適用
- 初期化時の設定検証と、実行時入力から不正値が導出された場合の状態維持
- RuntimeとMedia Query listenerを破棄する処理
- 幾何計算とVariant選択の単体テスト
- Chromeでのスクロール、resize、複数Portal同時表示の確認

### 対象外

- GLBなどの外部3Dアセット
- TSL、ShaderMaterial、独自Shader
- ポストプロセス
- pointer入力や追加のMotion Policy
- 高品質なSceneデザインとマテリアル調整
- UIの本格的な作り込み
- requestAnimationFrameの停止制御
- WebGLRendererとWebGPURendererを実行時に切り替える抽象化
- 本格的なパフォーマンス最適化

### クラスの責務

#### `ParallaxPortalApp`

- 設定、DOM、Scene生成、Runtimeを組み立てる。
- 初期化、開始、破棄の入口を提供する。
- 初期化失敗時に不完全なRuntimeを開始しない。
- Media Queryの現在の一致状態にかかわらず、全Variantの参照を初期化時に検証する。

#### `PortalRenderer`

- WebGLRendererと共有Canvasを所有する。
- resizeと常時requestAnimationFrameによる描画ループを管理する。
- Canvas全体のWebGL viewportを維持する。
- 描画対象Portalごとにscissor、clear、renderを実行する。
- Rendererのリソースを破棄する。

#### `PortalInstance`

- 1つのPortalに対応するDOM要素、Scene、Cameraを所有する。
- 現在選択されているProjection Profileを保持する。
- Scene固有のCamera Y範囲を保持する。
- Portal固有のThree.jsリソースを破棄する。

#### `ResponsiveVariantController`

- Media Queryの `rules` を上から評価し、最初に一致したVariantを選択する。
- 一致するruleがない場合は必須の `otherwise` を選択する。
- Media Queryの変更を監視し、選択結果が変わった場合に通知する。
- 破棄時に登録したlistenerを解除する。

### 純粋関数の責務

次の計算を、DOMとThree.jsから独立した純粋関数として実装する。

- Portalとviewportの交差矩形
- スクロール進行値
- Reference PlaneまでのCamera距離
- Camera Y
- Render Camera FOV Y
- responsive Variantの選択
- 設定値と実行時入力の検証

### Scene生成

検証Sceneは生成関数から作る。生成結果にはScene本体と破棄に必要な処理を含める。個々のオブジェクト配置を含む具体的なGeometry、Material、LightをPortalRendererへ埋め込まない。

### 完了条件

- [検証条件](./validation.md)のうち、対象範囲に該当する項目を満たす。
- 2つのPortalが同時表示されても、各Sceneが対応するscissor領域だけに描画される。
- Portal外のCanvas領域が透明に維持される。
- 近景、中景、遠景が実際のZ距離に応じた視差を示す。
- PCとSPのVariant切り替え後に、選択されたProjection Profileが正しく適用される。
- 単体テスト、TypeScriptの型検査、本番ビルドが成功する。
- Chromeでスクロールとresizeを行い、CameraとFOVが不連続に変化しないことを確認できる。
- Consoleに未処理の例外や毎フレーム繰り返されるエラーがない。

## 第2段階: WebGPU移行検証

### 開始条件

第1段階の完了条件を満たし、WebGL版の描画結果を比較基準として確認できること。

### 目的

機能とSceneを追加せず、WebGL基準実装と同じPortal体験をWebGPURendererで再現できるか検証する。

### 対象範囲

- Three.jsのimportを `three/webgpu` へ統一
- WebGPURendererへの置き換え
- Rendererの非同期初期化
- WebGPURendererの左上原点に合わせたviewportとscissor座標
- 透明Canvas、Portal単位のclear、複数Scene描画の互換性確認
- WebGPU backendと自動WebGL 2 fallbackの確認
- WebGL基準実装とのスクロール位置、構図、透明領域、resize挙動の比較
- WebGPU移行によって変更が必要になったRuntime境界の整理

### 対象外

- WebGPU専用のcompute処理
- TSLによる独自Material
- WebGPU専用のポストプロセス
- WebGL基準実装に存在しない視覚効果
- 移行と無関係なSceneやUIの変更

### 完了条件

- 第1段階と同じ入力から同等のCamera位置と投影結果が得られる。
- 2つのPortalのscissor範囲と透明領域がWebGL版と一致する。
- スクロール、resize、Variant切り替えでWebGL版と同等の連続性を保つ。
- WebGPU backendで型検査、本番ビルド、Chromeでの表示確認が成功する。
- WebGL 2 fallbackでも基本機能が成立する。
- WebGPU移行後に不要となったWebGL固有処理が残っていない。

## 未決事項

次の判断は、第2段階の実装と表示確認の中で決める。

- WebGL版を移行後も比較用として保持するか、WebGPURendererへ置き換えるか
