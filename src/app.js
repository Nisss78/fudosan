const express = require('express');
const line = require('@line/bot-sdk');
const config = require('./config');
const MessageService = require('./services/messageService');

// Create LINE client
const client = new line.Client({
  channelAccessToken: config.line.channelAccessToken,
  channelSecret: config.line.channelSecret
});

// Create Express app
const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.server.env
  });
});

// Setup webhook endpoint with LINE middleware
app.post('/webhook', line.middleware({
  channelSecret: config.line.channelSecret
}), (req, res) => {
  // req.body.events should be an array of events
  if (!Array.isArray(req.body.events)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Process all events
  Promise.all(req.body.events.map(handleEvent))
    .then((results) => {
      res.json({ status: 'ok', results });
    })
    .catch((err) => {
      console.error('Error processing events:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Event handler function
async function handleEvent(event) {
  console.log(`Received event: ${event.type}`);

  // Handle different event types
  switch (event.type) {
    case 'message':
      return handleMessageEvent(event);
    case 'postback':
      return handlePostbackEvent(event);
    case 'follow':
      return handleFollowEvent(event);
    case 'unfollow':
      console.log(`User ${event.source.userId} unfollowed`);
      return null;
    default:
      console.log(`Unhandled event type: ${event.type}`);
      return null;
  }
}

// Handle message events
async function handleMessageEvent(event) {
  // Only handle text messages for now
  if (event.message.type !== 'text') {
    return null;
  }

  // Use MessageService to process the text and get appropriate response
  const replyMessage = MessageService.processTextMessage(
    event.message.text,
    event.source.userId
  );

  return client.replyMessage(event.replyToken, replyMessage);
}

// Handle postback events (from rich menu, buttons, etc.)
async function handlePostbackEvent(event) {
  const data = event.postback.data;
  console.log(`Received postback data: ${data}`);

  // Use MessageService to process postback action
  const replyMessage = MessageService.processPostbackAction(data);

  return client.replyMessage(event.replyToken, replyMessage);
}

// Handle follow events (when user adds the bot)
async function handleFollowEvent(event) {
  const welcomeMessage = {
    type: 'text',
    text: 'Thank you for adding me! I am your LINE Bot assistant. How can I help you today?'
  };

  return client.replyMessage(event.replyToken, welcomeMessage);
}

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof line.SignatureValidationFailed) {
    res.status(401).send('Signature validation failed');
    return;
  } else if (err instanceof line.JSONParseError) {
    res.status(400).send('Invalid JSON');
    return;
  }
  
  console.error('Unexpected error:', err);
  res.status(500).send('Internal server error');
});

module.exports = { app, client };