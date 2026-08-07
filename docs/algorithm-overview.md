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

現行のCamera移動は、単なるスクロールアニメーションではない。固定Canvas上で移動するDOM窓と、3D空間の基準面を一致させるための幾何学的な位置合わせである。

この処理を本書では **Portal Registration** と呼ぶ。

Portal Registrationと演出的なCamera移動を分離する。

```text
finalCamera = registrationCamera + artisticOffset(progress)
```

- `registrationCamera`: DOM窓と3D基準面を一致させるための必須計算
- `artisticOffset`: easing、揺れ、追加移動などの任意演出

これにより、演出を無効にしても窓と3D空間の位置関係は壊れない。

## 4. 用語

### Portal

DOM窓、対応するScene、Camera、Scene固有の設定をまとめた論理単位。ページ上に複数配置でき、各Portalは独立したVirtual Projection Profileを持つ。

### Aperture

3D世界を覗く開口部。DOM窓の矩形と、3D空間上の基準面の両方を含む概念。

### Reference Plane

DOM窓と一致させる3D空間上の平面。初期方針では `z = 0` とする。

### Registration Anchor

Reference Plane上でDOM窓の基準位置に合わせる点。初期方針では窓の中央を使う。

### Scene Contract

3D SceneまたはGLBがPortalへ組み込まれるために満たす座標、範囲、構図、安全領域などの契約。

### Motion Policy

Registration後のCameraへ追加する演出的な移動規則。

### Virtual Projection Profile

Sceneごとの理想的な見え方を定義する投影契約。理想的なvertical FOV、Reference Plane上で画面に収める範囲、およびその範囲に対応するDOM寸法を含む。共通の固定換算表ではなく、Sceneごとの投影条件からmとCSS pxまたはvwの対応を導出するために使う。

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
- Reference Planeは `z = 0`
- Sceneの表示物は原則として `z < 0`
- 長さの単位はmとし、`1 world unit = 1 m` とする

DOMのY軸と3DのY軸は向きが反対なので、式の符号を変更する際は必ず投影結果で確認する。

## 6. Portal Registrationの基本式

### 6.1 入力

以下の入力は全Sceneで共有する単一設定ではなく、Portalごとに評価する。`Ah` と `phi` は対象PortalのVirtual Projection Profileから受け取る。

```text
viewport size: V = (Vw, Vh)
viewport center: Vc = (Vw / 2, Vh / 2)

portal rect: R = (x, y, w, h)
portal center: Rc = (x + w / 2, y + h / 2)

reference aperture height: Ah
registration anchor: A = (Ax, Ay, 0)
ideal reference vertical FOV: phi
```

- `Vw`, `Vh`, `x`, `y`, `w`, `h` の単位はCSS px
- `Ah`, `Ax`, `Ay` の単位はm
- `phi` は0度より大きく180度より小さい
- `w` と `h` は0より大きい

### 6.2 Sceneごとのフレーミング定義

FOVを1m当たりの換算値として定義しない。各Sceneについて、まず演出上理想となるvertical FOV `phi` を決め、次にそのFOVでReference Plane上に収める高さ `Ah` をmで定義する。

```text
Sceneごとの理想FOV: phi
Sceneごとの基準空間高: Ah [m]
```

`phi` と `Ah` はVirtual Projection Profileの入力であり、Camera距離とDOM単位との対応は導出値とする。同じ `Ah` でも `phi` が異なればCamera距離と奥行きの見え方が変わるため、`phi` と `Ah` はそれぞれ独立した演出上の意味を持つ。

Scene内の単位がmであることは全Scene共通の不変条件とするが、画面内に収める高さ `Ah` はSceneごとに異なってよい。「Sceneごとにメートルを定義する」とは、mそのものの尺度を変えることではなく、そのSceneの基準構図へ収める範囲をmで指定することを指す。

初期アルゴリズムは高さ基準とする。将来、幅基準、contain、coverを採用する場合は、どの軸の何mを画面に収めるかをProjection Policyとして明示する。

### 6.3 DOM記述単位との対応

