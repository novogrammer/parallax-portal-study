# Parallax Portal 一般化メモ

更新日: 2026-08-07

## 1. 目的

DOM上を移動する窓の内側に3D空間を表示し、スクロールにともなって奥行き由来の視差が生じる仕組みを、特定のシーンやThree.jsの実装に依存しない形で整理する。

現段階ではソースコードを実装しない。用語、座標系、数式、責務、検証方法を確定し、後からVite + TypeScriptのWebプロジェクトへ移行できる状態を作る。

## 2. 参照実装から抽出した構造

`reference/prototype` は別リポジトリへのsymlinkであり、読み取り専用として扱う。参照元の固有プロジェクト名は、このリポジトリの設計や命名へ持ち込まない。

参照実装では、次の構造が採用されている。

- viewportに固定した1枚のWebGL Canvasを使う。
- 複数のDOM窓が、それぞれ独立した3D SceneとCameraを持つ。
- DOM窓の矩形とviewportの交差領域だけをscissor描画する。
- 3D空間では窓面を `z = 0` とし、表示物を原則 `z < 0` に置く。
- DOM窓の画面内移動に合わせてCameraを移動する。
- 近景・中景・遠景へ別々の移動係数を与えず、透視投影と実際のZ距離から視差を発生させる。
- 基準vertical FOVは42度、基準空間高は3mとしている。
- 現行の窓は画面幅いっぱいで、PCは16:9、SPは9:16を基本としている。

このうち、FOV、空間高、窓比率、移動方向、シーン数は一般化後の固定条件にはしない。

## 3. 中心となる考え方

viewportに固定したCanvas全体へSceneを投影し、DOM窓とviewportの交差矩形でSceneをscissorする。DOM窓の全体矩形はCamera Yと投影値の計算に使い、交差矩形は描画の切り抜きだけに使う。

設計上の基準FOV、スクロールに連動するCamera Y、描画Cameraへ設定するFOVを分離する。

```text
Reference Projection
  referenceFovY + referenceProjectionHeightMeters
        |
        v
  referenceCameraDistance

Camera Y Motion
  DOM rect + cameraTopY + cameraBottomY
        |
        v
  cameraY(progress)

Render Projection
  Reference Projection + DOM height + Camera Y travel + Canvas height
        |
        v
  renderCameraFovY
```

`referenceProjectionHeightMeters` とCamera Yの移動高は独立した設定値とする。両者が同じ値になることは許容するが、一致を共通アルゴリズムの前提にはしない。

```text
cameraTravelHeightMeters = abs(cameraTopY - cameraBottomY)
```

`cameraTravelHeightMeters == referenceProjectionHeightMeters` の場合は、結果的に参照実装と同じ高さ関係になる。

## 4. 用語

### Portal

DOM窓、対応するScene、Camera、選択したProjection Profileをまとめた論理単位。ページ上に複数配置できる。

### Aperture

3D世界を覗く開口部。DOM窓はscissor範囲を与えるが、その高さとReference Projectionの基準投影高が常に一致するとは限らない。

### Reference Plane

Reference Projectionの基準投影高を評価する3D空間上の平面。初期方針では `z = 0` とする。

### Registration Anchor

Reference Plane上の構図基準点。現時点のCamera Yは `cameraTopY` と `cameraBottomY` から求めるため、AnchorをCamera Yの直接入力にはしない。水平方向など将来のRegistrationでの扱いは未決事項とする。

### Scene Contract

3D SceneまたはGLBがPortalへ組み込まれるために満たす座標、範囲、構図、安全領域などの契約。

### Motion Policy

スクロール進行値からCamera Yを求める規則と、必要に応じて追加するeasing、揺れ、回転などの演出規則。

### Projection Profile

Sceneの見せ方を定義する投影契約。Sceneは推奨Profileを持てるが、SceneとProfileを一対一には固定しない。同じSceneを異なるPortalや構図で再利用できる。

### Reference FOV Y

`referenceFovY`。Projection Profileで指定する構図設計上の基準vertical FOV。描画Cameraへ直接設定する値ではない。

### Render Camera FOV Y

`renderCameraFovY`。fixed CanvasとDOM窓の寸法比、およびCamera Y移動高と基準投影高の比から導出し、描画Cameraへ実際に設定するvertical FOV。

### Camera Y Range

`cameraTopY` と `cameraBottomY` の組。DOM窓の上端または下端がviewport中央へ達した時点のCamera Yをmで定義する。座標の大小ではなく、対応するスクロールイベントによってtop / bottomを命名する。

