# Parallax Portal 設計概要

## 目的

DOM上をスクロールする窓の内側に3D空間を表示し、Scene内の実際の奥行きから視差を生じさせる仕組みを定義する。Portal Geometryは特定のSceneや描画ライブラリに依存させず、描画Runtimeと分離する。

現在はVite + TypeScript + Three.jsによるWebGL基準実装まで完了している。対象範囲と次段階は[実装計画](./implementation-plan.md)を参照する。

## 全体構造

viewport全体を覆う1枚の `position: fixed` Canvasへ、PortalごとのSceneを順番に描画する。各Sceneの表示範囲は、対応するDOM窓とviewportの交差矩形でscissorする。

fixedはCanvas要素のCSS配置を指す。Canvasはスクロールで移動しないが、viewportのresize時にはCSS寸法、描画バッファ、Camera aspectを現在のviewportへ合わせて更新する。Canvas寸法、Camera、描画内容を静止させる意味ではない。

```text
Page / DOM
    |
    | full Portal rect
    v
Portal Core / Geometry <--- Projection Profile
        ^
        |
        +---------- Scene Configuration
        |
        +---------- Runtime共通のreferenceProjectionHeightMeters
    |
    | Camera position, projection, scissor rect
    v
Portal Runtime ---> host Renderer ---> position: fixed Canvas ---> Scene
```

`src/lib/parallax-portal/` にリポジトリ内で再利用するPortal RuntimeとPortal Geometryを配置する。利用側は `index.ts` を唯一の入口とし、lib内部だけが各モジュールを直接importする。Geometryとresponsive Projectionの純粋な選択処理は、同じlib内のRuntimeから分離し、DOM、Three.js、ブラウザAPI、Scene固有値には依存しない。

`src/` 直下の `main.ts`、`StudyApp.ts`、`StudyRenderer.ts`、`studyConfig.ts`、`studyScene.ts` は、この習作固有の利用例でありlibには含めない。この平置きによって、習作が公開入口からlibを利用する依存方向を構造で示す。

Runtimeには2つの利用形態がある。Standaloneの `StudyApp` と `StudyRenderer` はRenderer、viewport resize、RAF、Canvas全体の透明clearを所有する。Embeddedの `PortalRuntime` は既存の `WebGLRenderer` を借り、ホスト側のRAFから1フレーム分の `render(viewport)` を呼び出して使う。EmbeddedではRendererの生成、寸法変更、全体clear、RAF、Rendererの破棄を行わない。

- full Portal rectはCameraと投影の計算に使う。
- Portalとviewportの交差矩形はscissorだけに使う。
- WebGL viewportは常にCanvas全体とし、Portalごとに変更しない。
- 部分表示時もCameraと構図を切り替えず、描画範囲だけを狭める。
- 複数Portalはそれぞれ独立したCameraを持ち、DOM要素、Scene、Scene Configurationを直接受け取る。
- responsive ProjectionはRuntime全体で1つを共有し、Sceneごとには変更しない。
- SceneをPortal間で共有するか個別に生成するかは、Sceneを渡すホスト側が決める。
- Camera Xは `0m` に固定し、左右に寄ったPortalもCanvas全体への投影をscissorで切り取る。
- Canvasは透明とし、Portal以外の領域では背面のDOMを表示する。
- Portal同士は重ならないようにPage / UIで配置し、描画順による重なり規則は設けない。

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

TypeScriptコードから生成するThree.jsの3Dコンテンツ。長さはm、座標方向は共通定義に従い、オブジェクトを実際の3D位置へ配置する。Scene rootはpositionとrotationを0、scaleを1に維持し、Geometryへ指定した1 unitをWorld上の1mとして扱う。個々のオブジェクトの位置と回転はScene生成コードで明示する。

### Scene Configuration

Sceneを垂直方向にどの範囲で観測するかを定義し、SceneとともにPortalへ直接渡す。

```text
SceneConfiguration
├── cameraTopY
└── cameraBottomY
```

`cameraTopY` と `cameraBottomY` はスクロールによって観測するScene内の垂直範囲を表す。縦長のSceneではCamera Yの移動範囲を広げる。

PortalのCSS高とCamera Yの移動範囲は、それぞれPage / UIとScene Configurationが所有するデザイン入力である。両者の比率をPortal間で揃えるかどうかはデザイン判断とし、Portal Geometryは比率を統一または補正しない。

### Runtime共通基準投影高

`referenceProjectionHeightMeters` はProjection Profileの `referenceFovY` と組み合わせて基準Camera距離を導出する、投影キャリブレーション上の高さである。1つのPortalRuntimeが管理するPortal群で共有し、Sceneやviewport条件によって変更しない。各フレームで実際に描画される垂直範囲そのものではない。

### Projection Profile

PCやスマートフォンなど、観測者の閲覧条件に応じた基準FOVを定義する。

```text
ProjectionProfile
└── referenceFovY
```