ページのレイアウト記述単位は、SPではvw、PCではCSS pxを使う。一方、Portal Geometryへ渡すviewportとDOM窓の実測矩形は、どちらもCSS pxへ正規化する。

対象Sceneの基準DOM窓の高さを、SPでは `Dvw` [vw]、PCでは `Dpx` [CSS px] とすると、設計上の対応は次のとおり。

```text
SP: metersPerVw       = Ah / Dvw
PC: metersPerCssPixel = Ah / Dpx
```

これらはSceneへ直接与える独立した換算定数ではない。各Sceneの `Ah` と、そのSceneのレイアウトで基準となるDOM窓寸法から導出する。したがって、同じページにあるScene AとScene Bが異なる `Ah`、`phi`、`Dvw` または `Dpx` を持つことを許容する。SPでも実行時のRegistration計算にはレイアウト後の `getBoundingClientRect()` 相当値を使うため、ブラウザの描画処理へvwを直接渡さない。

ここでいうpxはdevice pixelではなくCSS pxである。DPRはCanvasの描画解像度だけに影響し、DOMとReference Planeの寸法対応には含めない。

### 6.4 複数Sceneの設定単位

ページはPortalの集合として構成し、投影設定をPortalごとに保持する。概念上の設定構造は次のとおり。

```text
Portal Configuration[]
└── portal
    ├── sceneId
    ├── registrationAnchor [m]
    └── projectionProfiles
        ├── PC
        │   ├── idealVerticalFov
        │   ├── referenceApertureHeightMeters
        │   └── referenceDomHeightCssPixels
        └── SP
            ├── idealVerticalFov
            ├── referenceApertureHeightMeters
            └── referenceDomHeightVw
```

PCとSPで同じ値を使う場合は共通値を継承してよいが、共通化を必須にはしない。各Sceneの差は設定データとして表し、Portal Geometry内でScene IDやScene数に応じた条件分岐を行わない。

### 6.5 窓面上の実行時スケール

DOM窓の1 CSS pxに対応するReference Plane上のmを求める。

```text
metersPerCssPixel = Ah / h
```

初期アルゴリズムではXとYに同じスケールを使う。この場合、DOM窓を通して見えるReference Planeの幅は次の値になる。

```text
visibleReferenceWidth = Ah * w / h
```

固定の基準幅を優先する場合は、contain、cover、非対称投影など別の投影ポリシーが必要になるため、未決事項として扱う。

### 6.6 基準Camera距離

Reference Planeの高さ `Ah` が基準FOV `phi` に収まるCamera距離は次のとおり。

```text
cameraZ = Ah / (2 * tan(phi / 2))
```

### 6.7 CameraのX / Y位置

Registration AnchorをDOM窓中央へ投影するCamera位置は次のとおり。

```text
scale = Ah / h

cameraX = Ax + (Rc.x - Vc.x) * scale
cameraY = Ay + (Rc.y - Vc.y) * scale
```

DOM窓がviewport中央にある場合、CameraのX / YはAnchorと一致する。DOM窓が下へ移動すると、Cameraは3D空間上で上向きに移動し、Reference Plane上のAnchorが窓中央へ投影され続ける。

### 6.8 viewport全体に対するFOV

固定Canvas全体をviewportとして投影し、その一部をDOM窓で切り抜く場合のvertical FOVは次のとおり。

```text
viewportFovY =
  2 * atan(tan(phi / 2) * Vh / h)
```

参照実装のFOV変換はこの式に相当する。

## 7. 1フレームの処理

各Portalについて、概念上は次の順番で処理する。

1. viewportの寸法を取得する。
2. DOM窓の矩形を取得する。
3. DOM窓とviewportの交差矩形を求める。
4. 交差幅または交差高が0以下なら、そのPortalを描画対象から外す。
5. Portal RegistrationからCamera位置と投影値を求める。
6. Motion Policyがあれば追加のCamera offsetを適用する。
7. 交差矩形をclip領域としてSceneを描画する。
8. 次のPortalを処理する。

複数のPortalが同時にviewportへ入る場合は、それぞれ独立して計算、描画する。

## 8. スクロール進行値

