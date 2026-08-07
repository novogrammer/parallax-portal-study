# 検証条件と未決事項

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
| 同じSceneを異なるProfileで使用 | 各Portalが独立したCamera結果を持つ |
| 異なるSceneとProfileを使用 | 一方の設定変更が他方へ影響しない |
| vw指定 | 端末区分にかかわらずCSS pxへ解決して計算できる |
| CSS px指定 | 端末区分にかかわらず同じ計算を使える |
| resize | 実測DOM矩形とCanvas寸法から連続的に再計算される |
| ブラウザズーム | CSS pxへ正規化した寸法比で再計算される |
| progressが範囲外 | Motion Policyどおりclampまたは外挿される |
| reduced motion | Motion Policyで定めた縮退後もPortal表示が成立する |

## 合格条件

- vertical FOVの上側が3D空間の正のY方向、下側が負のY方向へ投影される。
- Reference FOVと基準投影高から基準Camera距離を一意に導出できる。
- Camera Yの上下端からCamera移動高を一意に導出できる。
- Reference FOV、Canvas / DOM高比、Camera移動高 / 基準投影高比からRender Camera FOVを一意に導出できる。
- Camera移動高と基準投影高の同値を必須条件にしない。
- CSS pxとvwを端末種別から独立して扱える。
- 部分表示時に交差矩形をFOVまたはCamera Yの計算へ使わない。
- Scene内の実際のZ距離に応じて透視投影上の視差が変化する。
- SceneまたはProfile固有値による条件分岐をPortal Geometryへ埋め込まない。
- Portalの描画順が各PortalのCamera計算へ影響しない。

## 未決事項

- 水平方向のCamera Registrationと投影スケールをどの値から導出するか。
- `cameraTopY == cameraBottomY` の静止Cameraを現在のFOV変換とは別にどう扱うか。
- DOM窓の比率と3D基準幅が一致しない場合、height基準、contain、coverのどれを採用するか。
- Portalが横方向にもスクロールするケースを初期対象へ含めるか。
- border radiusや任意形状maskのclip責務をDOMとRendererのどちらが持つか。
- 常時RAF、dirty rendering、IntersectionObserver併用のどれを初期実装とするか。

未決事項は実装で暗黙に確定させず、選択理由とともに設計へ反映する。
