# Parallax Portal 設計概要

## 目的

DOM上をスクロールする窓の内側に3D空間を表示し、Scene内の実際の奥行きから視差を生じさせる仕組みを、特定のSceneや描画ライブラリに依存しない形で定義する。

現段階ではMarkdownによる設計だけを対象とし、アプリケーションコードやビルド設定は作成しない。

Portalのスクロール方向は縦だけとし、表示領域は矩形とする。横方向スクロール、border radiusや任意形状mask、`prefers-reduced-motion` 対応は対象外とする。

将来のWeb実装はVite + TypeScript + Three.jsを使う。SceneはTypeScriptコードからThree.jsのGeometry、Material、Object3Dなどを生成して構築し、GLBなどの外部3Dアセット読み込みは初期対象に含めない。

## 全体構造

viewport全体を覆う1枚の `position: fixed` Canvasへ、PortalごとのSceneを順番に描画する。各Sceneの表示範囲は、対応するDOM窓とviewportの交差矩形でscissorする。

fixedはCanvas要素のCSS配置を指す。Canvasはスクロールで移動しないが、viewportのresize時にはCSS寸法、描画バッファ、Camera aspectを現在のviewportへ合わせて更新する。Canvas寸法、Camera、描画内容を静止させる意味ではない。

```text
Page / DOM
    |
    | full Portal rect
    v
Portal Geometry <--- Projection Profile
    |
    | Camera position, projection, scissor rect
    v
Renderer Adapter ---> position: fixed Canvas ---> Scene
```

- full Portal rectはCameraと投影の計算に使う。
- Portalとviewportの交差矩形はscissorだけに使う。
- WebGL viewportは常にCanvas全体とし、Portalごとに変更しない。
- 部分表示時もCameraと構図を切り替えず、描画範囲だけを狭める。
- 複数Portalはそれぞれ独立したScene、Camera、Projection Profileを持てる。
- SceneインスタンスはPortalごとに生成し、同じ `sceneId` を使うPortal間でも共有しない。
- Camera Xは初期値に固定し、PortalのX位置やスクロールでは動かさない。
- 左右に寄ったPortalは、Canvas全体へ投影されたSceneの対応領域をそのままscissorする。
- Canvasは透明とし、Portal以外の領域では背面のDOMを表示する。
- Portal同士は重ならないようにPage / UIで配置し、描画順による重なり規則は設けない。
- CanvasをDOMより背面に置く場合、Portalとして見せる領域はCanvasを遮らないレイヤー構成にする。

投影の計算は[垂直投影モデル](./vertical-projection.md)、確認事項は[検証](./validation.md)を正本とする。

## 座標系と単位

### DOM / viewport

- 原点はviewport左上
- Xは右向きが正
- Yは下向きが正
- 実行時計算の単位はCSS px

### 3D

- Xは右向きが正
- Yは上向きが正
- Cameraは回転なしで負のZ方向を見る
- Cameraのupは正のY方向
- Camera Xは初期値に固定
- Camera Xの初期値は `0m`
- Reference Planeは初期状態で `z = 0`
- `1 world unit = 1m`

vertical FOVの上側は3D空間の正のY方向、下側は負のY方向に対応する。この向きはスクロール中も反転させない。

## 概念モデル

### Scene

TypeScriptコードから生成するThree.jsの3Dコンテンツ。長さはm、座標方向は共通定義に従い、オブジェクトを実際の3D位置へ配置する。表示範囲はCameraのfrustumとPortalのscissorによって決まり、Sceneはsafe area、推奨深度、構図を規定しない。

### Projection Profile

Sceneの見せ方を定義する。同じSceneを異なるPortalや構図で再利用できるよう、Scene本体から分離する。

```text
ProjectionProfile
├── profileId
├── referenceFovY
├── referenceProjectionHeightMeters
├── cameraTopY
└── cameraBottomY
```

### Portal Configuration

DOM窓とSceneを関連付け、viewport条件に応じてProjection ProfileとScene Variantの組み合わせを選択する。

```text
PortalConfiguration
├── portalId
├── sceneId
└── responsiveVariants
    ├── rules[]
    │   ├── query
    │   └── variant
    │       ├── projectionProfileId
    │       └── sceneVariantId
    └── otherwise
        ├── projectionProfileId
        └── sceneVariantId
```

