戦略さめがめ v1.02

公開構成
- index.html
- css/style.css
- js/config.js
- js/boards.js
- js/app.js
- assets/image/
- assets/music/
- assets/se/

v1.02 主な更新
- 原色・光沢・四隅コーナーカットのブロックへ変更
- アイコンの切り取り（移動・拡大）を追加
- プレイヤー情報表示を縮小
- BGM/SEの%数値直接入力を追加（半角数字 0〜100）
- バトル中サウンド設定を追加
- 全消し可能な予備盤面プール方式へ変更（盤面IDは非表示）
- マルチを最大6人へ拡張
- 相手のリアルタイム小盤面を複数人表示用に縮小
- リザルトは「ステージN到達」表示に変更
- マルチのリザルトから同じ待機ルームへ戻る動線を追加
- 待機ルームにチャットを追加
- ルーム発見/開始案内の出っぱなしを修正（トースト自動消去）

調整値は js/config.js に集約しています。
音楽・SE・背景素材は後から assets 配下へ追加予定です。


v1.02 追加:
- トップ画面をコンパクト化
- 待機ルーム参加者を3列表示
- 実操作チュートリアル
- 消去/落下/左詰めアニメーション


[v1.02 board pool rebuild]
- Rebuilt 100 full-clearable boards.
- Removed obvious 2-cell tiling / striped solvable layouts.
- Each board has a verified clear route, but random legal move sequences can still fail.


[逆算SEED100版]
- 空盤面から逆算して生成した合格SEEDを100件収録。
- 中段差し込み・押し上げを使用。
- 単純な固定方針で全消しできる盤面は不採用。
- dev/board-seed-report.json は内部検証用でゲーム画面には表示されません。