### Responsive Projection

viewport条件に応じてRuntime全体へ適用するProjection Profileを選択する。

```text
ResponsiveProjectionConfiguration
├── rules[]
│   ├── query
│   └── referenceFovY
└── otherwise
    └── referenceFovY
```

`query` は `window.matchMedia()` へ渡すMedia Query文字列とする。`rules` を上から評価して最初に一致したProjectionを選び、どの条件にも一致しない場合は必須の `otherwise` を選ぶ。選択結果は全Portalへ同時に適用する。

### Portal Definition

Runtimeへ渡す1つのPortalを、参照IDではなく実体で定義する。

```text
PortalDefinition
├── element
├── scene
├── clearColor
├── cameraTopY
├── cameraBottomY
├── cameraNear（任意）
└── cameraFar（任意）
```

RendererとSceneはホストから借り、Runtimeは生成も破棄もしない。Runtimeが生成するPortal用CameraとMedia Query listenerだけをRuntime自身が管理する。

`cameraNear` と `cameraFar` はSceneに必要なクリップ範囲をPortalごとに指定する。省略時はそれぞれ `0.1` と `1000` を使い、responsive条件では切り替えない。

`renderCameraFovY`、Camera Y移動高、Camera距離、スクロール進行値は設定として保持せず、実行時に導出する。

## 責務

### Portal Geometry

- DOM矩形とviewportの交差判定
- スクロール進行値とCamera Yの計算
- Reference FOVからRender Camera FOVへの変換
- 入力値の検証

DOM型、Three.js型、描画ループには依存しない純粋な計算とする。

### Runtime

- PortalごとのPerspectiveCamera、Scene、DOM要素、導出したCamera状態を管理する。
- Standalone wrapperはWebGLRenderer、固定Canvas、描画ループ、resize、DPR上限を管理する。
- Canvas全体のviewportを維持し、Portalごとのscissor内をclearして描画する。
- StandaloneではCanvasのPortal外領域を透明にし、EmbeddedではPortal外の既存描画を変更しない。
- `PortalRuntime` が1組の `window.matchMedia()` と変更listenerを所有し、純粋な選択関数で全PortalのProfileを切り替える。
- RuntimeはMedia Query listenerを解除するが、借りたSceneとRendererは破棄しない。
- Standalone wrapperは自身が生成した習作SceneとRendererを破棄する。

Embeddedの `PortalRuntime` はDOM要素とSceneを直接受け取り、習作固有Sceneへ依存しない。借りたRendererのviewport、scissor、scissor test、clear colorとalpha、`autoClear`、render targetを描画前に保存し、成功時と例外時の両方で復元する。フレームバッファのPortal領域はclear・描画されるため、ホストは既存Sceneとの描画順を決め、通常はPortal描画をそのフレーム内の意図した位置で呼び出す。

```ts
import { PortalRuntime } from './lib/parallax-portal/index.ts'

const portalRuntime = new PortalRuntime({
  renderer,
  projection,
  referenceProjectionHeightMeters,
  portals: [
    {
      element,
      scene,
      clearColor,
      cameraTopY,
      cameraBottomY,
      cameraNear,
      cameraFar,
    },
  ],
})

function renderFrame(): void {
  portalRuntime.render({ width: window.innerWidth, height: window.innerHeight })
}
```

EmbeddedもCanvasがviewport全体を覆い、Canvas左上とviewport左上が一致することを前提とする。任意位置・任意サイズCanvasの座標変換は対象外とする。

Cameraは `(0, cameraY, referenceCameraDistance)` に置き、回転なしで負のZ方向へ向ける。Camera Yに応じて向きが変わる `lookAt()` は使用しない。

### Page / UI

- DOM窓、通常コンテンツ、前面レイヤーを配置する。
- 習作の `StudyApp` は `data-portal-id` からDOM要素を取得し、Runtimeへ直接渡す。
- Portal寸法をCSSで定義し、Runtimeは `getBoundingClientRect()` のCSS px実測値を使う。
- viewport条件と共通Projection Profileの対応を設定する。

## 1フレームのデータフロー

Runtime生成時とMedia Queryの変更時に、共通の `rules` を上から評価して有効なProjectionを全Portalへ適用する。Standaloneでは常時requestAnimationFrameを実行し、各フレームでPortalごとに次の順で処理する。

1. viewport寸法とfull Portal rectを取得する。
2. Portalとviewportの交差矩形を求める。
3. 交差領域がなければ描画対象から外す。
4. Projection Profile、Runtime共通基準投影高、Scene Configuration、full Portal rectからCamera Y、Camera距離、Render Camera FOV Yを導出する。
5. Canvas全体のWebGL viewportを維持したまま、交差矩形をscissorへ設定する。
6. scissor内のcolor bufferとdepth bufferをclearしてSceneを描画する。

Scene固有の条件分岐をPortal Geometryへ埋め込まない。
