const flexMessage = require('../utils/flexMessage');

/**
 * Example service showing how to use Flex Messages in response to user commands
 */
class MessageService {
  /**
   * Process user text and return appropriate response
   * @param {string} text - User input text
   * @param {string} userId - LINE user ID
   * @returns {Object|Array} Message object(s) to send
   */
  static processTextMessage(text, userId) {
    const lowerText = text.toLowerCase();

    // Example command handling
    if (lowerText === 'help' || lowerText === 'ヘルプ') {
      return this.getHelpMessage();
    } else if (lowerText === 'menu' || lowerText === 'メニュー') {
      return this.getMenuMessage();
    } else if (lowerText.includes('product') || lowerText.includes('商品')) {
      return this.getProductsMessage();
    } else if (lowerText === 'receipt' || lowerText === 'レシート') {
      return this.getSampleReceipt();
    } else {
      // Default echo response
      return {
        type: 'text',
        text: `You said: ${text}`
      };
    }
  }

  /**
   * Get help message using Flex Message
   */
  static getHelpMessage() {
    return flexMessage.createBubbleMessage(
      'Help Menu',
      'Here are the available commands:\n\n• help - Show this help menu\n• menu - Show main menu\n• product - Show product catalog\n• receipt - Show sample receipt',
      [
        {
          label: 'Main Menu',
          data: 'action=menu',
          displayText: 'menu'
        },
        {
          label: 'Products',
          data: 'action=products',
          displayText: 'product'
        }
      ]
    );
  }

  /**
   * Get menu message
   */
  static getMenuMessage() {
    return flexMessage.createBubbleMessage(
      'Main Menu',
      'What would you like to do today?',
      [
        {
          label: 'View Products',
          data: 'action=products',
          style: 'primary'
        },
        {
          label: 'Check Order',
          data: 'action=order_status',
          style: 'primary'
        },
        {
          label: 'Contact Support',
          data: 'action=support',
          style: 'secondary'
        }
      ]
    );
  }

  /**
   * Get sample products carousel
   */
  static getProductsMessage() {
    const products = [
      {
        name: 'Product A',
        price: '$29.99',
        description: 'High quality product',
        imageUrl: 'https://via.placeholder.com/300x200',
        actions: [
          {
            label: 'Buy Now',
            data: 'action=buy&product=a'
          },
          {
            label: 'Details',
            data: 'action=detail&product=a',
            style: 'secondary'
          }
        ]
      },
      {
        name: 'Product B',
        price: '$39.99',
        description: 'Premium product',
        imageUrl: 'https://via.placeholder.com/300x200',
        actions: [
          {
            label: 'Buy Now',
            data: 'action=buy&product=b'
          },
          {
            label: 'Details',
            data: 'action=detail&product=b',
            style: 'secondary'
          }
        ]
      },
      {
        name: 'Product C',
        price: '$19.99',
        description: 'Budget friendly option',
        imageUrl: 'https://via.placeholder.com/300x200',
        actions: [
          {
            label: 'Buy Now',
            data: 'action=buy&product=c'
          },
          {
            label: 'Details',
            data: 'action=detail&product=c',
            style: 'secondary'
          }
        ]
      }
    ];

    const bubbles = products.map(product => flexMessage.createProductCard(product));
    return flexMessage.createCarouselMessage('Product Catalog', bubbles);
  }

  /**
   * Get sample receipt
   */
  static getSampleReceipt() {
    return flexMessage.createReceiptMessage({
      storeName: 'LINE Bot Store',
      orderNumber: 'Order #123456',
      items: [
        { name: 'Product A', price: '$29.99' },
        { name: 'Product B', price: '$39.99' },
        { name: 'Shipping', price: '$5.00' }
      ],
      total: '$74.98'
    });
  }

  /**
   * Process postback action
   * @param {string} data - Postback data string
   * @returns {Object} Message object to send
   */
  static processPostbackAction(data) {
    const params = new URLSearchParams(data);
    const action = params.get('action');
    const product = params.get('product');

    switch (action) {
      case 'menu':
        return this.getMenuMessage();
      
      case 'products':
        return this.getProductsMessage();
      
      case 'buy':
        return flexMessage.createConfirmationMessage(
          'Confirm Purchase',
          `Are you sure you want to buy Product ${product?.toUpperCase()}?`,
          {
            label: 'Yes, Buy Now',
            data: `action=confirm_buy&product=${product}`,
            displayText: 'Confirm purchase'
          },
          {
            label: 'Cancel',
            data: 'action=cancel',
            displayText: 'Cancel'
          }
        );
      
      case 'confirm_buy':
        return {
          type: 'text',
          text: `Thank you for your purchase! Product ${product?.toUpperCase()} has been ordered.`
        };
      
      case 'detail':
        return {
          type: 'text',
          text: `Showing details for Product ${product?.toUpperCase()}...`
        };
      
      case 'order_status':
        return {
          type: 'text',
          text: 'Your order #123456 is being processed and will be shipped soon!'
        };
      
      case 'support':
        return {
          type: 'text',
          text: 'Our support team is available 24/7. Please describe your issue and we will help you!'
        };
      
      case 'cancel':
        return {
          type: 'text',
          text: 'Action cancelled.'
        };
      
      default:
        return {
          type: 'text',
          text: 'Unknown action. Please try again.'
        };
    }
  }
}

module.exports = MessageService;