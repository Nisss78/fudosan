const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const config = require('./config');
const path = require('path');
const Airtable = require('airtable');

const app = express();

// 静的ファイル（画像など）を提供
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// LINE Imagemap用エンドポイント: LINEは {baseUrl}/{size} 形式で取得
// (size = 240/300/460/700/1040)。全サイズに同じ画像を返す。
app.get('/imagemap/bali-map/:size', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/images/bali-map.png'));
});

const lineConfig = {
  channelAccessToken: config.channelAccessToken,
  channelSecret: config.channelSecret
};

const client = new Client(lineConfig);

// Airtable設定
const base = new Airtable({
  apiKey: config.airtableApiKey
}).base(config.airtableBaseId);

// リッチメニューのアクションを定義
const RICH_MENU_ACTIONS = {
  // トップレベル（リッチメニュー本体から発火）
  INDONESIA_BALI_MENU: 'インドネシア・バリ島紹介',
  PROPERTY_MENU: '不動産紹介',
  INSPECTION_BOOKING: '視察予約',
  PARTNER_COMPANIES: '提携先',
  COMPANY_INFO: '会社概要',
  CEO_INFO: '社長紹介',

  // サブメニュー（インドネシア・バリ島紹介から発火）
  INDONESIA_INFO: 'インドネシアについて',
  BALI_INFO: 'バリ島について',
  GROWTH_POTENTIAL: '伸び代について',
  LAW_INFO: '法律について',

  // サブメニュー（不動産紹介から発火）
  AREA_INFO: 'エリアについて',
  BALI_PROPERTY_INFO: 'バリ島不動産について',
  OWNERSHIP_INFO: '所有権について',
  PURCHASE_METHOD: '購入方法について',
  PAYMENT_METHOD: '支払い方法について',
  LOAN_CONSULT: 'ローン相談'
};

// エリアマッピング（日本語 → ローマ字）
const AREA_MAPPING = {
  'uluwatu': 'Kuta',
  'ungasan': 'Ungasan',
  'nusadua': 'Nusadua',
  'jimbaran': 'Jimbaran',
  'kuta': 'Kuta',
  'seminyak': 'Seminyak',
  'legian': 'Legian',
  'canggu': 'Canggu',
  'badung': 'Badung',
  'other': 'Other'
};

// エリアコード → 日本語表示名（地図ピン用）
const AREA_NAME_JA = {
  uluwatu: 'ウルワッツ',
  ungasan: 'ウンガサン',
  nusadua: 'ヌサドゥア',
  jimbaran: 'ジンバラン',
  kuta: 'クタ',
  seminyak: 'スミニャック',
  legian: 'レギャン',
  canggu: 'チャングー',
  badung: 'バドゥン',
  other: 'その他'
};

// Webhookエンドポイント
app.post('/webhook', middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;
    
    await Promise.all(events.map(async (event) => {
      console.log('Event received:', event);
      
      // メッセージイベントの処理
      if (event.type === 'message' && event.message.type === 'text') {
        await handleTextMessage(event);
      }
      // ポストバックイベント（リッチメニューからのアクション）の処理
      else if (event.type === 'postback') {
        await handlePostback(event);
      }
    }));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).end();
  }
});

// テキストメッセージの処理
async function handleTextMessage(event) {
  const { replyToken, message } = event;
  const userMessage = message.text;

  console.log('Processing text message:', userMessage);

  let replyMessage;

  try {
    // 個別相談キーワード（最優先）
    if (userMessage.includes('個別相談') || userMessage.includes('相談')) {
      console.log('Creating consultation message');
      replyMessage = createConsultationMessage();
    }
    // インドネシア・バリ島紹介のトップメニュー
    else if (userMessage.includes('インドネシア・バリ') || userMessage === 'インドネシア・バリ島紹介') {
      replyMessage = createIndonesiaBaliMenuMessage();
    }
    // サブメニュー内の各項目（キーワード一致）
    else if (userMessage.includes('伸び代')) {
      replyMessage = createGrowthPotentialMessage();
    } else if (userMessage.includes('法律')) {
      replyMessage = createLawMessage();
    } else if (userMessage.includes('所有権')) {
      replyMessage = createOwnershipMessage();
    } else if (userMessage.includes('購入方法') || userMessage.includes('購入の流れ')) {
      replyMessage = createPurchaseMethodMessage();
    } else if (userMessage.includes('支払い')) {
      replyMessage = createPaymentMethodMessage();
    } else if (userMessage.includes('ローン') || userMessage.includes('融資')) {
      replyMessage = createLoanConsultMessage();
    } else if (userMessage.includes('エリア')) {
      // bali-map.png 未配置のため一時的にボタン式に戻す
      replyMessage = createPropertyListMessage();
    } else if (userMessage.includes('社長')) {
      replyMessage = createCEOInfoMessage();
    }
    // インドネシア（バリより前にチェック / バリ島と被らないように単独語のとき）
    else if (userMessage.includes('インドネシア') && !userMessage.includes('バリ')) {
      replyMessage = createIndonesiaInfoMessage();
    }
    // バリ島 → 単独だとバリ島について（紹介ページ）
    else if (userMessage.includes('バリ島') || userMessage.includes('パリ島')) {
      replyMessage = createBaliInfoMessage();
    }
    // 不動産紹介トップメニュー
    else if (userMessage.includes('不動産')) {
      replyMessage = createPropertyMenuMessage();
    }
    // 視察予約
    else if (userMessage.includes('視察') || userMessage.includes('予約')) {
      replyMessage = createInspectionBookingMessage();
    }
    // 提携先
    else if (userMessage.includes('提携') || userMessage.includes('企業')) {
      replyMessage = createPartnerCompaniesMessage();
    }
    // 会社概要
    else if (userMessage.includes('会社') || userMessage.includes('概要')) {
      replyMessage = createCompanyInfoMessage();
    } else {
      console.log('Creating default message');
      replyMessage = {
        type: 'text',
        text: `メッセージを受信しました: ${userMessage}\n\nリッチメニューからご希望の項目をお選びください。`
      };
    }

    console.log('Reply message size:', JSON.stringify(replyMessage).length);
    await client.replyMessage(replyToken, replyMessage);
    console.log('Message sent successfully');
  } catch (error) {
    console.error('Error in handleTextMessage:', error);
    console.error('Message that caused error:', JSON.stringify(replyMessage, null, 2));
    throw error;
  }
}

