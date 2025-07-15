const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const config = require('./config');
const path = require('path');

const app = express();

// 静的ファイル（画像など）を提供
app.use('/images', express.static(path.join(__dirname, 'public/images')));

const lineConfig = {
  channelAccessToken: config.channelAccessToken,
  channelSecret: config.channelSecret
};

const client = new Client(lineConfig);

// リッチメニューのアクションを定義
const RICH_MENU_ACTIONS = {
  BALI_INFO: 'バリ島紹介',
  PROPERTY_LIST: '不動産一覧',
  RENTAL_SERVICE: '投資案件',
  INSPECTION_BOOKING: '視察予約',
  PARTNER_COMPANIES: '提携先企業',
  COMPANY_INFO: '会社概要'
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
  
  // リッチメニューからのテキストメッセージを処理
  let replyMessage;
  
  // メッセージの内容をチェック（部分一致にも対応）
  if (userMessage.includes('バリ島') || userMessage.includes('パリ島')) {
    replyMessage = createBaliInfoMessage();
  } else if (userMessage.includes('不動産')) {
    replyMessage = createPropertyListMessage();
  } else if (userMessage.includes('投資')) {
    replyMessage = createRentalServiceMessage();
  } else if (userMessage.includes('視察') || userMessage.includes('予約')) {
    replyMessage = createInspectionBookingMessage();
  } else if (userMessage.includes('提携') || userMessage.includes('企業')) {
    replyMessage = createPartnerCompaniesMessage();
  } else if (userMessage.includes('会社') || userMessage.includes('概要')) {
    replyMessage = createCompanyInfoMessage();
  } else {
    replyMessage = {
      type: 'text',
      text: `メッセージを受信しました: ${userMessage}`
    };
  }
  
  await client.replyMessage(replyToken, replyMessage);
}

// ポストバックイベントの処理
async function handlePostback(event) {
  const { replyToken, postback } = event;
  const data = postback.data;
  
  let replyMessage;
  
  switch (data) {
    case RICH_MENU_ACTIONS.BALI_INFO:
      replyMessage = createBaliInfoMessage();
      break;
      
    case RICH_MENU_ACTIONS.PROPERTY_LIST:
      replyMessage = createPropertyListMessage();
      break;
      
    case RICH_MENU_ACTIONS.RENTAL_SERVICE:
      replyMessage = createRentalServiceMessage();
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
      
    default:
      // 地域選択などの追加データ処理
      if (data.startsWith('area=')) {
        const area = data.split('=')[1];
        replyMessage = await createPropertyDetailMessage(area);
      } else {
        replyMessage = {
          type: 'text',
          text: '申し訳ございません。リクエストを処理できませんでした。'
        };
      }
  }
  
  await client.replyMessage(replyToken, replyMessage);
}

// バリ島情報のメッセージ作成
function createBaliInfoMessage() {
  return {
    type: 'flex',
    altText: 'バリ島の紹介',
    contents: {
      type: 'bubble',
      hero: {
        type: 'image',
        url: `${config.baseUrl}/images/bali-hero.jpg`,
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
            text: 'バリ島へようこそ',
            weight: 'bold',
            size: 'xl'
          },
          {
            type: 'text',
            text: 'インドネシアの楽園、バリ島は美しいビーチ、豊かな文化、そして素晴らしい投資機会で知られています。',
            wrap: true,
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'text',
            text: '主な魅力:',
            weight: 'bold',
            margin: 'lg'
          },
          {
            type: 'text',
            text: '• 年間を通じて温暖な気候\n• 国際的な観光地\n• 成長する不動産市場\n• 豊かな文化と伝統',
            wrap: true,
            margin: 'sm'
          }
        ]
      }
    }
  };
}

