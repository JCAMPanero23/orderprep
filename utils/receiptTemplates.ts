import { Order, Customer, ReceiptTemplate } from '../types';

// 3 Friendly Receipt Templates
export const RECEIPT_TEMPLATES: ReceiptTemplate[] = [
  {
    id: 'casual-friendly',
    name: 'Casual Friendly',
    content: `Hi {customerName}! 👋

Thanks for your order today! 🙏

📦 Your Order:
{items}

💰 Total: {total} AED
✅ {paymentStatus}

Enjoy your meal! 😋
See you tomorrow! 👋`,
    isDefault: true
  },
  {
    id: 'professional-friendly',
    name: 'Professional Friendly',
    content: `Hi {customerName},

Thank you for your order! ✅

📋 Order Details:
{items}

💰 Total {paymentStatus}: {total} AED

We appreciate your business! 🙏
Have a great day!

- OrderPrep`,
    isDefault: false
  },
  {
    id: 'minimal',
    name: 'Minimal',
    content: `✅ Order Confirmed - {customerName}

{items}

Total: {total} AED ({paymentStatus})

Thanks! 😊`,
    isDefault: false
  }
];

// Generate WhatsApp receipt from order
export const generateWhatsAppReceipt = (
  order: Order,
  customer?: Customer,
  templateId: string = 'casual-friendly'
): string => {
  const template = RECEIPT_TEMPLATES.find(t => t.id === templateId) || RECEIPT_TEMPLATES[0];

  // Format items list
  const itemsList = order.items
    .map(item => `• ${item.quantity}x ${item.name} - ${item.priceAtOrder * item.quantity} AED`)
    .join('\n');

  // Payment status
  const paymentStatus = order.paymentStatus === 'paid' ? 'Paid' : 'Pending Payment';

  // Replace variables
  let message = template.content;
  message = message.replace(/{customerName}/g, order.customerName);
  message = message.replace(/{items}/g, itemsList);
  message = message.replace(/{total}/g, order.totalAmount.toString());
  message = message.replace(/{paymentStatus}/g, paymentStatus);

  return message;
};

// Generate sold-out apology message with alternative menu
export const generateSoldOutMessage = (
  order: Order,
  soldOutItems: string[],
  availableMenu: Array<{ name: string; price: number; stock: number }>
): string => {
  const customer = order.customerName;
  const itemNames = soldOutItems.join(', ');

  let message = `Hi ${customer},\n\n`;
  message += `We're sorry, but ${itemNames} ${soldOutItems.length > 1 ? 'are' : 'is'} sold out today. 😔\n\n`;
  message += `Here's what we still have available:\n`;
  message += `📋 Today's Menu:\n`;

  availableMenu.forEach(item => {
    message += `• ${item.name} (${item.stock} left) - ${item.price} AED\n`;
  });

  message += `\nWould you like to change your order? Reply with your choice! 🙏`;

  return message;
};
