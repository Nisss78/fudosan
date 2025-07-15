# バリ島不動産 LINE Bot

バリ島の不動産情報を提供するLINE Botアプリケーションです。

## 機能

リッチメニューから以下の6つの機能を利用できます：

1. **バリ島の紹介** - バリ島の魅力と投資機会の紹介
2. **不動産一覧** - エリア別（セミニャック、ヌサドゥア、ウブド、チャングー）の物件情報
3. **レンタルサービス** - バイク・車のレンタル案内
4. **視察の予約** - 物件視察の予約（Googleフォーム連携）
5. **連携企業** - パートナー企業の紹介
6. **会社概要** - 会社情報の表示

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

LINE Official Account Managerでリッチメニューを作成し、以下のpostbackデータを設定：

- バリ島の紹介: `action=bali_info`
- 不動産一覧: `action=property_list`
- レンタルサービス: `action=rental_service`
- 視察の予約: `action=inspection_booking`
- 連携企業: `action=partner_companies`
- 会社概要: `action=company_info`

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

- [ ] Airtable APIとの連携実装
- [ ] 物件詳細情報の表示機能
- [ ] 画像URLの実装（現在はサンプルURL）
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