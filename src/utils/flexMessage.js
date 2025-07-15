// Flex Message templates and helper functions

/**
 * Create a basic bubble flex message
 * @param {string} title - The title text
 * @param {string} body - The body text
 * @param {Array} actions - Array of action objects
 * @returns {Object} Flex message object
 */
function createBubbleMessage(title, body, actions = []) {
  return {
    type: 'flex',
    altText: title || 'Flex Message',
    contents: {
      type: 'bubble',
      header: title ? {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: title,
            weight: 'bold',
            size: 'xl',
            wrap: true
          }
        ]
      } : undefined,
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: body,
            wrap: true
          }
        ]
      },
      footer: actions.length > 0 ? {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: actions.map(action => createButton(action))
      } : undefined
    }
  };
}

/**
 * Create a carousel flex message
 * @param {string} altText - Alternative text
 * @param {Array} bubbles - Array of bubble objects
 * @returns {Object} Flex message object
 */
function createCarouselMessage(altText, bubbles) {
  return {
    type: 'flex',
    altText: altText || 'Carousel',
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
}

/**
 * Create a button component
 * @param {Object} action - Action object with label and data
 * @returns {Object} Button component
 */
function createButton(action) {
  return {
    type: 'button',
    style: action.style || 'primary',
    height: 'sm',
    action: {
      type: action.type || 'postback',
      label: action.label,
      data: action.data,
      displayText: action.displayText
    }
  };
}

/**
 * Create a product card bubble
 * @param {Object} product - Product information
 * @returns {Object} Bubble object
 */
function createProductCard(product) {
  return {
    type: 'bubble',
    hero: product.imageUrl ? {
      type: 'image',
      url: product.imageUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover'
    } : undefined,
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: product.name,
          weight: 'bold',
          size: 'xl',
          wrap: true
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: 'Price',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 1
                },
                {
                  type: 'text',
                  text: product.price,
                  wrap: true,
                  color: '#666666',
                  size: 'sm',
                  flex: 5
                }
              ]
            },
            product.description ? {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: 'Description',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 1
                },
                {
                  type: 'text',
                  text: product.description,
                  wrap: true,
                  color: '#666666',
                  size: 'sm',
                  flex: 5
                }
              ]
            } : undefined
          ].filter(Boolean)
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: product.actions ? product.actions.map(createButton) : []
    }
  };
}

/**
 * Create a confirmation flex message
 * @param {string} title - Confirmation title
 * @param {string} message - Confirmation message
 * @param {Object} confirmAction - Confirm button action
 * @param {Object} cancelAction - Cancel button action
 * @returns {Object} Flex message object
 */
function createConfirmationMessage(title, message, confirmAction, cancelAction) {
  return {
    type: 'flex',
    altText: title || 'Confirmation',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: title,
            weight: 'bold',
            size: 'lg',
            wrap: true
          },
          {
            type: 'text',
            text: message,
            wrap: true,
            color: '#666666'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: cancelAction.label || 'Cancel',
              data: cancelAction.data,
              displayText: cancelAction.displayText
            }
          },
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'postback',
              label: confirmAction.label || 'Confirm',
              data: confirmAction.data,
              displayText: confirmAction.displayText
            }
          }
        ]
      }
    }
  };
}

/**
 * Create a receipt flex message
 * @param {Object} receipt - Receipt information
 * @returns {Object} Flex message object
 */
function createReceiptMessage(receipt) {
  const items = receipt.items.map(item => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: item.name,
        size: 'sm',
        color: '#555555',
        flex: 3
      },
      {
        type: 'text',
        text: item.price,
        size: 'sm',
        color: '#111111',
        align: 'end',
        flex: 1
      }
    ]
  }));

  return {
    type: 'flex',
    altText: 'Receipt',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'RECEIPT',
            weight: 'bold',
            color: '#1DB446',
            size: 'sm'
          },
          {
            type: 'text',
            text: receipt.storeName,
            weight: 'bold',
            size: 'xxl',
            margin: 'md'
          },
          {
            type: 'text',
            text: receipt.orderNumber,
            size: 'xs',
            color: '#aaaaaa',
            wrap: true
          },
          {
            type: 'separator',
            margin: 'xxl'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xxl',
            spacing: 'sm',
            contents: items
          },
          {
            type: 'separator',
            margin: 'xxl'
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'xxl',
            contents: [
              {
                type: 'text',
                text: 'TOTAL',
                size: 'sm',
                color: '#555555'
              },
              {
                type: 'text',
                text: receipt.total,
                size: 'sm',
                color: '#111111',
                align: 'end'
              }
            ]
          }
        ]
      }
    }
  };
}

module.exports = {
  createBubbleMessage,
  createCarouselMessage,
  createProductCard,
  createConfirmationMessage,
  createReceiptMessage
};