// 不動産一覧のメッセージ作成
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
            size: 'xl'
          },
          {
            type: 'text',
            text: 'ご希望のエリアをお選びください',
            margin: 'md'
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
            action: {
              type: 'postback',
              label: 'セミニャック',
              data: 'area=seminyak'
            }
          },
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: 'ヌサドゥア',
              data: 'area=nusadua'
            }
          },
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: 'ウブド',
              data: 'area=ubud'
            }
          },
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: 'チャングー',
              data: 'area=canggu'
            }
          }
        ]
      }
    }
  };
}

// 投資案件のメッセージ作成（車・バイクのレンタル）
function createRentalServiceMessage() {
  return {
    type: 'flex',
    altText: '投資案件',
    contents: {
      type: 'carousel',
      contents: [
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/bike-rental.jpg`,
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
                text: 'バイクレンタル',
                weight: 'bold',
                size: 'xl'
              },
              {
                type: 'text',
                text: 'バリ島を自由に探索',
                margin: 'md'
              },
              {
                type: 'separator',
                margin: 'lg'
              },
              {
                type: 'text',
                text: '料金: 50万ルピア/日〜',
                margin: 'lg'
              },
              {
                type: 'text',
                text: '• 125cc〜250ccバイク\n• ヘルメット付き\n• 24時間サポート',
                wrap: true,
                margin: 'sm'
              }
            ]
          }
        },
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/car-rental.jpg`,
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
                text: 'カーレンタル',
                weight: 'bold',
                size: 'xl'
              },
              {
                type: 'text',
                text: '快適な移動手段',
                margin: 'md'
              },
              {
                type: 'separator',
                margin: 'lg'
              },
              {
                type: 'text',
                text: '料金: 80万ルピア/日〜',
                margin: 'lg'
              },
              {
                type: 'text',
                text: '• エアコン完備\n• ドライバー付きオプション\n• 保険込み',
                wrap: true,
                margin: 'sm'
              }
            ]
          }
        }
      ]
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

