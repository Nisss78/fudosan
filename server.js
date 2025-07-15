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
    altText: 'バリ島の紹介 - "実利のある楽園"',
    contents: {
      type: 'carousel',
      contents: [
        {
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
                text: '約1.6兆ドル（世界16位）\n2050年予測：世界第4位（PwC・IMF）',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: 'バリ州GDP（2023年）',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '約116兆ルピア（≒約1.1兆円）',
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
    altText: '投資案件 - バイク・車レンタル事業',
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
                text: 'Yamaha NMAX バイクレンタル事業',
                weight: 'bold',
                size: 'lg',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: '10台投資案件',
                margin: 'md',
                size: 'md',
                color: '#666666'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '基本条件',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '• 台数：10台\n• 1台価格：460,000円\n• 総投資額：4,600,000円\n• レンタル単価：Rp100,000（約980円/日）\n• 稼働日数：年間240日（20日/月）',
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
                text: 'バイク事業 収益シミュレーション',
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
                text: '年間収支',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '• 年間売上：2,352,000円\n• 年間経費：1,000,000円\n  （整備・保険：500,000円）\n  （運営報酬：500,000円）\n• 年間純利益：1,352,000円',
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
                text: '投資回収と収益',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '• 投資回収年数：約3.4年\n• 10年後残存価値：1,840,000円\n• 10年間総リターン：10,763,200円\n• 年平均利回り：約23.4%',
                wrap: true,
                margin: 'sm',
                size: 'sm'
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
                text: 'アルファード HEV カーレンタル事業',
                weight: 'bold',
                size: 'lg',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: '高級車レンタル投資案件',
                margin: 'md',
                size: 'md',
                color: '#666666'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '基本条件',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '• 車両購入費：1,500万円（新車アルファード HEV）\n• 稼働日数：年間300日\n• 1日あたり貸出価格：20,000円\n• 年間売上：600万円\n• 年間経費：200万円\n• 年間純利益：400万円',
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
                text: '車事業 投資パターン①',
                weight: 'bold',
                size: 'lg',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: '1人投資家モデル',
                margin: 'md',
                size: 'md',
                color: '#666666'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '投資詳細',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '• 初期投資額：1,500万円\n• 年間純利益：400万円（すべて取得）\n• 投資回収年数：3.75年\n• 回収後の利益：2,500万円（6.25年分）\n• 10年後の売却益：600万円\n• 合計リターン：3,100万円',
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
                text: '実質年利：平均利回り 約20.7%',
                weight: 'bold',
                margin: 'md',
                size: 'md',
                color: '#1DB446'
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
                text: '車事業 投資パターン②',
                weight: 'bold',
                size: 'lg',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: '5人投資家モデル',
                margin: 'md',
                size: 'md',
                color: '#666666'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '投資詳細（1人あたり）',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '• 初期投資額：300万円\n• 出資比率：投資家グループ75%、運営者25%\n• 年間利益：60万円\n• 投資回収年数：5年\n• 回収後の利益：300万円（5年分）\n• 10年後の売却益シェア：90万円',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '合計リターン：390万円',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'text',
                text: '実質年利：平均利回り 約13%',
                weight: 'bold',
                margin: 'md',
                size: 'md',
                color: '#1DB446'
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
                text: '投資案件 比較まとめ',
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
                text: 'バイク事業（10台）',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '投資額：460万円\n年平均利回り：23.4%\n投資回収年数：3.4年',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '車事業（1人投資家）',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '投資額：1,500万円\n年平均利回り：20.7%\n投資回収年数：3.75年',
                wrap: true,
                margin: 'sm',
                size: 'sm'
              },
              {
                type: 'text',
                text: '車事業（5人投資家）',
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: '投資額：300万円/人\n年平均利回り：13%\n投資回収年数：5年',
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
                text: '詳細はお問い合わせください',
                wrap: true,
                margin: 'sm',
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
                text: '企業概要',
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
                text: '受賞歴',
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
                text: '強み・特色',
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
                text: 'バリ島開発',
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
                text: '立地・規模',
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
                text: 'コンセプト',
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
                text: '施設構成',
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
                text: 'パートナー運営',
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
                text: '提携メリット',
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
                text: 'ブランドシナジー',
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
                text: 'プロジェクトの巨大規模',
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
                text: '運営ノウハウと供給力',
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
                text: '法務・行政リスクが小さい',
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