Registrationそのものにはスクロール進行値を必須としない。DOM窓の現在矩形からCameraを直接計算できるためである。

演出で進行値が必要な場合は、用途を明示した上で別途定義する。

参照実装と同等の進行値は次のとおり。

```text
centerProgress = (Vh / 2 - y) / h
```

- DOM窓の上端がviewport中央に来たとき `0`
- DOM窓の下端がviewport中央に来たとき `1`
- 範囲外では0未満または1超になる

clampの有無は幾何アルゴリズムではなくMotion Policyとして決める。

## 9. 責務の分離

### 9.1 Portal Geometry

描画ライブラリに依存しない純粋な計算を担当する。

- 矩形の交差判定
- 座標変換
- Camera Registration
- FOV計算
- 進行値計算
- 入力値の検証

### 9.2 Motion Policy

Registrationへ加える演出を担当する。

- clampの有無
- easing
- X / Y / Z方向の追加移動
- Camera回転
- pointerやdevice orientationへの反応
- `prefers-reduced-motion` 時の縮退

### 9.3 Scene Contract

Portalへ渡す3Dコンテンツの条件を定義する。

- 座標系とm単位
- SceneごとのVirtual Projection Profile
- 理想的なvertical FOVと基準空間高
- Reference PlaneとRegistration Anchor
- Scene bounds
- near / farの有効範囲
- PC / SPのsafe area
- 近景、中景、遠景の推奨深度
- 背景色、fog、ライトの所有者
- 読み込み中と失敗時の表示
- `z = 0` よりCamera側へ出してよい要素の有無

### 9.4 Runtime Policy

ブラウザと描画エンジンに依存する処理を担当する。

- Canvasの生成とサイズ変更
- DPRの上限
- scissor / viewport設定
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
- SPではvw、PCではCSS pxを使うレイアウト記述方針
- Canvasより前面に置く窓枠

## 10. 一般化後も維持したい不変条件

- DOMコンテンツと3D装飾の責務を分ける。
- DOM窓と3D Reference Planeの対応を数式で説明できる。
- Scene内の長さをmで統一する。
- mとvwまたはCSS pxの対応を、Sceneの投影条件とDOM窓寸法から導出する。
- viewport外のPortalは描画しない。
- 複数Portalの同時表示を扱える。
- 各Portalが異なる基準空間高、FOV、基準DOM寸法を持てる。
- Scene内の実際のZ距離から透視投影上の視差を作る。
- Scene固有値を共通アルゴリズムへ埋め込まない。
- DOM窓が部分表示になってもCameraの構図を不連続に変えない。

## 11. 設定またはポリシーへ移す値

- Sceneごとの理想的な基準FOV
- Sceneごとの基準窓面の高さと幅（m）
- Registration Anchor
- Cameraのnear / far
- clampの有無
- Motion easing
- Cameraの追加移動と回転
- Portalの縦横比
- Scene数
- 背景、fog、ライト
- DPR上限
- 描画ループの停止条件
- PC / SPで同一Sceneを使うかどうか
- 各SceneのPC用基準DOM高（CSS px）とSP用基準DOM高（vw）

## 12. 実装前の検証ケース

| ケース | 確認内容 |
| --- | --- |
| 横幅100%、中央配置 | 参照実装相当の結果になる |
| 幅50%、左寄せ | Camera Xを含めてAnchorが窓中央に合う |
| 幅50%、右寄せ | 左寄せと左右対称の結果になる |
| viewportより大きい窓 | 部分表示でも構図が跳ばない |
| 上下から部分的に見える窓 | clip領域だけが変化し、投影は連続する |
| 2つの窓が同時表示 | 各Sceneが対応する窓だけに描画される |
| 異なるサイズの複数窓 | 各窓が独立したFOVとRegistrationを持つ |
| 異なる投影設定の複数Scene | Sceneごとのm範囲、FOV、px／vw設定が相互に影響しない |
| 横長、正方形、縦長 | 縦横比が変わってもAnchorが一致する |
| resize中 | 位置とFOVが不連続に跳ばない |
| ブラウザズーム | CSS px基準の位置合わせが維持される |
| SPのvwレイアウト | vwで指定した窓とReference Plane上のmの対応が維持される |
| PCのpxレイアウト | CSS pxで指定した窓とReference Plane上のmの対応が維持される |
| progressが範囲外 | ポリシーどおりclampまたは外挿される |
| reduced motion | 位置合わせを維持したまま演出だけを止められる |