// 提携先企業のメッセージ作成
function createPartnerCompaniesMessage() {
  return {
    type: 'flex',
    altText: '提携先企業',
    contents: {
      type: 'carousel',
      contents: [
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/bank-mandiri.jpg`,
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
                text: 'Bank Mandiri',
                weight: 'bold',
                size: 'xl',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: 'インドネシア最大の国営商業銀行',
                wrap: true,
                margin: 'md',
                size: 'sm',
                color: '#666666'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '個人・法人向けともに広範なサービスを提供。ATMネットワークは国内最多で、クレジットカード発行やオンラインバンキングも充実しており、利便性が非常に高いです。',
                wrap: true,
                margin: 'md',
                size: 'sm'
              }
            ]
          }
        },
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/bank-bri.jpg`,
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
                text: 'BRI',
                weight: 'bold',
                size: 'xl',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: 'Bank Rakyat Indonesia',
                wrap: true,
                margin: 'md',
                size: 'sm',
                color: '#666666'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '零細企業支援に特化し、地方農村部への融資が強み。マイクロファイナンスに定評があり、地方市場で圧倒的な存在感を放つ銀行です。',
                wrap: true,
                margin: 'md',
                size: 'sm'
              }
            ]
          }
        },
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/bank-bni.jpg`,
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
                text: 'BNI',
                weight: 'bold',
                size: 'xl',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: 'Bank Negara Indonesia',
                wrap: true,
                margin: 'md',
                size: 'sm',
                color: '#666666'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '主に法人・貿易商社向けの金融を得意とし、輸出入取引や為替サービスが充実。特に海外展開支援に強く、国際業務に精通した企業向けの選択肢として有望です。',
                wrap: true,
                margin: 'md',
                size: 'sm'
              }
            ]
          }
        },
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/bank-btn.jpg`,
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
                text: 'BTN',
                weight: 'bold',
                size: 'xl',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: 'Bank Tabungan Negara',
                wrap: true,
                margin: 'md',
                size: 'sm',
                color: '#666666'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '住宅ローンにフォーカスした政府系銀行。不動産購入支援に優れており、住宅ローンの手続きや金利面でも配慮された設計となっています。住宅関連の投資やプロジェクトに関与する際には有力な選択肢です。',
                wrap: true,
                margin: 'md',
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
                text: '💼 その他のサービス',
                weight: 'bold',
                size: 'xl',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: '金融機関以外のサポート',
                wrap: true,
                margin: 'md',
                size: 'sm',
                color: '#666666'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '• 法律事務所\n• 不動産管理会社\n• 建設会社\n• 会計事務所\n• 投資コンサルティング',
                wrap: true,
                margin: 'md',
                size: 'sm'
              },
              {
                type: 'separator',
                margin: 'lg'
              },
              {
                type: 'text',
                text: '詳細はお問い合わせください',
                wrap: true,
                margin: 'md',
                size: 'xs',
                color: '#999999',
                align: 'center'
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
    altText: '会社概要 - Ciputra',
    contents: {
      type: 'carousel',
      contents: [
        {
          type: 'bubble',
          hero: {
            type: 'image',
            url: `${config.baseUrl}/images/ciputra.png`,
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
                text: '🏢 企業概要',
                weight: 'bold',
                size: 'xl',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: 'Ciputra Development',
                weight: 'bold',
                margin: 'md',
                size: 'lg'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '• 設立：1981年（創業者Ir. Ciputra）\n• 1994年にジャカルタ証券取引所上場\n• 事業領域：住宅、商業施設、オフィス、ホテル、ヘルスケアほか',
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
                text: '🏆 受賞歴',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '「Indonesia\'s Best Real Estate Developer」\n（Euromoney, 2024）など多数受賞',
                wrap: true,
                margin: 'sm',
                size: 'sm',
                color: '#666666'
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
                text: '🌍 強み・特色',
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
                text: '1. 豊富な開発実績',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: 'インドネシア国内33都市で76以上のプロジェクト（マンション、モール、病院等）',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '2. 巨大な資産規模と安定性',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '土地開発ストック7,000ha超、2024年収益は約625 MUSD、純利益約2.1 TIDR',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '3. 高評価のブランド力',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '海岸リゾート、住宅街から商業拠点まで幅広く、品質と信頼を兼備',
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
                text: '🌴 バリ島開発',
                weight: 'bold',
                size: 'xl',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: 'Ciputra Beach Resort',
                weight: 'bold',
                margin: 'md',
                size: 'lg'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '📍 立地・規模',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: 'バリ島タバナン地区の海岸沿い80ha・海岸線1.7km',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '🏖️ コンセプト',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '「luxury beachfront residences」＋持続可能な生活コミュニティ',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '🏨 施設構成',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '225邸のヴィラ、クラブハウス、プール、フィットネス、森林デッキなどを完備',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '⭐ パートナー運営',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '5つ星ホテル運営者（Rosewood）による第一フェーズが36haで展開中',
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
                text: '🤝 提携メリット',
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
                text: '✨ ブランドシナジー',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: 'シプトラ独自のプレミアムブランドと提携提案により安心・信頼性を確保',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '🏗️ プロジェクトの巨大規模',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '80ha級の海岸沿い大規模開発は他に類を見ず、差別化要素に',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '💼 運営ノウハウと供給力',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: 'Rosewood等運営と、ヴィラからアパートメントまで柔軟な供給形式あり',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '🛡️ 法務・行政リスクが小さい',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '上場企業としての透明性と政府との繋がりで信頼性が高い',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              }
            ]
          }
        }
      ]
    }
  };
}

// 地域別不動産詳細（Airtable連携予定）
async function createPropertyDetailMessage(area) {
  // TODO: Airtable APIと連携して実際のデータを取得
  return {
    type: 'text',
    text: `${area}エリアの物件情報を取得中です。\n\n※現在、データベースとの連携を準備中です。`
  };
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