// ポストバックイベントの処理
async function handlePostback(event) {
  const { replyToken, postback } = event;
  const data = postback.data;

  console.log('Processing postback:', data);

  let replyMessage;

  try {
    switch (data) {
      // ========== トップメニュー（リッチメニューから直接） ==========
      case RICH_MENU_ACTIONS.INDONESIA_BALI_MENU:
        replyMessage = createIndonesiaBaliMenuMessage();
        break;

      case RICH_MENU_ACTIONS.PROPERTY_MENU:
        replyMessage = createPropertyMenuMessage();
        break;

      case RICH_MENU_ACTIONS.INSPECTION_BOOKING:
        replyMessage = createInspectionBookingMessage();
        break;

      case RICH_MENU_ACTIONS.PARTNER_COMPANIES:
        replyMessage = createPartnerCompaniesMessage();
        break;

      case RICH_MENU_ACTIONS.COMPANY_INFO:
        replyMessage = createCompanyInfoMessage();
        break;

      case RICH_MENU_ACTIONS.CEO_INFO:
        replyMessage = createCEOInfoMessage();
        break;

      // ========== インドネシア・バリ島サブメニュー ==========
      case RICH_MENU_ACTIONS.INDONESIA_INFO:
        replyMessage = createIndonesiaInfoMessage();
        break;

      case RICH_MENU_ACTIONS.BALI_INFO:
        replyMessage = createBaliInfoMessage();
        break;

      case RICH_MENU_ACTIONS.GROWTH_POTENTIAL:
        replyMessage = createGrowthPotentialMessage();
        break;

      case RICH_MENU_ACTIONS.LAW_INFO:
        replyMessage = createLawMessage();
        break;

      // ========== 不動産紹介サブメニュー ==========
      case RICH_MENU_ACTIONS.AREA_INFO:
        // bali-map.png 未配置のため一時的にボタン式に戻す
        // 画像配置後は createBaliMapImagemapMessage() に戻す
        replyMessage = createPropertyListMessage();
        break;

      case RICH_MENU_ACTIONS.BALI_PROPERTY_INFO:
        replyMessage = createBaliPropertyMessage();
        break;

      case RICH_MENU_ACTIONS.OWNERSHIP_INFO:
        replyMessage = createOwnershipMessage();
        break;

      case RICH_MENU_ACTIONS.PURCHASE_METHOD:
        replyMessage = createPurchaseMethodMessage();
        break;

      case RICH_MENU_ACTIONS.PAYMENT_METHOD:
        replyMessage = createPaymentMethodMessage();
        break;

      case RICH_MENU_ACTIONS.LOAN_CONSULT:
        replyMessage = createLoanConsultMessage();
        break;

      default:
        // 地域選択（地図ピンタップ）→ Airtableは引かず、直接相談導線へ
        if (data.startsWith('area=')) {
          const area = data.split('=')[1];
          const areaJa = AREA_NAME_JA[area] || area;
          replyMessage = createAreaInterestMessage(areaJa);
        } else if (data === 'consultation' || data === '個別相談') {
          replyMessage = createConsultationMessage();
        } else {
          console.log('Unknown postback data:', data);
          replyMessage = {
            type: 'text',
            text: '申し訳ございません。リクエストを処理できませんでした。'
          };
        }
    }

    console.log('Reply message size:', JSON.stringify(replyMessage).length);
    await client.replyMessage(replyToken, replyMessage);
    console.log('Message sent successfully');
  } catch (error) {
    console.error('Error in handlePostback:', error);
    console.error('Message that caused error:', JSON.stringify(replyMessage, null, 2));
    throw error;
  }
}