## 13. 合格条件の初期案

- Reference Plane上のAnchorとDOM窓中央の誤差が1 CSS px以内である。
- Sceneごとに定義した理想FOVと基準空間高からCamera距離を一意に導出できる。
- SP / PCとも、DOM記述単位を独立した固定換算率としてSceneへ埋め込まない。
- 同じ深度にある点はCamera移動に対して同じ割合で移動して見える。
- 深い位置にある点ほど、Reference Planeに近い点より見かけの移動量が小さい。
- DOM窓がviewport境界を横切っても投影結果が不連続に変化しない。
- Portalの描画順が各PortalのCamera計算へ影響しない。
- あるSceneのVirtual Projection Profileを変更しても、他SceneのCamera計算結果が変化しない。
- Scene固有のFOV、far、fogなどを共通アルゴリズムの条件分岐で判定しない。
- Registrationだけを有効にした最小状態で、スクロールに追従するポータルとして成立する。

## 14. 未決事項

- DOM窓の比率と固定の3D基準幅が一致しない場合、height基準、contain、coverのどれを採用するか。
- Camera移動方式と非対称投影方式のどちらを一般APIの中心にするか。
- Portalが横方向にもスクロールするケースを初期対象へ含めるか。
- DOM窓にborder radiusや任意形状maskがある場合のclip責務。
- 1 Canvas + scissorを必須とするか、Runtime Policyの一方式とするか。
- PC / SPの構図差をCamera設定で扱うか、Scene Contractのvariantで扱うか。
- 常時RAF、dirty rendering、IntersectionObserver併用のどれを初期実装とするか。

未決事項は実装によって暗黙に確定させず、設計段階で選択理由を記録する。

## 15. 将来のVite実装へ向けた境界

実装開始時は、少なくとも次の依存方向を守る。

```text
Page / DOM Adapter
        |
        v
Portal Geometry  <-  Portal Configuration
        |
        v
Renderer Adapter  ->  Three.js Scene
```

- Portal GeometryはDOM型やThree.js型を受け取らない。
- DOM Adapterが `getBoundingClientRect()` の結果を単純な数値構造へ変換する。
- Renderer Adapterが計算結果をThree.jsのCameraやRendererへ適用する。
- Scene固有設定はPortal Configurationから渡す。
- UI文言やコンテンツ情報をRenderer定義へ混在させない。

実装を開始するまでは、`package.json`、Vite設定、TypeScriptソースを作らない。

## 16. 次に行う設計作業

1. 本書の用語と基本式をレビューする。
2. 未決事項のうち、投影ポリシーと基準幅の扱いを決める。
3. 数値例を用いてRegistration式を検算する。
4. Scene Contractを独立した文書へ具体化する。
5. テストケースごとの入力値と期待値を表にする。
6. 設計が固まった後、ユーザーの明示を受けてVite + TypeScriptの初期構成を作る。

## 17. セッション引き継ぎ

- リポジトリ名は `parallax-portal-study`。
- `reference/` の内容は `.gitignore` 対象で、`.gitkeep` のみ管理対象にできる。
- 参照先は読み取り専用であり、修正しない。
- 現在はアルゴリズム設計段階であり、Webアプリケーションは未実装。
- Scene内の長さはmで統一する。
- 複数Sceneを配置し、それぞれが独立したVirtual Projection Profileを持てる構造とする。
- 各Sceneで理想FOVを先に決め、次にReference Plane上の基準空間高をmで定義する。
- 各SceneについてSPはvw、PCはCSS pxで基準DOM寸法を定義し、mとの対応はそのSceneのVirtual Projection Profileから導出する。
- 次のセッションでは、まず本書とルートの `AGENTS.md` を読む。
- 次の優先作業は、基本式の数値検算と未決事項の整理。
