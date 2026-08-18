# 検証条件

## 検証ケース

| ケース | 期待結果 |
| --- | --- |
| Reference FOVと基準投影高 | 基準Camera距離を一意に導出できる |
| vertical FOV | 上側が正のY、下側が負のYへ投影される |
| `centerProgress = 0` | `cameraY = cameraTopY` |
| `centerProgress = 1` | `cameraY = cameraBottomY` |
| Camera移動高と基準投影高が同じ | FOV変換の高さ比が1になる |
| Camera移動高と基準投影高が異なる | 高さ比を含むRender Camera FOVが得られる |
| Portalが部分表示 | scissorだけが変化し、Camera YとFOVは連続する |
| viewportより大きいPortal | full Portal rectによる計算が維持される |
| 複数Portalを同時表示 | 各Sceneが対応するscissor領域だけに描画される |
| Portalごとの描画 | WebGL viewportはCanvas全体のまま、scissorだけが交差矩形へ変わる |
| Portal描画前 | 対象scissor内のcolor bufferとdepth bufferがclearされる |
| Embedded RuntimeでPortalを描画 | 借りたRendererのviewport、scissor、scissor test、clear設定、`autoClear`、render targetが復元される |
| Embedded RuntimeのPortal描画で例外 | Renderer状態を復元してから例外がホストへ伝播する |
| Embedded Runtimeを破棄 | listenerを解除し、借りたSceneとRendererは破棄しない |
| StandaloneのPortal外Canvas領域 | 透明で背面のDOMが表示される |
| EmbeddedのPortal外Canvas領域 | ホストが先に描画した内容を変更しない |
| 複数Portalを配置 | Portal同士が重ならず、描画順に依存しない |
| 複数Portalのresponsive切り替え | 同じProjection Profileが全Portalへ適用される |
| 同じSceneを複数Portalへ渡す | Portalごとに独立したCamera結果を持つ |
| Scene内のZ距離が異なる | 透視投影上の視差が変化する |
| CSSでvw指定 | `getBoundingClientRect()` のCSS px実測値で計算できる |
| CSSでpx指定 | `getBoundingClientRect()` のCSS px実測値で同じ計算を使える |
| Portal間でCSS高とCamera移動高の比率が異なる | 比率を統一せず、Portalごとの `cameraMetersPerCssPixel` を投影へ反映する |
| resize | 実測DOM矩形とCanvas寸法から連続的に再計算される |
| ブラウザズーム | CSS pxへ正規化した寸法比で再計算される |
| progressが0未満または1超 | clampせず、同じ式でCamera Yが線形外挿される |
| `cameraTopY == cameraBottomY` | 設定例外を投げて処理を終了する |
| Portalがないフレーム | requestAnimationFrame自体は継続する |
| Portalが左右に寄る | Camera Xは固定され、Canvas上の対応領域がscissorされる |
| 複数のMedia Queryが一致 | `rules` の上から最初に一致したProjectionだけが選ばれる |
| どのMedia Queryにも一致しない | 必須の `otherwise` Projectionが選ばれる |
| viewport条件が切り替わる | 選択されたProjection Profileが適用される |
| 条件付きProjectionから `otherwise` へ戻る | `otherwise` が指定するProjection Profileへ戻る |
| Runtimeを破棄 | 登録したMedia Queryの変更listenerが解除される |
| Camera Yが移動 | Camera Xは `0m`、Camera Zは基準Camera距離、向きは負のZ方向に維持される |
| 設定値から不正なFOVが導出される | Runtime生成時に設定例外を投げて処理を終了する |
| 実行時入力から一時的に不正なFOVが導出される | Cameraを部分更新せず、前回の正常状態全体を維持する |
| 初回から実行時FOVが不正 | 対象Portalを描画しない |
| 不正状態が複数フレーム継続 | `console.error` を毎フレーム繰り返さない |
| Portal DefinitionへDOM要素を渡す | その要素の実測矩形がPortal Geometryへ使われる |
| Standaloneの対象DOM要素がない | App初期化時に例外を投げて処理を終了する |

## 第1段階の実装値

WebGL基準実装では次の値と処理を採用する。これらはPortal Geometryの一般式ではなく、Runtime、Projection Profile、Scene、Page / UIの設定値である。

- Cameraの `near` は `0.1`、`far` は `100`
- DPR上限は `2`
- responsive breakpointは `(min-width: 768px)`
- Wide Profileは基準FOV `42deg`、Narrow Profileは基準FOV `50deg`
- PortalRuntime内で共有する基準投影高は `3m` とし、Sceneやviewport条件によって変更しない
- 暖色SceneはCamera Y `7.5m` から `0m`、寒色Sceneは `3m` から `0m` とする
- 習作で比較しやすいデザイン値として、SPのIntroduction高とCamera移動高をShowcaseの `2.5倍` とする。この比率はPortal Geometryの一般要件ではない
- wide / narrowは同じ基準投影高を異なるFOVで観測し、基準Camera距離はFOVから個別に導出する
- 暖色SceneはBox群、寒色SceneはSphereとCylinder群で構成し、それぞれ近景、中景、遠景とLightを持つ
- CSS高とCamera移動の対応を目視確認するための診断要素として、Camera Y範囲内の `X = 0m`、`Z = 0m` にY方向1m間隔の小さなCubeを一時的に置く
- Scene rootはpositionとrotationを0、scaleを1に維持し、個々のオブジェクト配置はScene生成コードで定義する
- WebGL scissorは可視領域を欠落させないよう、左と下を `floor`、右と上を `ceil` する

## 未決事項

- 対応ブラウザ範囲
