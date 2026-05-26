# バリ島不動産 LINE Bot

バリ島の不動産情報を提供するLINE Botアプリケーションです。

## 機能（2026-05 改修版）

リッチメニューは6項目構成。タップで詳細メッセージ or サブメニューが開きます。

| メニュー | 挙動 |
|---|---|
| インドネシア・バリ島紹介 | サブメニュー（4項目）を表示 |
| 不動産紹介 | サブメニュー（5項目）を表示 |
| 視察予約 | Googleフォーム導線 |
| 提携先 | パートナー銀行・企業の紹介 |
| 会社概要 | PT ARCADIA INDONESIA PROPERTY情報 |
| 社長紹介 | 代表者プロフィール（準備中プレースホルダー） |

### サブメニュー構造

**インドネシア・バリ島紹介**
- インドネシアについて（基本情報・人口・経済・権利2種）
- バリ島について（実利のある楽園・数字による裏付け）
- 伸び代について（人口ボーナス・5%成長・国家投資）
- 法律について（失敗しない3大ルール）

**不動産紹介**
- エリアについて（Airtable連携で物件詳細）
- バリ島不動産について（運用2ルート・2026年最新規制）
- 所有権について（ハック・パカイ／ハック・セワ／ノミニー違法警告）
- 購入方法について（5ステップ：LOI → PPJB → リーガル → AJB → 引き渡し）
- 支払い方法について → **ローン相談**（日系金融提携ルート）

全コンテンツは「個別相談」へ誘導するフッターを備えています。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成し、以下の値を設定してください：

```
LINE_CHANNEL_SECRET=your_channel_secret_here
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
PORT=3000
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here
GOOGLE_FORM_URL=https://forms.google.com/your-form-url-here
```

### 3. LINE Developers設定

1. [LINE Developers](https://developers.line.biz/)でチャネルを作成
2. Messaging APIを有効化
3. Webhook URLを設定: `https://your-domain.com/webhook`
4. Channel SecretとChannel Access Tokenを取得して`.env`に設定

### 4. リッチメニューの設定

LINE Official Account Managerでリッチメニュー画像（6分割）を作成し、各タップ領域に **postbackアクション** を設定します。`data` には以下の値をそのまま入れてください（postback本文 = 表示テキストと同一）。

| タップ領域 | postback data |
|---|---|
| インドネシア・バリ島紹介 | `インドネシア・バリ島紹介` |
| 不動産紹介 | `不動産紹介` |
| 視察予約 | `視察予約` |
| 提携先 | `提携先` |
| 会社概要 | `会社概要` |
| 社長紹介 | `社長紹介` |

> サブメニューはBot側でFlex Messageのボタンとして自動生成されるため、リッチメニュー画像自体は6項目のままで構いません。

### テキストキーワード対応

ユーザーが自由入力した場合も以下キーワードで該当コンテンツへ誘導します：

- 「インドネシア」「バリ島」「伸び代」「法律」「所有権」「購入方法」「支払い」「ローン」「エリア」「視察」「提携」「会社」「社長」「個別相談」

## 起動方法

### 開発環境

```bash
npm run dev
```

### 本番環境

```bash
npm start
```

## デプロイ

### ngrok（開発用）

```bash
ngrok http 3000
```

生成されたHTTPS URLをLINE DevelopersのWebhook URLに設定します。

### 本番環境へのデプロイ

- Heroku、Google Cloud Run、AWS等のクラウドサービスにデプロイ
- HTTPS対応のドメインが必要です

## プロジェクト構成

```
linebot/
├── server.js          # メインのサーバーファイル
├── config.js          # 設定ファイル
├── package.json       # プロジェクト設定
├── .env              # 環境変数（gitignore対象）
├── .gitignore        # Git除外設定
└── README.md         # このファイル
```

## TODO

- [ ] 社長紹介の本文・写真差し替え（現在プレースホルダー）
- [ ] リッチメニュー画像（6項目版）の作成・反映
- [ ] Airtable物件データの更新フロー整備
- [ ] エラーハンドリングの強化
- [ ] ロギング機能の追加

## Renderへのデプロイ手順

### 1. GitHubにプッシュ
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

### 2. Renderでの設定

1. [Render](https://render.com)にログイン
2. 「New +」→「Web Service」を選択
3. GitHubリポジトリを接続
4. 以下の設定を行う：
   - Name: `linebot-bali`（任意）
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

### 3. 環境変数の設定

Renderのダッシュボードで以下の環境変数を設定：

- `LINE_CHANNEL_SECRET`: LINE Developersから取得
- `LINE_CHANNEL_ACCESS_TOKEN`: LINE Developersから取得
- `BASE_URL`: `https://your-app-name.onrender.com`
- `AIRTABLE_API_KEY`: Airtableから取得（オプション）
- `AIRTABLE_BASE_ID`: Airtableから取得（オプション）
- `GOOGLE_FORM_URL`: Googleフォームの共有URL

### 4. デプロイ後の設定

1. RenderでデプロイされたURLを確認
2. LINE DevelopersでWebhook URLを更新：
   `https://your-app-name.onrender.com/webhook`
3. Webhook利用を「オン」に設定

## 注意事項

- Renderの無料プランは15分間アクセスがないとスリープ状態になります
- 初回アクセス時は起動に時間がかかる場合があります
- 画像ファイルは`public/images/`に配置してからデプロイしてください

## ライセンス

ISC