require('dotenv').config();

module.exports = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  port: process.env.PORT || 3000,
  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID
  },
  googleFormUrl: process.env.GOOGLE_FORM_URL,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`
};