`portalId` は一意とし、DOM側の `[data-portal-id="..."]` と対応させる。要素が見つからない場合は初期化時の設定例外とする。

`query` は `matchMedia()` へ渡すMedia Query文字列とし、具体的なブレークポイントとVariantの対応はTypeScriptの設定オブジェクトに記述する。Portalごとの条件分岐を選択ロジックへハードコードしない。

共通の選択処理は `rules` を上から評価し、最初に一致したVariantを選ぶ。どの条件にも一致しない場合は必須の `otherwise` を選ぶため、常にちょうど1つのVariantが有効になる。各Variantは差分ではなく完全な状態として扱い、切り替え時にはProjection ProfileとScene Variantの両方を適用する。

`sceneVariantId` はコード生成Sceneへ渡す調整一式を識別する。既存Sceneへ位置、回転、スケール、表示状態などを絶対値で再適用し、以前のVariantによる状態を残さない。`otherwise` を含むすべてのVariantが完全なScene状態を再現できるものとする。

Scene VariantはMedia Queryによって選択し、Portalごとに所有するSceneインスタンスへ適用する。他のPortalのScene状態には影響しない。

`renderCameraFovY`、Camera Y移動高、Camera距離、スクロール進行値は設定として保持せず、実行時に導出する。

## 責務

### Portal Geometry

- DOM矩形とviewportの交差判定
- スクロール進行値とCamera Yの計算
- Reference FOVからRender Camera FOVへの変換
- `position: fixed` Canvasのaspectから水平FOVと可視幅を導出
- 入力値の検証

DOM型、Three.js型、描画ループには依存しない純粋な計算とする。

### Motion Policy

- 追加の移動、回転、pointer入力

基本Camera YはPortal Geometryがclampなしの線形補間で求め、Motion Policyでは変更しない。

### Runtime

- `position: fixed` Canvasの生成とresize
- Three.jsのWebGLRendererとPerspectiveCamera
- alphaを有効にし、CanvasのPortal外領域を透明に維持
- Cameraを `(0, cameraY, referenceCameraDistance)` に置き、回転なしで負のZ方向へ向ける
- `near` と `far` にRuntime共通の代表値を使い、Scene規模に応じて調整
- DPR上限
- WebGL viewportをCanvas全体に固定し、Portalごとに交差矩形だけをscissorへ設定
- Portal描画前にscissor内のcolor bufferとdepth bufferをclear
- 導出したCamera値の描画エンジンへの適用
- 描画対象Portalの選別
- Sceneの読み込みと破棄
- Media Queryの変更時に有効なVariantを再選択し、完全な状態として適用
- Runtime破棄時にMedia Queryの変更listenerを解除
- 常時requestAnimationFrameによる描画ループ

Camera Yが移動してもCameraの向きは負のZ方向に固定する。原点への `lookAt()` はCameraを傾けるため使用しない。

### Page / UI

- DOM窓と通常コンテンツの配置
- Portal同士が重ならない配置
- 一意な `data-portal-id` とPortal Configurationの `portalId` の対応
- Portalの寸法をCSSで定義し、pxまたはvwなどのCSS単位を使用
- DOM Adapterが毎フレーム `getBoundingClientRect()` からfull Portal rectをCSS pxで取得
- style文字列やCSS単位をJavaScriptで解析しない
- viewport条件、Projection Profile、Scene Variantの対応を設定として定義
- アクセシビリティと前面レイヤー

## 1フレームのデータフロー

初期化時とMedia Queryの変更時に、各Portalの `rules` を上から評価して有効なVariantを選択する。常時requestAnimationFrameを実行し、各フレームでPortalごとに次の順で処理する。

1. viewport寸法とfull Portal rectを取得する。
2. Portalとviewportの交差矩形を求める。
3. 交差領域がなければ描画対象から外す。
4. Projection Profileとfull Portal rectからCamera Y、Camera距離、Render Camera FOV、可視幅を導出する。
5. Motion Policyによる追加演出を適用する。
6. Canvas全体のWebGL viewportを維持したまま、交差矩形をscissorへ設定する。
7. scissor内のcolor bufferとdepth bufferをclearしてSceneを描画する。

Scene IDやProfile IDによる条件分岐をPortal Geometryへ埋め込まない。