// バリ島情報のメッセージ作成
function createBaliInfoMessage() {
  return {
    type: 'flex',
    altText: 'バリ島の紹介 - "実利のある楽園"',
    contents: {
      type: 'carousel',
      contents: [
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/bali-hero.jpg?v=${Date.now()}`,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'バリ島が"実利のある楽園"と呼ばれる理由',
                weight: 'bold',
                size: 'lg',
                color: '#1DB446'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: 'ただのリゾートではありません。世界中の投資家・富裕層が注目するその背景には、圧倒的な「数字による裏付け」があります。',
                wrap: true,
                margin: 'md',
                size: 'sm'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '投資価値のポイント',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '• 年間1,600万人規模の観光需要市場\n• 急成長するインドネシア経済の中核\n• 政府による観光開発の最優先支援\n• 欧米・中東・ASEAN富裕層の移住先',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '人口と成長性',
                weight: 'bold',
                size: 'xl',
                color: '#1DB446'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: 'インドネシア総人口',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '約2.8億人（世界第4位）',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: 'バリ州人口',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '約440万人（2024年時点）\n2030年には500万人突破予測\n年成長率：1.2〜1.5%',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '平均年齢：約29歳',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '若年層中心の「生産＋消費」両輪成長モデル',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '拡大市場＋若年人口＝経済活性化と長期的需要の保証',
                wrap: true,
                margin: 'sm',
                size: 'xs',
                color: '#666666',
                style: 'italic'
              }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'GDPと経済ポテンシャル',
                weight: 'bold',
                size: 'xl',
                color: '#1DB446'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: 'インドネシアGDP',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '約1.6兆ドル（世界16位）\n2050年予測：世界トップ5入り（PwC「The World in 2050」レポート）',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: 'バリ州GDP（2023年・参考値）',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '約280兆ルピア（≒約2.5兆円規模）※BPS統計',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '産業構造',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '観光業が約54%、現在は不動産・教育・医療分野へも多角化中',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '成長経済 × 多角化＝安定性と投資余地の拡大',
                wrap: true,
                margin: 'sm',
                size: 'xs',
                color: '#666666',
                style: 'italic'
              }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '観光市場の回復と拡大',
                weight: 'bold',
                size: 'xl',
                color: '#1DB446'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '訪問外国人観光客数の推移',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '2019年（コロナ前）：約630万人（過去最高）\n2020〜2021年：ほぼゼロ（コロナ影響）\n2023年：約460万人（急回復）\n2024年（予測）：600万人超（8割回復）',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: 'インドネシア国内観光客',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '年間1,000万人超',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '合計観光需要市場',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '約1,600万人規模',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '訪問者＝消費者。バリ島は"人が来続ける市場"であり続ける。',
                wrap: true,
                margin: 'sm',
                size: 'xs',
                color: '#666666',
                style: 'italic'
              }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '世界的観光都市 × 安定的な資本流入',
                weight: 'bold',
                size: 'lg',
                color: '#1DB446'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '年間1,000万人超が訪れるアジア最大級の観光島',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '欧米・中東・ASEANの富裕層・ノマド・FIRE層が滞在・移住',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '政府支援',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '政府もインフラ・観光開発を最優先で支援中',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '投資環境の特徴',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '• 年間を通じて温暖な気候\n• 国際的な観光地としての地位\n• 成長する不動産市場\n• 豊かな文化と伝統\n• 英語が通じる環境',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '観光＝消費が絶え間なく流れ込む、資本流入型マーケット',
                wrap: true,
                margin: 'sm',
                size: 'xs',
                color: '#666666',
                style: 'italic'
              }
            ]
          }
        }
      ]
    }
  };
}

// =============================================================
// バリ島エリア選択（Imagemap地図 + ピンタップ）
// =============================================================
// 画像: public/images/bali-map.png に配置（推奨: 1040×780px / 16:12比）
// LINE Imagemapは {baseUrl}/{size} 形式で5サイズを参照するため
// Express側で /imagemap/bali-map/:size ルートを用意し、全サイズ同一画像を返す。
// ピン座標 (x,y,width,height) は baseSize(1040×780) を基準としたピクセル指定。
// 実画像に合わせて以下の座標を後で微調整してください。
function createBaliMapImagemapMessage() {
  const W = 1040;
  const H = 780;
  // 各ピンのタップ範囲。座標は実画像に合わせて要調整。
  const pin = (x, y, area) => ({
    type: 'postback',
    area: { x, y, width: 140, height: 140 },
    data: `area=${area}`,
    displayText: `${AREA_NAME_JA[area]}が気になります`
  });
  return {
    type: 'imagemap',
    baseUrl: `${config.baseUrl}/imagemap/bali-map`,
    altText: 'バリ島エリアマップ - 気になるエリアのピンをタップしてください',
    baseSize: { width: W, height: H },
    actions: [
      // ↓ 仮配置（実画像に合わせて要調整）
      pin(420, 80,  'canggu'),    // チャングー（北西）
      pin(440, 220, 'seminyak'),  // スミニャック
      pin(450, 320, 'legian'),    // レギャン
      pin(460, 420, 'kuta'),      // クタ
      pin(450, 530, 'jimbaran'),  // ジンバラン
      pin(620, 600, 'nusadua'),   // ヌサドゥア（東南）
      pin(380, 620, 'ungasan'),   // ウンガサン
      pin(240, 600, 'uluwatu'),   // ウルワッツ（南西）
      pin(580, 400, 'badung'),    // バドゥン（中央）
      pin(820, 80,  'other')      // その他（右上コーナー）
    ]
  };
}

// エリアタップ後の応答：個別相談導線（Airtable連携は廃止）
function createAreaInterestMessage(areaJa) {
  return {
    type: 'flex',
    altText: `${areaJa}にご興味ありがとうございます`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `🏝 ${areaJa}エリア`, weight: 'bold', size: 'xl', color: '#1DB446' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: 'ご興味をお持ちいただきありがとうございます！', wrap: true, margin: 'md', size: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '💬 このトークで直接ご相談ください', weight: 'bold', size: 'md', margin: 'md', color: '#1DB446' },
          { type: 'text', text: `${areaJa}でどんな物件をお探しか、ご予算・用途・希望条件などをお気軽にメッセージで送ってください。担当者から直接ご返信いたします。`, wrap: true, margin: 'sm', size: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '例：「3,000万予算で別荘として購入したい」「投資用で月額利回り重視」など、ざっくりで構いません。', wrap: true, margin: 'md', size: 'xs', color: '#666666' }
        ]
      }
    }
  };
}

// 不動産一覧のメッセージ作成（旧UI: 現状は呼ばれていない / 互換のため残置）
function createPropertyListMessage() {
  return {
    type: 'flex',
    altText: '不動産エリア選択',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '不動産エリア選択',
            weight: 'bold',
            size: 'xl',
            color: '#1DB446',
            align: 'center'
          },
          {
            type: 'text',
            text: 'ご希望のエリアをお選びください',
            margin: 'md',
            size: 'md',
            color: '#666666',
            align: 'center'
          },
          {
            type: 'separator',
            margin: 'lg'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#1DB446',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: 'ウルワッツ',
                  data: 'area=uluwatu'
                }
              },
              {
                type: 'button',
                style: 'primary',
                color: '#1DB446',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: 'ウンガサン',
                  data: 'area=ungasan'
                }
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#1DB446',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: 'ヌサドゥア',
                  data: 'area=nusadua'
                }
              },
              {
                type: 'button',
                style: 'primary',
                color: '#1DB446',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: 'ジンバラン',
                  data: 'area=jimbaran'
                }
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#1DB446',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: 'クタ',
                  data: 'area=kuta'
                }
              },
              {
                type: 'button',
                style: 'primary',
                color: '#1DB446',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: 'スミニャック',
                  data: 'area=seminyak'
                }
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#1DB446',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: 'レギャン',
                  data: 'area=legian'
                }
              },
              {
                type: 'button',
                style: 'primary',
                color: '#1DB446',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: 'チャングー',
                  data: 'area=canggu'
                }
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#1DB446',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: 'バドゥン',
                  data: 'area=badung'
                }
              },
              {
                type: 'button',
                style: 'primary',
                color: '#1DB446',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: 'その他',
                  data: 'area=other'
                }
              }
            ]
          }
        ]
      }
    }
  };
}

// =============================================================
// 共通ヘルパー：個別相談誘導フッター
// =============================================================
function consultFooter(label = '個別相談を希望する') {
  return {
    type: 'box',
    layout: 'vertical',
    spacing: 'sm',
    contents: [
      {
        type: 'button',
        style: 'primary',
        color: '#1DB446',
        action: {
          type: 'postback',
          label: label,
          data: 'consultation',
          displayText: '個別相談'
        }
      }
    ]
  };
}

// =============================================================
// サブメニュー①：インドネシア・バリ島紹介
// =============================================================
function createIndonesiaBaliMenuMessage() {
  return {
    type: 'flex',
    altText: 'インドネシア・バリ島紹介',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: 'インドネシア・バリ島紹介', weight: 'bold', size: 'xl', color: '#1DB446' },
          { type: 'text', text: '気になる項目をタップしてください', size: 'sm', color: '#666666', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'button', style: 'secondary', action: { type: 'postback', label: 'インドネシアについて', data: RICH_MENU_ACTIONS.INDONESIA_INFO, displayText: 'インドネシアについて' } },
          { type: 'button', style: 'secondary', action: { type: 'postback', label: 'バリ島について', data: RICH_MENU_ACTIONS.BALI_INFO, displayText: 'バリ島について' } },
          { type: 'button', style: 'secondary', action: { type: 'postback', label: '伸び代について', data: RICH_MENU_ACTIONS.GROWTH_POTENTIAL, displayText: '伸び代について' } },
          { type: 'button', style: 'secondary', action: { type: 'postback', label: '法律について', data: RICH_MENU_ACTIONS.LAW_INFO, displayText: '法律について' } }
        ]
      }
    }
  };
}

// =============================================================
// サブメニュー②：不動産紹介
// =============================================================
function createPropertyMenuMessage() {
  return {
    type: 'flex',
    altText: '不動産紹介',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: '不動産紹介', weight: 'bold', size: 'xl', color: '#1DB446' },
          { type: 'text', text: '気になる項目をタップしてください', size: 'sm', color: '#666666', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'button', style: 'secondary', action: { type: 'postback', label: 'エリアについて', data: RICH_MENU_ACTIONS.AREA_INFO, displayText: 'エリアについて' } },
          { type: 'button', style: 'secondary', action: { type: 'postback', label: 'バリ島不動産について', data: RICH_MENU_ACTIONS.BALI_PROPERTY_INFO, displayText: 'バリ島不動産について' } },
          { type: 'button', style: 'secondary', action: { type: 'postback', label: '所有権について', data: RICH_MENU_ACTIONS.OWNERSHIP_INFO, displayText: '所有権について' } },
          { type: 'button', style: 'secondary', action: { type: 'postback', label: '購入方法について', data: RICH_MENU_ACTIONS.PURCHASE_METHOD, displayText: '購入方法について' } },
          { type: 'button', style: 'secondary', action: { type: 'postback', label: '支払い方法について', data: RICH_MENU_ACTIONS.PAYMENT_METHOD, displayText: '支払い方法について' } }
        ]
      }
    }
  };
}

// =============================================================
// インドネシアについて
// =============================================================
function createIndonesiaInfoMessage() {
  return {
    type: 'flex',
    altText: 'インドネシアについて',
    contents: {
      type: 'carousel',
      contents: [
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'インドネシア基本情報', weight: 'bold', size: 'xl', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '世界第4位の人口大国', weight: 'bold', margin: 'md' },
              { type: 'text', text: '• 総人口：約2.8億人\n• 平均年齢：約30歳（日本は約49歳）\n• これから家を買う・借りる世代が爆発的に増加', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '急成長する経済', weight: 'bold', margin: 'md' },
              { type: 'text', text: '• GDP：約1.6兆ドル（世界16位）\n• ジャカルタを中心に中間層が急拡大\n• 「貸し相手」に困らないエネルギーある市場', wrap: true, size: 'sm', margin: 'sm' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '日本人が使える権利は2つだけ', weight: 'bold', size: 'lg', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '①ハック・パカイ（使用権）', weight: 'bold', margin: 'md' },
              { type: 'text', text: '政府公認の使用権。主にジャカルタ高級コンドミニアム向け。最長80年（30+20+30）保有可能。', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '②ハック・セワ（賃借権/リースホールド）', weight: 'bold', margin: 'md' },
              { type: 'text', text: 'バリ島ヴィラ投資で最もよく使われる方法。25〜30年で契約。手続きがシンプル。', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '⚠ ノミニー契約は違法', weight: 'bold', size: 'sm', color: '#E03131', margin: 'md' },
              { type: 'text', text: '現地人から名義を借りる契約は違法。物件没収のリスクがあります。', wrap: true, size: 'xs', margin: 'sm', color: '#666666' }
            ]
          },
          footer: consultFooter('プロに無料相談する')
        }
      ]
    }
  };
}

// =============================================================
// 伸び代について
// =============================================================
function createGrowthPotentialMessage() {
  return {
    type: 'flex',
    altText: 'インドネシア「異次元の伸び代」',
    contents: {
      type: 'carousel',
      contents: [
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '①人口ボーナスの爆発力', weight: 'bold', size: 'lg', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '📊 平均年齢「約30歳」', weight: 'bold', margin: 'md' },
              { type: 'text', text: '日本（約49歳）と比べ圧倒的に若い国', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'text', text: '📊 2030〜2040年がピーク', weight: 'bold', margin: 'md' },
              { type: 'text', text: '働く現役世代の割合が爆発的に増加。一番お金を使う世代が数千万人規模で増える。', wrap: true, size: 'sm', margin: 'sm' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '②毎年5%以上成長する経済', weight: 'bold', size: 'lg', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '日本が「ゼロ成長」と言われる中、インドネシア経済（GDP）は毎年5%前後のペースで成長し続けています。', wrap: true, size: 'sm', margin: 'md' },
              { type: 'text', text: '🎯 黄金のインドネシア2045', weight: 'bold', margin: 'md' },
              { type: 'text', text: '建国100周年に向けた国家ビジョン。世界トップ5の経済大国入りを目指す国策。', wrap: true, size: 'sm', margin: 'sm' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '③観光＆インフラの国家投資', weight: 'bold', size: 'lg', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '• 道路の拡張\n• 新空港の整備\n• デジタルノマド向けビザ緩和\n• 富裕層を呼び込む国策', wrap: true, size: 'sm', margin: 'md' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '国策として「世界からのお金と人」を吸い上げる構造ができている。これが本当の強み。', wrap: true, size: 'sm', margin: 'md' }
            ]
          },
          footer: consultFooter('シミュレーション相談する')
        }
      ]
    }
  };
}

// =============================================================
// 法律について
// =============================================================
function createLawMessage() {
  return {
    type: 'flex',
    altText: 'インドネシア不動産の法律ルール',
    contents: {
      type: 'carousel',
      contents: [
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '失敗しない3大ルール', weight: 'bold', size: 'xl', color: '#1DB446' },
              { type: 'text', text: '日本の常識のまま買うと大失敗します', wrap: true, size: 'sm', color: '#666666', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'ルール①', weight: 'bold', margin: 'md', color: '#1DB446' },
              { type: 'text', text: '外国人は土地の「所有権」を持てない', weight: 'bold', wrap: true, margin: 'sm' },
              { type: 'text', text: 'ノミニー契約（現地人名義借り）は完全に違法。トラブル時にお金は1円も戻りません。', wrap: true, size: 'sm', margin: 'sm', color: '#666666' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'ルール②', weight: 'bold', margin: 'md', color: '#1DB446' },
              { type: 'text', text: 'リースホールド（賃借権）が唯一の正解', weight: 'bold', wrap: true, margin: 'sm' },
              { type: 'text', text: '個人で安全に投資するなら25〜30年の長期レンタル契約が現地法で認められた唯一の方法。', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '💡 プロのワンポイント', weight: 'bold', size: 'sm', margin: 'md' },
              { type: 'text', text: '契約書に「30年後にいくらで延長できるか」のルールが書かれていない物件は選んではいけません。', wrap: true, size: 'sm', margin: 'sm', color: '#666666' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'ルール③', weight: 'bold', margin: 'md', color: '#1DB446' },
              { type: 'text', text: '2026年「建ててはいけないエリア」', weight: 'bold', wrap: true, margin: 'sm' },
              { type: 'text', text: 'グリーンゾーン（農業・景観保全地域）に違法に建てられたヴィラが当局によって解体・営業停止に追い込まれています。', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '物件選びは「安さ」ではなく「合法かどうか」がすべてです。', wrap: true, size: 'sm', margin: 'md', weight: 'bold', color: '#E03131' }
            ]
          },
          footer: consultFooter('合法物件を相談する')
        }
      ]
    }
  };
}

// =============================================================
// バリ島不動産について（運用視点）
// =============================================================
function createBaliPropertyMessage() {
  return {
    type: 'flex',
    altText: 'バリ島不動産について',
    contents: {
      type: 'carousel',
      contents: [
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '買った後の「2つの運用ルート」', weight: 'bold', size: 'lg', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'ルートA：管理会社に丸投げ', weight: 'bold', margin: 'md' },
              { type: 'text', text: '集客・清掃・ゲスト対応・税務まで代行。日本にいながら完全不労所得を実現。', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'ルートB：長期賃貸（マンスリー/年契約）', weight: 'bold', margin: 'md' },
              { type: 'text', text: 'デジタルノマド・リタイア組に月単位で貸す。手堅く手離れが良い。', wrap: true, size: 'sm', margin: 'sm' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '🚨 短期賃貸規制の強化', weight: 'bold', size: 'lg', color: '#E03131' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'バリ州・インドネシア政府による取り締まり強化', weight: 'bold', margin: 'md' },
              { type: 'text', text: '宿泊事業ライセンス（NIB/TDUP等）の取得義務化が進み、未取得物件への行政指導・営業停止事例が増加しています。', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'ライセンス未取得物件は予約サイト掲載や運用継続が困難になるリスクがあり、合法ライセンスを確保できる運用体制が必須です。', wrap: true, size: 'sm', margin: 'md' },
              { type: 'text', text: '※最新の規制状況は個別相談にて確認させていただきます。', wrap: true, size: 'xs', margin: 'md', color: '#666666' }
            ]
          },
          footer: consultFooter('運用リスク診断を受ける')
        }
      ]
    }
  };
}

// =============================================================
// 所有権について
// =============================================================
function createOwnershipMessage() {
  return {
    type: 'flex',
    altText: '所有権について',
    contents: {
      type: 'carousel',
      contents: [
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '日本人が使える権利は2つ', weight: 'bold', size: 'xl', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '①ハック・パカイ（Hak Pakai）', weight: 'bold', margin: 'md' },
              { type: 'text', text: '使用権。主にジャカルタ高級コンドミニアム向け。', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'text', text: '期間：最長80年（30+20+30）', size: 'sm', margin: 'sm', color: '#666666' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '②ハック・セワ（Hak Sewa）', weight: 'bold', margin: 'md' },
              { type: 'text', text: '賃借権／リースホールド。バリ島ヴィラ投資の主流。', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'text', text: '期間：一般的に25〜30年', size: 'sm', margin: 'sm', color: '#666666' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '⚠ 絶対NG：ノミニー契約', weight: 'bold', size: 'lg', color: '#E03131' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '現地人から名義を借りて「所有権」のように振る舞う契約は、インドネシアの法律で完全に違法です。', wrap: true, size: 'sm', margin: 'md' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'リスク', weight: 'bold', margin: 'md' },
              { type: 'text', text: '• 国による物件没収\n• トラブル時に救済なし\n• お金は一切戻らない', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '安全な権利のもとで投資するのが鉄則です。', wrap: true, size: 'sm', weight: 'bold', margin: 'md' }
            ]
          },
          footer: consultFooter('安全な権利で相談する')
        }
      ]
    }
  };
}

// =============================================================
// 購入方法について（5ステップ）
// =============================================================
function createPurchaseMethodMessage() {
  return {
    type: 'flex',
    altText: '購入の5ステップ',
    contents: {
      type: 'carousel',
      contents: [
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '購入5ステップ', weight: 'bold', size: 'xl', color: '#1DB446' },
              { type: 'text', text: '日本にいながら安全に進められます', wrap: true, size: 'sm', color: '#666666', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'STEP①物件選定・購入申込（LOI）', weight: 'bold', margin: 'md', color: '#1DB446' },
              { type: 'text', text: '予算・目的に合った物件を選定。意向書を提出し、申込金（価格の1%〜数%）で物件をロック。', wrap: true, size: 'sm', margin: 'sm' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'STEP②売買予約契約（PPJB）', weight: 'bold', size: 'lg', margin: 'md', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '物件総額・支払いスケジュール・完成予定日などの詳細を確定。', wrap: true, size: 'sm', margin: 'md' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '🏦 ローン実行タイミング', weight: 'bold', margin: 'md' },
              { type: 'text', text: '日系金融機関のローン審査・承認を並行で進め、頭金（20〜30%）を支払い。', wrap: true, size: 'sm', margin: 'sm' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'STEP③リーガルチェック', weight: 'bold', size: 'lg', margin: 'md', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'プロの腕の見せ所であり一番大切なステップ。', wrap: true, size: 'sm', margin: 'md', weight: 'bold' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '公証人（Notaris）を挟み、地主の権利、担保の有無、グリーンゾーン該当の有無を徹底チェック。', wrap: true, size: 'sm', margin: 'md' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'STEP④本契約（公正証書リース契約）', weight: 'bold', size: 'lg', margin: 'md', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '政府公認の公証人（Notaris/PPAT）立ち会いのもと、Akta Sewa Menyewa（公正証書化されたリース契約書）に署名。※外国人はリースホールド契約となり、インドネシア人同士のAJB（売買証書）とは別物です。', wrap: true, size: 'sm', margin: 'md' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '💡 リモート契約も可能', weight: 'bold', margin: 'md' },
              { type: 'text', text: '日本の公証役場や郵送手続きを組み合わせれば、日本にいながらオンライン契約も可能です。', wrap: true, size: 'sm', margin: 'sm' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'STEP⑤残金支払い・引き渡し', weight: 'bold', size: 'lg', margin: 'md', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '融資実行または自己資金で残金支払い → 鍵と権利書があなたへ。', wrap: true, size: 'sm', margin: 'md' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '宿泊ライセンスを持った管理会社と連携し、家賃収入の受け取り（運用）スタート。', wrap: true, size: 'sm', margin: 'md' }
            ]
          },
          footer: consultFooter('購入シミュレーションを依頼')
        }
      ]
    }
  };
}

// =============================================================
// 支払い方法について
// =============================================================
function createPaymentMethodMessage() {
  return {
    type: 'flex',
    altText: '支払い方法について',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '支払い方法は2つ', weight: 'bold', size: 'xl', color: '#1DB446' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '①現金一括払い', weight: 'bold', margin: 'md' },
          { type: 'text', text: '最もシンプル。手続きが早く、追加コストもなし。', wrap: true, size: 'sm', margin: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '②ローン（融資）', weight: 'bold', margin: 'md' },
          { type: 'text', text: 'ネットでは「外国人はローン不可」とされがち。\nしかし、日本企業・日系金融機関との「特別な提携ルート」を使えば、日本にいながら融資を引いてバリ島物件を購入できます。', wrap: true, size: 'sm', margin: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '👇 詳しくはローン相談へ', weight: 'bold', size: 'sm', margin: 'md', color: '#1DB446' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#1DB446',
            action: {
              type: 'postback',
              label: 'ローン相談に進む',
              data: RICH_MENU_ACTIONS.LOAN_CONSULT,
              displayText: 'ローン相談'
            }
          }
        ]
      }
    }
  };
}

// =============================================================
// ローン相談
// =============================================================
function createLoanConsultMessage() {
  return {
    type: 'flex',
    altText: 'バリ島不動産でローンを組む裏ワザ',
    contents: {
      type: 'carousel',
      contents: [
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '諦めるのは早い', weight: 'bold', size: 'lg', color: '#1DB446' },
              { type: 'text', text: 'バリ島不動産で「ローン」を組む裏ワザ', weight: 'bold', wrap: true, margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'ネット情報の常識', weight: 'bold', margin: 'md', color: '#666666' },
              { type: 'text', text: '「インドネシアでは外国人は100%ローン不可。現金一括のみ」\n→ 一般ルートでは正解', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '実は、日本企業・日系金融機関との「特別な提携ルート」を活用すれば、日本にいながら融資を引いてバリ島物件を購入できます。', wrap: true, size: 'sm', margin: 'md' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'なぜ現地銀行で借りられないか', weight: 'bold', size: 'lg', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '①身元証明ができない', weight: 'bold', margin: 'md' },
              { type: 'text', text: '現地居住権（ビザ）のない外国人に数千万円の融資はリスク過大。', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '②金利が恐ろしく高い', weight: 'bold', margin: 'md' },
              { type: 'text', text: '現地住宅ローン金利は年10〜12%前後。利益が金利で全て吹き飛びます。', wrap: true, size: 'sm', margin: 'sm' }
            ]
          }
        },
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '🏦 プロの裏ワザ', weight: 'bold', size: 'lg', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '日系金融ネットワークの活用', weight: 'bold', margin: 'md' },
              { type: 'text', text: '提携先「株式会社タカバン」のローン相談窓口や、インドネシア大手商業銀行 CIMB Niaga を始めとする金融ネットワークを通じた個別融資ルートをご紹介できます。', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '✅ 日本にいながら融資審査', weight: 'bold', size: 'sm', margin: 'md' },
              { type: 'text', text: '日本の資産・信用をベースに審査。', wrap: true, size: 'sm', margin: 'sm' },
              { type: 'text', text: '✅ 現地より圧倒的に低金利', weight: 'bold', size: 'sm', margin: 'md' },
              { type: 'text', text: '日本基準の金利でレバレッジ投資が可能。', wrap: true, size: 'sm', margin: 'sm' }
            ]
          },
          footer: consultFooter('資金シミュレーション相談')
        }
      ]
    }
  };
}

// =============================================================
// 社長紹介（プレースホルダー）
// =============================================================
function createCEOInfoMessage() {
  return {
    type: 'flex',
    altText: '社長紹介 - 安達正之',
    contents: {
      type: 'bubble',
      hero: {
        type: 'image',
        url: `${config.baseUrl}/images/ceo.jpg?v=${Date.now()}`,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '安達 正之', weight: 'bold', size: 'lg', color: '#1DB446' },
          { type: 'text', text: 'ARCADIA / PT ARCADIA INDONESIA PROPERTY', size: 'xs', color: '#666666', margin: 'xs', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '「結局、最後は人でしょ。」', weight: 'bold', size: 'md', margin: 'md', color: '#1DB446', align: 'center', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '経歴', weight: 'bold', margin: 'md', size: 'sm' },
          { type: 'text', text: '大阪出身。19歳でLAに渡りプロサッカーの道へ進むも、前十字靭帯断裂により引退。その後バイオマス発電事業で起業し、25歳で約72億円規模の買収を経験。', wrap: true, size: 'sm', margin: 'sm', color: '#333333' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '現在', weight: 'bold', margin: 'md', size: 'sm' },
          { type: 'text', text: 'インドネシアを拠点に不動産・M&Aを手がける「ARCADIA」を経営。スペイン・ドバイにも事業を展開。バイク事故からの奇跡的な回復経験を通じて「人」の大切さを痛感し、世界中で信頼の輪を広げています。宇宙食開発など社会貢献事業にも従事。', wrap: true, size: 'sm', margin: 'sm', color: '#333333' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'uri',
              label: '詳しい人物ストーリーを読む',
              uri: 'https://note.com/president_note/n/n51aa5e908489'
            }
          },
          {
            type: 'button',
            style: 'primary',
            color: '#1DB446',
            action: {
              type: 'postback',
              label: '個別相談を希望する',
              data: 'consultation',
              displayText: '個別相談を希望します'
            }
          }
        ]
      }
    }
  };
}

// =============================================================
// 個別相談（このトークで直接やり取り。視察予約だけは別フォーム）
// =============================================================
function createConsultationMessage() {
  return {
    type: 'flex',
    altText: '個別相談のご案内',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '個別相談のご案内', weight: 'bold', size: 'xl', color: '#1DB446' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '読者限定・無料', weight: 'bold', margin: 'md' },
          { type: 'text', text: '強引なセールスは一切ありません。プロのセカンドオピニオンとしてお気軽にご活用ください。', wrap: true, size: 'sm', margin: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '💬 このトークで直接お話しします', weight: 'bold', size: 'md', margin: 'md', color: '#1DB446' },
          { type: 'text', text: 'フォーム入力は不要です。気になることをそのままメッセージで送ってください。担当者から直接ご返信します。', wrap: true, size: 'sm', margin: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: 'こんなことから話せます', weight: 'bold', margin: 'md' },
          { type: 'text', text: '• 今検討中の物件・契約が安全か知りたい\n• 自分の予算で何ができるか相談したい\n• ローンが使える具体的な提携物件を見たい\n• 何から始めたらいいか分からない\n• まずは雑談から', wrap: true, size: 'sm', margin: 'sm' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '※現地視察をご希望の方は、リッチメニューの「視察予約」から専用フォームへお進みください。', wrap: true, size: 'xs', margin: 'md', color: '#666666' }
        ]
      }
    }
  };
}

// 視察予約のメッセージ作成
function createInspectionBookingMessage() {
  return {
    type: 'flex',
    altText: '視察予約',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '物件視察予約',
            weight: 'bold',
            size: 'xl'
          },
          {
            type: 'text',
            text: 'バリ島の物件を実際にご覧いただけます',
            wrap: true,
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'text',
            text: '視察内容:',
            weight: 'bold',
            margin: 'lg'
          },
          {
            type: 'text',
            text: '• 希望エリアの物件案内\n• 現地スタッフによる説明\n• 投資相談\n• 空港送迎サービス',
            wrap: true,
            margin: 'sm'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'uri',
              label: '予約フォームへ',
              uri: config.googleFormUrl || 'https://forms.google.com'
            }
          }
        ]
      }
    }
  };
}

// 提携先企業・アンバサダーのメッセージ作成
// マサさん指定順: CIMB → Permata → 佐藤 → 石塚 → Watermark → タカバン → アルカディア
function createPartnerCompaniesMessage() {
  return {
    type: 'flex',
    altText: '提携先企業・アンバサダー',
    contents: {
      type: 'carousel',
      contents: [
        // ===== ① CIMB Bank =====
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/cimb-niaga.png?v=${Date.now()}`,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'fit'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '🏦 金融・銀行', size: 'xs', color: '#666666' },
              { type: 'text', text: 'CIMB Niaga', weight: 'bold', size: 'xl', color: '#1DB446', margin: 'sm' },
              { type: 'text', text: 'PT Bank CIMB Niaga Tbk', wrap: true, margin: 'xs', size: 'xs', color: '#666666' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'インドネシア大手商業銀行', weight: 'bold', margin: 'md', size: 'sm' },
              { type: 'text', text: 'デベロッパー向けの融資や、富裕層向けローンに豊富な実績を持つインドネシア大手商業銀行。ARCADIAの不動産投資をしっかりサポートする金融パートナーです。', wrap: true, margin: 'sm', size: 'sm' }
            ]
          }
        },
        // ===== ② Permata Bank =====
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/permata-bank.png?v=${Date.now()}`,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'fit'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '🏦 金融・銀行', size: 'xs', color: '#666666' },
              { type: 'text', text: 'Permata Bank', weight: 'bold', size: 'xl', color: '#1DB446', margin: 'sm' },
              { type: 'text', text: 'PT Bank Permata Tbk', wrap: true, margin: 'xs', size: 'xs', color: '#666666' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'インドネシア大手商業銀行', weight: 'bold', margin: 'md', size: 'sm' },
              { type: 'text', text: 'タイのバンコック銀行が筆頭株主のインドネシア大手商業銀行。リテール・コーポレート両領域で全国300超の支店ネットワークを持ち、高い信頼性とサービス品質を誇ります。', wrap: true, margin: 'sm', size: 'sm' }
            ]
          }
        },
        // ===== ③ 佐藤 彰真（写真付き） =====
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/sato.jpg?v=${Date.now()}`,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '🤝 スポンサー先', size: 'xs', color: '#666666' },
              { type: 'text', text: 'Professional Footballer (Based in Bali)', size: 'xs', color: '#1DB446', margin: 'xs', wrap: true },
              { type: 'text', text: '佐藤 彰真', weight: 'bold', size: 'xl', color: '#1DB446', margin: 'sm' },
              { type: 'text', text: 'Shoma Sato / 山形県観光大使', wrap: true, margin: 'xs', size: 'xs', color: '#666666' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '海外で挑戦し続ける日本人', weight: 'bold', margin: 'md', size: 'sm' },
              { type: 'text', text: '山形県米沢市出身のプロサッカー選手。16歳でドイツ留学を皮切りに世界6カ国超でプレー、現在はOne Taguig FC（フィリピン1部）所属。ARCADIAはスポンサーとして継続的にサポートしています。', wrap: true, margin: 'sm', size: 'sm' }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'secondary',
                action: {
                  type: 'uri',
                  label: 'Instagram (shomarjr)',
                  uri: 'https://www.instagram.com/shomarjr/'
                }
              }
            ]
          }
        },
        // ===== ④ 石塚 大介（写真付き） =====
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/ishizuka.jpg?v=${Date.now()}`,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '🤝 スポンサー先', size: 'xs', color: '#666666' },
              { type: 'text', text: 'Japanese Artist / 漫画家', size: 'xs', color: '#1DB446', margin: 'xs' },
              { type: 'text', text: '石塚 大介', weight: 'bold', size: 'xl', color: '#1DB446', margin: 'sm' },
              { type: 'text', text: 'Daisuke Ishizuka / 大阪芸術大学卒', wrap: true, margin: 'xs', size: 'xs', color: '#666666' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '世界に挑む現代アーティスト', weight: 'bold', margin: 'md', size: 'sm' },
              { type: 'text', text: '大阪芸術大学在学中より、雑誌やSNSでギャグマンガを発表し人気を博す（Instagramフォロワー約15万人）。現在はより自由な表現を追求しアーティストとしても活動。ARCADIAは創作活動をスポンサーとして応援しています。', wrap: true, margin: 'sm', size: 'sm' }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'secondary',
                action: {
                  type: 'uri',
                  label: 'Instagram (art_iszk)',
                  uri: 'https://www.instagram.com/art_iszk/'
                }
              }
            ]
          }
        },
        // ===== ⑤ ウォーターマークホテル（ロゴ） =====
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/watermark-logo.png?v=${Date.now()}`,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'fit'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '🏨 提携ホテル', size: 'xs', color: '#666666' },
              { type: 'text', text: 'ウォーターマーク', weight: 'bold', size: 'lg', color: '#1DB446', margin: 'sm', wrap: true },
              { type: 'text', text: 'ホテル＆スパ バリ ジンバラン', weight: 'bold', size: 'sm', color: '#1DB446', wrap: true },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '事前視察・打ち合わせに最適な提携ホテル', weight: 'bold', margin: 'md', size: 'sm' },
              { type: 'text', text: '空港からのアクセスが良く、落ち着いた環境での滞在や会議利用に適しており、視察前後の移動やスケジュール調整もスムーズ。快適な客室と充実した館内施設で滞在を安心してお過ごしいただけます。', wrap: true, margin: 'sm', size: 'sm' }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'secondary',
                action: {
                  type: 'uri',
                  label: '公式サイトを見る',
                  uri: 'https://www.watermark-bali.com/'
                }
              }
            ]
          }
        },
        // ===== ⑥ 株式会社タカバン =====
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/takaban.jpg?v=${Date.now()}`,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '📌 提携ローン会社', size: 'xs', color: '#666666' },
              { type: 'text', text: '株式会社タカバン', weight: 'bold', size: 'xl', color: '#1DB446', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '資金計画・ローン相談の提携先', weight: 'bold', margin: 'md', size: 'sm' },
              { type: 'text', text: '資金計画やローンに関するご相談をお受けできる提携先として、ご紹介しています。専門スタッフがお客様の状況に合わせたご相談に対応し、現地での購入プロセスをより安心して進めていただけます。', wrap: true, margin: 'sm', size: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '初めての海外不動産でも、資金面の不安を軽減しながら検討を進められます。', wrap: true, margin: 'md', size: 'xs', color: '#666666' }
            ]
          }
        },
        // ===== ⑦ アルカディア（HP + 個別相談） =====
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/arcadia-banner.jpg?v=${Date.now()}`,
            size: 'full',
            aspectRatio: '20:5',
            aspectMode: 'fit'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'ARCADIA INDONESIA PROPERTY', size: 'xs', color: '#666666' },
              { type: 'text', text: 'アルカディア', weight: 'bold', size: 'xl', color: '#1DB446', margin: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '海外不動産投資の安心パートナー', weight: 'bold', margin: 'md', size: 'sm' },
              { type: 'text', text: '物件見学から契約・管理・売却まで一貫してサポート。現地ネットワークを活かしたマーケティング支援で、インドネシア市場への進出を後押しします。', wrap: true, margin: 'sm', size: 'sm' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'まずはお気軽にご相談ください。', wrap: true, margin: 'md', size: 'xs', color: '#666666' }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'secondary',
                action: {
                  type: 'uri',
                  label: '公式ホームページを見る',
                  uri: 'https://arcadia-property-jp.com/'
                }
              },
              {
                type: 'button',
                style: 'primary',
                color: '#1DB446',
                action: {
                  type: 'postback',
                  label: '個別相談を希望する',
                  data: 'consultation',
                  displayText: '個別相談を希望します'
                }
              }
            ]
          }
        }
      ]
    }
  };
}

