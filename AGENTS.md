# Parallax Portal Study

## 正本

- 習作の進捗と段階ごとの対象範囲は `docs/implementation-plan.md` を参照する。
- 習作の構成と責務は `docs/overview.md`、実装値と表示上の合格条件は `docs/validation.md` を参照する。
- `parallax-portal` の公開API、Runtime、Portal Geometry、投影数式、一般的な合格条件は、[package側の文書](https://github.com/novogrammer/parallax-portal/tree/main/docs)を正本とする。
- ドキュメントには現時点で有効な設計を記述し、検討過程や会話の時系列を残さない。
- 同じ説明を複数の文書へ重複させず、古い説明は追記で打ち消さずに整理または置き換える。
- packageの一般仕様をこのリポジトリへ複製せず、Studyで選んだ値と統合方法だけを記述する。
- 文書と実装が食い違った場合は、どちらを正とするかユーザーへ確認してから更新する。

## reference

- `reference/` 配下は別リポジトリへの参照用symlinkであり、読み取り専用として扱う。
- 参照先のファイルを編集、移動、削除しない。
- 参照元の固有プロジェクト名を、このリポジトリの文書、コード、設定、ファイル名へ持ち込まない。
- 既存実装は挙動を理解する材料とし、その構造を新設計の制約にしない。

## 変更と検証

- 変更は依頼範囲に限定し、小さく確認可能な単位で行う。
- 依存パッケージは必要最小限にし、追加理由を説明できる状態にする。
- `node_modules/`、`dist/`、一時生成物は管理対象に含めない。
- コード変更後は `npm test` と `npm run build` を実行する。
- 見た目に影響する変更では、必要に応じてChromeで表示とConsole errorを確認する。