## 5. 座標系

### DOM / viewport座標

- 原点はviewport左上
- Xは右向きが正
- Yは下向きが正
- 単位はCSS px

### 3D座標

- Xは右向きが正
- Yは上向きが正
- Cameraは回転なしで負のZ方向を見ることを初期基準とする
- Cameraのupは正のY方向とする
- Reference Planeは `z = 0`
- Sceneの表示物は原則として `z < 0`
- 長さの単位はmとし、`1 world unit = 1 m` とする

初期基準では、vertical FOVの上側がReference Planeの正のY方向、下側が負のY方向に対応する。このFOVの上下方向はスクロール中も反転させない。DOMのY軸は下向きが正であるため、Camera Yの移動方向は `cameraTopY` と `cameraBottomY` の符号を保持して計算する。

## 6. 垂直方向の投影とCamera Yの基本式

### 6.1 入力

以下の入力はPortalごとに評価する。Projection ProfileはSceneの推奨値を利用しても、Portalが別のProfileを選択してもよい。

```text
canvas / viewport size: V = (Vw, Vh)
portal rect: R = (x, y, w, h)

referenceFovY: phiR
referenceProjectionHeightMeters: Hp
cameraTopY: Ty
cameraBottomY: By
```

会話中の仮記号との対応は、`p.height = Hp`、`t.y = Ty`、`b.y = By` とする。

- `Vw`, `Vh`, `x`, `y`, `w`, `h` の単位はCSS px
- `Hp`, `Ty`, `By` の単位はm
- `phiR` は0度より大きく180度より小さい
- `Vh`, `w`, `h`, `Hp` は0より大きい
- `abs(Ty - By)` は現時点の変換式では0より大きい

数式中の三角関数にはradを使う。設定値をdegreeで保持する場合は、計算境界でradへ変換する。

### 6.2 Reference Projection

`referenceFovY` は1m当たりの換算値ではない。構図設計上の基準vertical FOV `phiR` と、そのFOVでReference Plane上に収める基準投影高 `Hp` [m] を個別に指定する。

```text
referenceFovY: phiR
referenceProjectionHeightMeters: Hp
```

基準Camera距離は次のとおり。

```text
referenceCameraDistance = Hp / (2 * tan(phiR / 2))
```

同じ `Hp` でも `phiR` が異なればCamera距離と奥行きの見え方が変わる。`referenceFovY` は設計入力であり、fixed Canvasの描画Cameraへ直接設定する値ではない。

### 6.3 Camera Y Rangeとスクロール進行値

`cameraTopY` と `cameraBottomY` は、Camera Yの上下端をmで個別に指定する。

- DOM窓の上端がviewport中央に来たとき `cameraTopY`
- DOM窓の下端がviewport中央に来たとき `cameraBottomY`

スクロール進行値は次のとおり。

```text
centerProgress = (Vh / 2 - y) / h
```

Camera Yは次のように求める。

```text
cameraY = lerp(cameraTopY, cameraBottomY, centerProgress)
```

Camera Yの移動高は導出値とし、重複して設定しない。

```text
cameraTravelHeightMeters = abs(cameraTopY - cameraBottomY)
```

`cameraTopY` と `cameraBottomY` の符号と順序はCameraの移動方向に使い、FOV変換では高さだけが必要なため絶対値を使う。clampとeasingの有無はMotion Policyで決める。

### 6.4 基準投影高とCamera移動高の独立性

`referenceProjectionHeightMeters` と `cameraTravelHeightMeters` は独立した値である。一致させるモードと一致させないモードには分けず、常に個別の数値として扱う。

```text
referenceProjectionHeightMeters = Hp
cameraTravelHeightMeters = abs(Ty - By)
```

次の条件を満たす場合だけ、両者は結果的に一致する。

```text
abs(Ty - By) == Hp
```

これは参照実装相当の特殊ケースであり、一般化後の不変条件にはしない。

### 6.5 DOM記述単位

DOM記述単位は端末区分へ固定せず、Projection ProfileごとにCSS pxまたはvwを選択する。PC向けレイアウトでvwを使うことも、SP向けレイアウトでCSS pxを使うことも許容する。

```text
referenceDomHeight
├── value
└── unit: "css-px" | "vw"
```

実行時には、記述単位にかかわらず `getBoundingClientRect()` 相当の結果をCSS pxとしてPortal Geometryへ渡す。vwを描画処理へ直接渡さない。ここでいうpxはdevice pixelではなくCSS pxであり、DPRはCanvasの描画解像度だけに影響する。

