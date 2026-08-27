# Parallax Portal Study

パララックスポータルの習作集

DOMとThree.jsを組み合わせたStudyを、独立したページとして検証するプロジェクトです。

[parallax-portal](https://github.com/novogrammer/parallax-portal) をGitHub dependencyとして利用しています。

[Study一覧を見る](https://novogrammer.github.io/parallax-portal-study/)

- [Vertical Parallax](https://novogrammer.github.io/parallax-portal-study/studies/vertical-parallax/): 1枚の固定Canvasへ複数のThree.js Sceneをscissor描画する基準実装

## ドキュメント

[Study構成](docs/overview.md) / [検証条件](docs/validation.md) / [実装計画](docs/implementation-plan.md) / [ライブラリ仕様](https://github.com/novogrammer/parallax-portal/tree/main/docs)

## ローカル起動

```sh
npm install
npm run dev
```

`http://localhost:5173/studies/vertical-parallax/?forceWebGL=1` では、Vertical Parallax StudyのWebGL 2 backendを強制して確認できます。