// 会社概要のメッセージ作成
function createCompanyInfoMessage() {
  return {
    type: 'flex',
    altText: '会社概要 - PT ARCADIA INDONESIA PROPERTY',
    contents: {
      type: 'carousel',
      contents: [
        // ===== バブル①: 基本情報 =====
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/arcadia-logo.jpg?v=${Date.now()}`,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'fit'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '企業概要', weight: 'bold', size: 'xl', color: '#1DB446' },
              { type: 'text', text: 'PT ARCADIA INDONESIA PROPERTY', weight: 'bold', margin: 'sm', size: 'md', wrap: true },
              { type: 'separator', margin: 'md' },
              { type: 'box', layout: 'vertical', spacing: 'sm', margin: 'md', contents: [
                { type: 'box', layout: 'baseline', spacing: 'sm', contents: [
                  { type: 'text', text: '法人番号', size: 'sm', color: '#666666', flex: 3 },
                  { type: 'text', text: '02865343679050000', size: 'sm', flex: 7, wrap: true }
                ]},
                { type: 'box', layout: 'baseline', spacing: 'sm', contents: [
                  { type: 'text', text: '資本金', size: 'sm', color: '#666666', flex: 3 },
                  { type: 'text', text: '10,000,000,000 IDR\n（約1億円）', size: 'sm', flex: 7, wrap: true }
                ]},
                { type: 'box', layout: 'baseline', spacing: 'sm', contents: [
                  { type: 'text', text: '代表', size: 'sm', color: '#666666', flex: 3 },
                  { type: 'text', text: 'MASAYUKI ADACHI\n（安達 正之）', size: 'sm', flex: 7, wrap: true, weight: 'bold' }
                ]},
                { type: 'box', layout: 'baseline', spacing: 'sm', contents: [
                  { type: 'text', text: '設立', size: 'sm', color: '#666666', flex: 3 },
                  { type: 'text', text: '2012年', size: 'sm', flex: 7 }
                ]}
              ]}
            ]
          }
        },
        // ===== バブル②: 所在地 + HPリンク =====
        {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '所在地', weight: 'bold', size: 'xl', color: '#1DB446' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '🏢 本社', weight: 'bold', margin: 'md', size: 'sm' },
              { type: 'text', text: 'JALAN TAMANAN AYU, GANG GIRI ASRI NO.8 RT.00 BENOA, KUTA SELATAN, KAB BADUNG, BALI', wrap: true, margin: 'sm', size: 'sm', color: '#333333' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '🏬 支店', weight: 'bold', margin: 'md', size: 'sm' },
              { type: 'text', text: 'Park23 Creative Hub, Jl. Kediri 3rd Floor, Tuban, Kuta, Badung Regency, Bali 80361', wrap: true, margin: 'sm', size: 'sm', color: '#333333' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: 'バリ島・バドゥン県を拠点に、日本人投資家のバリ島不動産購入・運用をサポートしています。', wrap: true, margin: 'md', size: 'xs', color: '#666666' }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#1DB446',
                action: {
                  type: 'uri',
                  label: '公式ホームページを見る',
                  uri: 'https://arcadia-property-jp.com/company'
                }
              },
              {
                type: 'button',
                style: 'secondary',
                action: {
                  type: 'postback',
                  label: '個別相談を希望する',
                  data: 'consultation',
                  displayText: '個別相談を希望します'
                }
              }
            ]
          }
        }
      ]
    }
  };
}

// 地域別不動産詳細（Airtable連携予定）
// Airtableから物件データを取得
async function getPropertiesFromAirtable(area) {
  try {
    const airtableArea = AREA_MAPPING[area] || area;
    console.log(`Fetching properties for area: ${airtableArea}`);
    console.log(`Using Base ID: ${config.airtableBaseId}`);
    console.log(`Using API Key: ${config.airtableApiKey ? 'Set' : 'Not set'}`);
    console.log(`API Key prefix: ${config.airtableApiKey ? config.airtableApiKey.substring(0, 10) + '...' : 'None'}`);
    
    // Base IDが正しいか確認するために、まずはベースの基本情報を取得
    console.log('Testing basic Airtable connection...');
    
    // スクリーンショットから確認したテーブル名
    const possibleTableNames = ['Table 1'];
    let records = [];
    let successTableName = '';
    
    for (const testTableName of possibleTableNames) {
      try {
        console.log(`Trying table name: "${testTableName}"`);
        
        // フィルタなしで少数のレコードを取得してテーブル構造を確認
        const testRecords = await base(testTableName).select({
          maxRecords: 2
        }).all();
        
        console.log(`✓ Success with table: "${testTableName}"`);
        console.log('Found fields:', Object.keys(testRecords[0]?.fields || {}));
        console.log('Sample record:', testRecords[0]?.fields);
        
        // スクリーンショットから確認したフィールド名を使用
        const areaFieldName = 'area';
        console.log(`Using area field name: ${areaFieldName}`);
        console.log(`Looking for area value: ${airtableArea}`);

        // エリアでフィルタリング
        let filterFormula;
        if (airtableArea === 'Other') {
          // 「その他」の場合は、指定した9個のエリア以外をすべて取得
          const specifiedAreas = ['Kuta', 'Ungasan', 'Nusadua', 'Jimbaran', 'Seminyak', 'Legian', 'Canggu', 'Badung'];
          const orConditions = specifiedAreas.map(a => `{${areaFieldName}} = '${a}'`).join(', ');
          filterFormula = `NOT(OR(${orConditions}))`;
          console.log(`Filter formula for "Other": ${filterFormula}`);
        } else {
          // 通常のエリア指定の場合
          filterFormula = `{${areaFieldName}} = '${airtableArea}'`;
          console.log(`Filter formula: ${filterFormula}`);
        }

        records = await base(testTableName).select({
          filterByFormula: filterFormula,
          maxRecords: 10
        }).all();

        console.log(`Records found: ${records.length}`);
        
        // もし見つからない場合は、全レコードを取得してデバッグ
        if (records.length === 0) {
          console.log('No records found, fetching all records for debugging...');
          const allRecords = await base(testTableName).select({
            maxRecords: 10
          }).all();
          console.log('All area values in database:', allRecords.map(r => r.fields.area));
        }
        
        successTableName = testTableName;
        break;
      } catch (tableError) {
        console.log(`✗ Failed with table "${testTableName}":`, tableError.message);
        
        // 認証エラーの場合は、テスト用のダミーデータを返す
        if (tableError.message.includes('not authorized')) {
          console.log('🔧 API Key authorization issue detected. Using test data...');
          records = [
            {
              id: 'test1',
              fields: {
                'Name': 'Casa Fermina',
                'area': 'Kuta',
                'Land size': 'Land size 100 m²',
                'Building size': 'Building size 100 m²',
                'Number of rooms': 3,
                'Selling price': '228,872USD',
                'Description': 'Beautiful property in Kuta area',
                'Image': [
                  {
                    url: `${config.baseUrl}/images/property-1.jpg?v=${Date.now()}`
                  }
                ]
              }
            },
            {
              id: 'test2',
              fields: {
                'Name': 'Belevue Heritage',
                'area': 'Kuta',
                'Land size': 'Land size 120 m²',
                'Building size': 'Building size 200 m²',
                'Number of rooms': 2,
                'Selling price': '242,704USD',
                'Description': 'Modern villa with pool',
                'Image': [
                  {
                    url: `${config.baseUrl}/images/property-2.jpg?v=${Date.now()}`
                  }
                ]
              }
            }
          ];
          successTableName = testTableName;
          break;
        }
        continue;
      }
    }
    
    if (successTableName) {
      console.log(`✓ Successfully connected to table: "${successTableName}"`);
      console.log(`Found ${records.length} properties`);
      if (records.length > 0) {
        console.log('Sample property:', records[0].fields);
      }
    } else {
      console.log('✗ Could not connect to any table');
    }
    
    return records;
  } catch (error) {
    console.error('Error fetching properties from Airtable:', error);
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error
    });
    return [];
  }
}

// 物件データからFlex Messageを作成
function createPropertyFlexMessage(property) {
  const fields = property.fields;
  
  // 画像URLの取得（複数の可能性を考慮）
  let imageUrl = `${config.baseUrl}/images/no-image.jpg`;
  
  if (fields.Image && fields.Image.length > 0) {
    // Airtableの画像形式
    imageUrl = fields.Image[0].url;
  } else if (fields.image && fields.image.length > 0) {
    // 小文字の場合
    imageUrl = fields.image[0].url;
  } else if (fields.Images && fields.Images.length > 0) {
    // 複数形の場合
    imageUrl = fields.Images[0].url;
  }
  
  console.log(`Using image URL: ${imageUrl}`);
  
  return {
    type: 'bubble',
    hero: {
      type: 'image',
      url: imageUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: fields.Name || '物件名未設定',
          weight: 'bold',
          size: 'xl',
          color: '#1DB446'
        },
        {
          type: 'text',
          text: Array.isArray(fields.area) ? fields.area.join(', ') : fields.area || 'エリア不明',
          size: 'sm',
          color: '#666666',
          margin: 'md'
        },
        {
          type: 'separator',
          margin: 'md'
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'md',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '土地面積',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 2
                },
                {
                  type: 'text',
                  text: fields['Land size'] || '未設定',
                  wrap: true,
                  color: '#666666',
                  size: 'sm',
                  flex: 3
                }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '建物面積',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 2
                },
                {
                  type: 'text',
                  text: fields['Building size'] || '未設定',
                  wrap: true,
                  color: '#666666',
                  size: 'sm',
                  flex: 3
                }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '部屋数',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 2
                },
                {
                  type: 'text',
                  text: fields['Number of rooms']?.toString() || '未設定',
                  wrap: true,
                  color: '#666666',
                  size: 'sm',
                  flex: 3
                }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '価格',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 2
                },
                {
                  type: 'text',
                  text: fields['Selling price'] || '未設定',
                  wrap: true,
                  color: '#1DB446',
                  size: 'sm',
                  flex: 3,
                  weight: 'bold'
                }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: 'リビング',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 2
                },
                {
                  type: 'text',
                  text: fields['Living room'] || '未設定',
                  wrap: true,
                  color: '#666666',
                  size: 'sm',
                  flex: 3
                }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '設備',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 2
                },
                {
                  type: 'text',
                  text: Array.isArray(fields['Facilities']) ? fields['Facilities'].join(', ') : fields['Facilities'] || '未設定',
                  wrap: true,
                  color: '#666666',
                  size: 'sm',
                  flex: 3
                }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '利回り',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 2
                },
                {
                  type: 'text',
                  text: fields['Actual yield'] || '未設定',
                  wrap: true,
                  color: '#FF6B35',
                  size: 'sm',
                  flex: 3,
                  weight: 'bold'
                }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '説明',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 2
                },
                {
                  type: 'text',
                  text: fields['Description'] || '詳細はお問い合わせください',
                  wrap: true,
                  color: '#666666',
                  size: 'xs',
                  flex: 3
                }
              ]
            }
          ]
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#1DB446',
          action: {
            type: 'uri',
            label: 'お問い合わせ',
            uri: config.googleFormUrl
          }
        }
      ]
    }
  };
}

async function createPropertyDetailMessage(area) {
  try {
    const properties = await getPropertiesFromAirtable(area);
    
    if (properties.length === 0) {
      return {
        type: 'text',
        text: `${area}エリアの物件情報が見つかりませんでした。\n\n※他のエリアもご確認ください。`
      };
    }
    
    // 物件が1件の場合は単一のバブル、複数の場合はカルーセル
    if (properties.length === 1) {
      return {
        type: 'flex',
        altText: `${area}エリアの物件情報`,
        contents: createPropertyFlexMessage(properties[0])
      };
    } else {
      return {
        type: 'flex',
        altText: `${area}エリアの物件情報`,
        contents: {
          type: 'carousel',
          contents: properties.map(property => createPropertyFlexMessage(property))
        }
      };
    }
  } catch (error) {
    console.error('Error creating property detail message:', error);
    return {
      type: 'text',
      text: `申し訳ございません。${area}エリアの物件情報の取得中にエラーが発生しました。\n\n※しばらくしてからもう一度お試しください。`
    };
  }
}

// サーバー起動
app.listen(config.port, () => {
  console.log(`LINE Bot server is running on port ${config.port}`);
  console.log('Webhook URL: https://your-domain.com/webhook');
});

// ヘルスチェックエンドポイント
app.get('/', (req, res) => {
  res.send('LINE Bot is running!');
});
