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
| Portalごとの描画 | WebGL viewportはCanvas全体のまま、scissorだけが交差矩形へ変わる |
| Portal描画前 | 対象scissor内のcolor bufferとdepth bufferがclearされる |
| Portal外のCanvas領域 | 透明で背面のDOMが表示される |
| 複数Portalを配置 | Portal同士が重ならず、描画順に依存しない |
| 同じSceneを異なるProfileで使用 | 各Portalが独立したCamera結果を持つ |
| 異なるSceneとProfileを使用 | 一方の設定変更が他方へ影響しない |
| 同じScene IDを複数Portalで使用 | Portalごとに異なるSceneインスタンスが生成される |
| CSSでvw指定 | `getBoundingClientRect()` のCSS px実測値で計算できる |
| CSSでpx指定 | `getBoundingClientRect()` のCSS px実測値で同じ計算を使える |
| resize | 実測DOM矩形とCanvas寸法から連続的に再計算される |
| ブラウザズーム | CSS pxへ正規化した寸法比で再計算される |
| progressが0未満または1超 | clampせず、同じ式でCamera Yが線形外挿される |
| `cameraTopY == cameraBottomY` | 設定例外を投げて処理を終了する |
| Portalがないフレーム | requestAnimationFrame自体は継続する |
| Portalが左右に寄る | Camera Xは固定され、Canvas上の対応領域がscissorされる |
| 複数のMedia Queryが一致 | `rules` の上から最初に一致したVariantだけが選ばれる |
| どのMedia Queryにも一致しない | 必須の `otherwise` Variantが選ばれる |
| 非アクティブなruleの参照先が不正 | 初期化時に設定例外を投げて処理を終了する |
| viewport条件が切り替わる | 選択されたProjection Profileが適用される |
| 条件付きVariantから `otherwise` へ戻る | `otherwise` が指定するProjection Profileへ戻る |
| Runtimeを破棄 | 登録したMedia Queryの変更listenerが解除される |
| Camera Yが移動 | Camera Xは `0m`、Camera Zは基準Camera距離、向きは負のZ方向に維持される |
| 設定値から不正なFOVが導出される | 初期化時に設定例外を投げて処理を終了する |
| 実行時入力から一時的に不正なFOVが導出される | Cameraを部分更新せず、前回の正常状態全体を維持する |
| 初回から実行時FOVが不正 | 対象Portalを描画しない |
| 不正状態が複数フレーム継続 | `console.error` を毎フレーム繰り返さない |
| `data-portal-id` と `portalId` が一致 | DOM窓とPortal Configurationが一意に対応する |
| `portalId` に対応するDOM要素がない | 初期化時に設定例外を投げて処理を終了する |

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
- WebGL viewportをPortal矩形へ変更せず、Canvas全体への投影をscissorだけで切り取れる。
- Portalごとの描画結果が、以前に描画したPortalのcolor bufferまたはdepth bufferに影響されない。
- Portal外のCanvas領域を透明に維持できる。
- Scene内の実際のZ距離に応じて透視投影上の視差が変化する。
- Scene IDやProfile IDによる条件分岐をPortal Geometryへ埋め込まない。
- Portalの描画順が各PortalのCamera計算へ影響しない。
- 表示対象Portalの有無にかかわらずrequestAnimationFrameを継続する。
- Camera XをPortal位置またはスクロールによって変更しない。
- Media Queryの重複や不一致にかかわらず、優先順位と `otherwise` により常に1つのVariantを選択できる。
- ブレークポイントとVariantの対応を設定で変更でき、Portal固有の条件分岐を共通選択処理へ追加する必要がない。
- Variant切り替え後のProjection Profileが、切り替え前のVariantに依存しない。
- SceneインスタンスをPortal間で共有せず、一方のPortalの状態が他方へ影響しない。
- `portalId` によってPortal ConfigurationとDOM要素を一意に対応付けられる。
- Cameraを `(0, cameraY, referenceCameraDistance)` に置き、Camera Yにかかわらず負のZ方向へ向けられる。
- 不正なRender Camera FOVによって、Camera状態の一部だけが更新されない。

## 第1段階の実装値

WebGL基準実装では次の値と処理を採用する。これらはPortal Geometryの一般式ではなく、Runtime、Projection Profile、Scene、Page / UIの設定値である。

- Cameraの `near` は `0.1`、`far` は `100`
- DPR上限は `2`
- responsive breakpointは `(min-width: 768px)`
- Wide Profileは基準FOV `42deg`、Narrow Profileは基準FOV `50deg`
- グローバルな基準投影高は `3m` とし、Sceneやviewport条件によって変更しない
- 暖色SceneはCamera Y `7.5m` から `0m`、寒色Sceneは `3m` から `0m` とする
- SPのIntroduction高はShowcase高の `2.5倍` とし、Camera移動高も同じ比率にする
- wide / narrowは同じ基準投影高を異なるFOVで観測し、基準Camera距離はFOVから個別に導出する
- 暖色SceneはBox群、寒色SceneはSphereとCylinder群で構成し、それぞれ近景、中景、遠景とLightを持つ
- Camera Y範囲内の `X = 0m`、`Z = 0m` に、Y方向1m間隔の小さなCubeを検証用目印として置く
- Scene rootはpositionとrotationを0、scaleを1に維持し、個々のオブジェクト配置はScene生成コードで定義する
- WebGL scissorは可視領域を欠落させないよう、左と下を `floor`、右と上を `ceil` する

## 未決事項

- 対応ブラウザ範囲