### 6.6 Reference FOV YからRender Camera FOV Yへの変換

DOM窓の高さ `h` に対するCamera Yの移動高から、実行時の垂直スケールを求める。

```text
cameraMetersPerCssPixel = cameraTravelHeightMeters / h
```

fixed Canvas全体に対応する仮想空間高は次のとおり。

```text
renderProjectionHeightMeters =
  Vh * cameraTravelHeightMeters / h
```

`referenceCameraDistance` を維持したまま、この高さをCanvas全体へ収める `renderCameraFovY` は次のとおり。

```text
renderCameraFovY =
  2 * atan(
    tan(referenceFovY / 2)
    * Vh / h
    * cameraTravelHeightMeters / referenceProjectionHeightMeters
  )
```

`renderCameraFovY` は導出値であり、fixed Canvasの描画Cameraへ実際に設定する。DOM窓の現在Y位置はCamera Yの計算に使い、このFOV変換には含めない。

`cameraTravelHeightMeters == referenceProjectionHeightMeters` の場合は次の式へ簡略化され、参照実装相当になる。

```text
renderCameraFovY =
  2 * atan(tan(referenceFovY / 2) * Vh / h)
```

### 6.7 複数SceneとProjection Profile

SceneとProjection Profileは一対一に固定しない。Sceneは推奨Profileを提示でき、各Portalが利用するProfileを選択する。

```text
Projection Profiles[]
└── profile
    ├── profileId
    ├── referenceFovY
    ├── referenceProjectionHeightMeters
    ├── cameraTopY
    ├── cameraBottomY
    └── referenceDomHeight
        ├── value
        └── unit: "css-px" | "vw"

Portal Configuration[]
└── portal
    ├── sceneId
    └── projectionProfileId
```

同じSceneを異なるProfileで再利用できる。各SceneまたはProfileの差は設定データとして表し、Portal Geometry内でScene ID、Scene数、端末種別に応じた条件分岐を行わない。

### 6.8 Scissorに使う矩形

FOVとCamera Yの計算には、clip前のDOM窓全体の `y` と `h` を使う。DOM窓とviewportの交差矩形はscissorだけに使う。

```text
fullPortalRect
├── y, h          -> centerProgress, cameraY, renderCameraFovY
└── intersection  -> scissor only
```

部分表示時に交差矩形の高さをFOV計算へ使うと、viewport境界を通過するたびにFOVが変化するため禁止する。

## 7. 1フレームの処理

各Portalについて、概念上は次の順番で処理する。

1. viewportの寸法を取得する。
2. DOM窓の矩形を取得する。
3. DOM窓とviewportの交差矩形を求める。
4. 交差幅または交差高が0以下なら、そのPortalを描画対象から外す。
5. full Portal rectからスクロール進行値とCamera Yを求める。
6. Projection Profileから基準Camera距離と `renderCameraFovY` を求める。
7. Motion Policyによる追加演出があれば適用する。
8. 交差矩形をscissor領域としてSceneを描画する。
9. 次のPortalを処理する。

複数のPortalが同時にviewportへ入る場合は、それぞれ独立して計算、描画する。

## 8. スクロール進行値

Camera Yを `cameraTopY` から `cameraBottomY` へ補間するため、DOM窓の全体矩形から進行値を求める。

```text
centerProgress = (Vh / 2 - y) / h
```

- DOM窓の上端がviewport中央に来たとき `0`
- DOM窓の下端がviewport中央に来たとき `1`
- 範囲外では0未満または1超になる

clamp、easing、範囲外の外挿を許可するかはMotion Policyとして決める。scissor用の交差矩形から進行値を求めない。

## 9. 責務の分離

### 9.1 Portal Geometry

描画ライブラリに依存しない純粋な計算を担当する。

- 矩形の交差判定
- 座標変換
- Camera Y補間
- Reference FOV YからRender Camera FOV Yへの変換
- 進行値計算
- 入力値の検証

### 9.2 Motion Policy

Camera Yの進行規則と、基本計算へ加える演出を担当する。

- clampの有無
- easing
- `cameraTopY` と `cameraBottomY` の補間
- X / Y / Z方向の追加移動
- Camera回転
- pointerやdevice orientationへの反応
- `prefers-reduced-motion` 時の縮退

### 9.3 Scene Contract

Portalへ渡す3Dコンテンツの条件を定義する。

- 座標系とm単位
- 推奨Projection Profile
- `referenceFovY` と `referenceProjectionHeightMeters`
- `cameraTopY` と `cameraBottomY` の許容範囲
- Reference PlaneとRegistration Anchor
- Scene bounds
- near / farの有効範囲
- レイアウトProfileごとのsafe area
- 近景、中景、遠景の推奨深度
- 背景色、fog、ライトの所有者
- 読み込み中と失敗時の表示
- `z = 0` よりCamera側へ出してよい要素の有無

### 9.4 Runtime Policy

ブラウザと描画エンジンに依存する処理を担当する。

- Canvasの生成とサイズ変更
- DPRの上限
- scissor / viewport設定
- `renderCameraFovY` の描画Cameraへの適用
- requestAnimationFrameの開始と停止
- 表示Portalの選別
- Sceneの読み込みと破棄
- WebGL unavailable時のfallback

### 9.5 Page / UI

通常のWebコンテンツを担当する。

- DOM窓の配置
- 見出し、本文、リンク
- アクセシビリティ
- レスポンシブレイアウト
- 各PortalでCSS pxまたはvwを選ぶレイアウト記述方針
- viewport条件に応じて使用するProjection Profileを選ぶ規則
- Canvasより前面に置く窓枠

## 10. 一般化後も維持したい不変条件

- DOMコンテンツと3D装飾の責務を分ける。
- `referenceFovY` と `renderCameraFovY` を別の値として扱う。
- `referenceProjectionHeightMeters` とCamera Y移動高を独立して設定する。
- スクロール中もvertical FOVの上側と下側のY方向を反転させない。
- Scene内の長さをmで統一する。
- Camera YのmとvwまたはCSS pxの対応を、Camera Y移動高とDOM窓高から導出する。
- viewport外のPortalは描画しない。
- 複数Portalの同時表示を扱える。
- 各Portalが異なるProjection Profileを選択できる。
- DOM窓とviewportの交差矩形はscissorだけに使う。
- Scene内の実際のZ距離から透視投影上の視差を作る。
- Scene固有値を共通アルゴリズムへ埋め込まない。
- DOM窓が部分表示になってもCameraの構図を不連続に変えない。

## 11. 設定またはポリシーへ移す値

- Projection Profileごとの `referenceFovY`
- Projection Profileごとの `referenceProjectionHeightMeters`
- Projection Profileごとの `cameraTopY` と `cameraBottomY`
- 基準DOM高と記述単位（CSS pxまたはvw）
- Cameraのnear / far
- clampの有無
- Motion easing
- Cameraの追加移動と回転
- Portalの縦横比
- Scene数
- 背景、fog、ライト
- DPR上限
- 描画ループの停止条件
- レイアウトProfile間で同一Sceneを使うかどうか

## 12. 実装前の検証ケース

| ケース | 確認内容 |
| --- | --- |
| 移動高と基準投影高が同じ | 参照実装相当の簡略式になる |
| 移動高と基準投影高が異なる | 高さの比を含む `renderCameraFovY` が得られる |
| DOM上端がviewport中央 | `centerProgress = 0` かつ `cameraY = cameraTopY` になる |
| DOM下端がviewport中央 | `centerProgress = 1` かつ `cameraY = cameraBottomY` になる |
| viewportより大きい窓 | full Portal rectを使い、部分表示でも構図が跳ばない |
| 上下から部分的に見える窓 | scissor領域だけが変化し、FOVとCamera Yは連続する |
| 2つの窓が同時表示 | 各Sceneが対応する窓だけに描画される |
| 異なる投影設定の複数Scene | ProfileごとのFOV、高さ、Camera Y範囲が相互に影響しない |
| resize中 | 位置とFOVが不連続に跳ばない |
| ブラウザズーム | CSS pxへ正規化した寸法比で再計算される |
| vw指定のProfile | 端末区分にかかわらず、vw指定をCSS pxへ解決して計算できる |
| CSS px指定のProfile | 端末区分にかかわらず、CSS px指定で計算できる |
| PC幅でvw指定 | PC相当のviewportでも単位をvwとして解決できる |
| progressが範囲外 | ポリシーどおりclampまたは外挿される |
| reduced motion | Motion Policyで定めた縮退後もPortal表示が成立する |

## 13. 合格条件の初期案

- vertical FOVの上端がReference Planeの正のY側、下端が負のY側へ投影される。
- `referenceFovY` と `referenceProjectionHeightMeters` から基準Camera距離を一意に導出できる。
- `cameraTopY` と `cameraBottomY` からCamera Y移動高を一意に導出できる。
- `renderCameraFovY` をReference FOV、Canvas / DOM高比、Camera移動高 / 基準投影高比から導出できる。
- `cameraTravelHeightMeters == referenceProjectionHeightMeters` を必須条件にしない。
- CSS px / vwとも、実行時にはCSS pxへ正規化して同じ式で計算できる。
- 単位からPC / SPなどの端末種別を推測しない。
- 同じ深度にある点はCamera移動に対して同じ割合で移動して見える。
- 深い位置にある点ほど、Reference Planeに近い点より見かけの移動量が小さい。
- DOM窓がviewport境界を横切っても投影結果が不連続に変化しない。
- Portalの描画順が各PortalのCamera計算へ影響しない。
- あるProjection Profileを変更しても、他PortalのCamera計算結果が変化しない。
- SceneまたはProfile固有のFOV、far、fogなどを共通アルゴリズムの条件分岐で判定しない。
- 追加演出を無効にした状態でも、Camera YがDOMスクロールへ追従する。

## 14. 未決事項

- DOM窓の比率と固定の3D基準幅が一致しない場合、height基準、contain、coverのどれを採用するか。
- 水平方向のCamera Registrationと投影スケールをどの値から導出するか。
- `cameraTopY == cameraBottomY` の静止Cameraを現在のFOV変換とは別にどう扱うか。
- Portalが横方向にもスクロールするケースを初期対象へ含めるか。
- DOM窓にborder radiusや任意形状maskがある場合のclip責務。
- 常時RAF、dirty rendering、IntersectionObserver併用のどれを初期実装とするか。

未決事項は実装によって暗黙に確定させず、設計段階で選択理由を記録する。

## 15. 将来のVite実装へ向けた境界

実装開始時は、少なくとも次の依存方向を守る。

```text
Page / DOM Adapter --------------------------+
                                            |
                                            v
Projection Profile -> Portal Configuration -> Portal Geometry
                                                |
                                                v
                                       Renderer Adapter -> Three.js Scene
```

- Portal GeometryはDOM型やThree.js型を受け取らない。
- DOM Adapterが `getBoundingClientRect()` の結果を単純な数値構造へ変換する。
- Renderer Adapterが計算結果をThree.jsのCameraやRendererへ適用する。
- Portal ConfigurationがSceneとProjection Profileの組み合わせを選択する。
- `renderCameraFovY` はPortal Geometryで導出し、Renderer Adapterが描画Cameraへ適用する。
- UI文言やコンテンツ情報をRenderer定義へ混在させない。

実装を開始するまでは、`package.json`、Vite設定、TypeScriptソースを作らない。

## 16. 次に行う設計作業

1. 本書の用語と基本式をレビューする。
2. 未決事項のうち、水平方向の投影ポリシーと基準幅の扱いを決める。
3. 数値例を用いてCamera YとFOV変換式を検算する。
4. Scene Contractを独立した文書へ具体化する。
5. テストケースごとの入力値と期待値を表にする。
6. 設計が固まった後、ユーザーの明示を受けてVite + TypeScriptの初期構成を作る。

## 17. セッション引き継ぎ

- リポジトリ名は `parallax-portal-study`。
- `reference/` の内容は `.gitignore` 対象で、`.gitkeep` のみ管理対象にできる。
- 参照先は読み取り専用であり、修正しない。
- 現在はアルゴリズム設計段階であり、Webアプリケーションは未実装。
- Scene内の長さはmで統一する。
- 複数Sceneと複数Projection Profileを扱い、SceneとProfileを一対一には固定しない。
- `referenceFovY` と `referenceProjectionHeightMeters` はProjection Profileの設計入力とする。
- `cameraTopY` と `cameraBottomY` は個別に指定し、その絶対差をCamera Y移動高とする。
- 基準投影高とCamera Y移動高は独立しており、同値なら結果的に参照実装相当になる。
- `renderCameraFovY` はReference FOV、Canvas / DOM高比、Camera移動高 / 基準投影高比から導出する。
- ProfileはDOM寸法の単位としてCSS pxまたはvwを選べる。単位とPC / SPは結び付けない。
- fixed CanvasへSceneを描画し、DOM窓とviewportの交差矩形でscissorする。
- 次のセッションでは、まず本書とルートの `AGENTS.md` を読む。
- 次の優先作業は、基本式の数値検算と未決事項の整理。
