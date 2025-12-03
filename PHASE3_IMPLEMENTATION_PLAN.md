# Phase 3: Order Workflow Enhancements - Implementation Plan

**Date Created**: December 4, 2025
**Branch**: `phase3-order-workflow-enhancements`
**Estimated Time**: 8-12 hours
**Priority**: High (Core business workflow)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [New Order Workflow](#new-order-workflow)
3. [Feature Breakdown](#feature-breakdown)
4. [Implementation Tasks](#implementation-tasks)
5. [Files to Modify](#files-to-modify)
6. [Testing Checklist](#testing-checklist)

---

## Overview

### Current State
- Orders have basic status tracking
- No reserved/preparation stage
- Manual payment tracking
- No WhatsApp automation

### Target State
- **4-stage order workflow**: New → Reserved → Completed → Paid
- **Reserved Tickets section** in Orders tab
- **Auto-move to Payment** tab when completed
- **WhatsApp receipt generation** on payment
- **WhatsApp order parser** with manual assist
- **Sold-out cancellation** workflow with apology + alternative menu

---

## New Order Workflow

### Stage 1: New Orders
**Status**: `'new'`
**Location**: Orders Tab - "New Orders" section
**Actions Available**:
- ✅ Mark as Reserved (moves to Reserved section)
- ✅ Cancel Order
- ✅ Edit Order Details

### Stage 2: Reserved Orders (NEW)
**Status**: `'reserved'`
**Location**: Orders Tab - "Reserved Tickets" section (NEW SECTION)
**Purpose**: Orders being prepared in kitchen
**Actions Available**:
- ✅ Mark as Completed (moves to Payment Tab)
- ✅ Cancel/Correct Order (sold out items)
- ✅ View Order Details

**Sold-Out Cancellation Flow**:
1. Click "Cancel/Correct" on reserved order
2. Modal opens with:
   - Reason: "Sold Out" (default selected)
   - Sold-out item(s) checkboxes
   - Apology message template (editable)
   - "Today's Available Menu" display
   - Copy to WhatsApp button
3. Generate message:
   ```
   Hi [Customer Name],

   We're sorry, but [Item Name] is sold out today. 😔

   Here's what we still have available:
   📋 Today's Menu:
   • Roast Pork w/ Mushroom Gravy (5 left) - 15 AED
   • Honey Pork Ribs (8 left) - 15 AED
   • Chicken & Broccoli Stir Fry (12 left) - 15 AED
   • Milk Chocolate Brownies (6 left) - 10 AED

   Would you like to change your order? Reply with your choice! 🙏
   ```
4. Copy to clipboard + open WhatsApp
5. Order status changes to 'cancelled' with reason

### Stage 3: Completed Orders
**Status**: `'completed'`
**Location**: Payment Tab (auto-moved)
**Purpose**: Food handed to customer, awaiting payment
**Actions Available**:
- ✅ Mark as Paid (generates receipt)
- ✅ Send Payment Reminder
- ✅ View Order Details

### Stage 4: Paid Orders
**Status**: `'completed'` + `paymentStatus: 'paid'`
**Location**: Payment Tab (archived/filtered)
**Actions Available**:
- ✅ View Receipt
- ✅ Resend Receipt
- ✅ View Order History

---

## Feature Breakdown

### Feature 1: Reserved Tickets Section

**UI Layout (Orders Tab)**:
```
┌─────────────────────────────────────────────────────┐
│ Orders Tab                                           │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 📋 New Orders (3)                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │ Sarah - 2x Roast Pork, 1x Brownies           │   │
│ │ 45 AED | Today 12:30 PM                       │   │
│ │ [Reserve Order] [View Details] [Cancel]      │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ 🔥 Reserved Tickets (5) ← NEW SECTION               │
│ ┌──────────────────────────────────────────────┐   │
│ │ John - 1x Honey Ribs, 2x Siomai              │   │
│ │ 45 AED | Reserved 15 mins ago                 │   │
│ │ [✓ Mark Completed] [Cancel/Correct]          │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Implementation**:
- Add `ReservedOrdersSection` component
- Filter orders by `status === 'reserved'`
- Show time since reserved
- Color-coded cards (orange/amber theme)

---

### Feature 2: Mark as Completed (Auto-move to Payment)

**Flow**:
1. User clicks "✓ Mark Completed" on reserved order
2. Confirmation modal: "Food handed to [Customer]?"
3. On confirm:
   - Update `status: 'completed'`
   - Update `completedAt: new Date().toISOString()`
   - Order disappears from Orders tab
   - Order appears in Payment tab
4. Success notification

**Store Action**:
```typescript
const markOrderCompleted = (orderId: string) => {
  updateOrder(orderId, {
    status: 'completed',
    completedAt: new Date().toISOString()
  });
};
```

---

### Feature 3: WhatsApp Receipt Generation

**Trigger**: Click "Mark as Paid" in Payment Tab

**Receipt Template**:
```
✅ Payment Received - Thank You!

📝 Order Receipt
Customer: [Name]
Order ID: #[ID]
Date: [Date]

📋 Items:
• 2x Roast Pork w/ Mushroom Gravy - 30 AED
• 1x Milk Chocolate Brownies - 10 AED

💰 Total: 40 AED
✅ Status: PAID

Thank you for your order! 🙏

---
OrderPrep by [Your Business Name]
📞 [Your Contact]
Order again: [Your WhatsApp Link]
```

**Implementation**:
```typescript
const generateWhatsAppReceipt = (order: Order): string => {
  const customer = customers.find(c => c.id === order.customerId);
  const date = new Date(order.paymentDate || order.createdAt).toLocaleDateString();

  let message = `✅ Payment Received - Thank You!\n\n`;
  message += `📝 Order Receipt\n`;
  message += `Customer: ${order.customerName}\n`;
  message += `Order ID: #${order.id.substring(0, 8)}\n`;
  message += `Date: ${date}\n\n`;

  message += `📋 Items:\n`;
  order.items.forEach(item => {
    message += `• ${item.quantity}x ${item.name} - ${item.priceAtOrder * item.quantity} AED\n`;
  });

  message += `\n💰 Total: ${order.totalAmount} AED\n`;
  message += `✅ Status: PAID\n\n`;
  message += `Thank you for your order! 🙏\n\n`;
  message += `---\n`;
  message += `OrderPrep by [Your Business Name]\n`;
  message += `📞 [Your Contact]\n`;

  return message;
};

const handleMarkAsPaid = (orderId: string) => {
  markOrderPaid(orderId);
  const order = orders.find(o => o.id === orderId);
  if (order) {
    const receipt = generateWhatsAppReceipt(order);
    navigator.clipboard.writeText(receipt);
    alert('✅ Order marked as paid!\n📋 Receipt copied to clipboard - paste in WhatsApp!');
  }
};
```

**Auto-copy to Clipboard**: Yes
**Manual WhatsApp Open**: Optional button "Open WhatsApp"

---

### Feature 4: WhatsApp Order Parser (Manual Assist Mode)

**Purpose**: Parse pasted WhatsApp messages to auto-create orders

**Example Input**:
```
Sarah
2 roast pork
1 brownie
Unit 501
```

**Parser Logic**:
```typescript
interface ParsedOrderItem {
  text: string;           // Original text
  quantity: number | null;
  menuItemId: string | null;
  menuItemName: string | null;
  confidence: 'high' | 'medium' | 'low';
  suggestions: MenuItem[]; // If uncertain
}

interface ParsedOrder {
  customerName: string | null;
  customerNameConfidence: 'high' | 'low';
  items: ParsedOrderItem[];
  unitNumber: string | null;
  notes: string[];
}

const parseWhatsAppMessage = (message: string): ParsedOrder => {
  const lines = message.split('\n').map(l => l.trim()).filter(l => l);

  // Pattern matching
  const quantityPatterns = [
    /^(\d+)x?\s+(.+)$/i,           // "2x roast pork" or "2 roast pork"
    /^(\d+)\s*-\s*(.+)$/i,          // "2 - roast pork"
    /^(.+)\s+(\d+)$/i,              // "roast pork 2"
  ];

  const unitPattern = /unit\s*#?(\d+)/i;

  // First line likely customer name
  const customerName = lines[0] || null;

  // Parse items
  const items: ParsedOrderItem[] = [];

  lines.slice(1).forEach(line => {
    // Check if unit number
    const unitMatch = line.match(unitPattern);
    if (unitMatch) return; // Skip, handled separately

    let quantity: number | null = null;
    let itemText = line;

    // Try quantity patterns
    for (const pattern of quantityPatterns) {
      const match = line.match(pattern);
      if (match) {
        quantity = parseInt(match[1]);
        itemText = match[2];
        break;
      }
    }

    // Fuzzy match menu items
    const suggestions = fuzzyMatchMenuItem(itemText);
    const bestMatch = suggestions[0];

    items.push({
      text: line,
      quantity: quantity || 1,
      menuItemId: bestMatch?.confidence === 'high' ? bestMatch.id : null,
      menuItemName: bestMatch?.name || null,
      confidence: bestMatch?.confidence || 'low',
      suggestions: suggestions
    });
  });

  return {
    customerName,
    customerNameConfidence: existingCustomer ? 'high' : 'low',
    items,
    unitNumber: extractUnitNumber(message),
    notes: []
  };
};

const fuzzyMatchMenuItem = (text: string): Array<MenuItem & {confidence: 'high' | 'medium' | 'low'}> => {
  const normalized = text.toLowerCase().trim();

  // High confidence: exact match
  const exact = menu.find(m => m.name.toLowerCase() === normalized);
  if (exact) return [{ ...exact, confidence: 'high' }];

  // Medium confidence: partial match
  const partial = menu.filter(m =>
    m.name.toLowerCase().includes(normalized) ||
    normalized.includes(m.name.toLowerCase())
  );
  if (partial.length > 0) {
    return partial.map(m => ({ ...m, confidence: 'medium' }));
  }

  // Low confidence: fuzzy match (Levenshtein distance)
  const fuzzy = menu.map(m => ({
    item: m,
    distance: levenshteinDistance(normalized, m.name.toLowerCase())
  }))
  .filter(r => r.distance < 5) // Threshold
  .sort((a, b) => a.distance - b.distance)
  .slice(0, 3)
  .map(r => ({ ...r.item, confidence: 'low' as const }));

  return fuzzy;
};
```

**Manual Assist UI**:
```
┌──────────────────────────────────────────────────────┐
│ Paste WhatsApp Message                                │
├──────────────────────────────────────────────────────┤
│ [Paste Area]                                          │
│ ┌────────────────────────────────────────────────┐  │
│ │ Sarah                                           │  │
│ │ 2 roast pork                                    │  │
│ │ 1 brownie                                       │  │
│ │ Unit 501                                        │  │
│ └────────────────────────────────────────────────┘  │
│                                                       │
│ [Parse Message]                                       │
├──────────────────────────────────────────────────────┤
│ 📋 Parsed Results (Review & Confirm)                 │
│                                                       │
│ Customer: Sarah ✅ (Found in system)                 │
│ Unit: 501 ✅                                          │
│                                                       │
│ Items:                                                │
│ ┌────────────────────────────────────────────────┐  │
│ │ 2x roast pork → ✅ Roast Pork w/ Mushroom Gravy│  │
│ │ [Quantity: 2] [Price: 15 AED]                  │  │
│ └────────────────────────────────────────────────┘  │
│                                                       │
│ ┌────────────────────────────────────────────────┐  │
│ │ 1x brownie → ⚠️ Multiple matches:               │  │
│ │ [Select Item ▼]                                 │  │
│ │ • Milk Chocolate Brownies                       │  │
│ │ • Brownies (if multiple)                        │  │
│ └────────────────────────────────────────────────┘  │
│                                                       │
│ [Cancel] [Create Order]                              │
└──────────────────────────────────────────────────────┘
```

**Features**:
- ✅ Auto-detect customer (existing customer check)
- ✅ Auto-detect quantities
- ✅ Fuzzy match menu items
- ⚠️ Flag uncertain items for manual selection
- ✅ Show confidence indicators
- ✅ Allow manual corrections before creating order

---

### Feature 5: Sold-Out Cancellation with Alternatives

**Trigger**: Click "Cancel/Correct" on reserved order

**Modal UI**:
```
┌────────────────────────────────────────────────────────┐
│ Cancel/Correct Order - Sarah (#ABC123)                 │
├────────────────────────────────────────────────────────┤
│ Reason for Cancellation:                               │
│ ⦿ Sold Out Item(s)                                     │
│ ○ Customer Request                                     │
│ ○ Other                                                │
│                                                        │
│ Which item(s) are sold out?                           │
│ ☑ Roast Pork w/ Mushroom Gravy                       │
│ ☐ Milk Chocolate Brownies                            │
│                                                        │
│ Apology Message (editable):                           │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Hi Sarah,                                         │ │
│ │                                                   │ │
│ │ We're sorry, but Roast Pork is sold out today.😔│ │
│ │                                                   │ │
│ │ Here's what we still have available:             │ │
│ │ 📋 Today's Menu:                                  │ │
│ │ • Honey Pork Ribs (8 left) - 15 AED             │ │
│ │ • Chicken & Broccoli Stir Fry (12 left) - 15 AED│ │
│ │ • Fried Pork Belly (5 left) - 15 AED            │ │
│ │ • Milk Chocolate Brownies (6 left) - 10 AED     │ │
│ │                                                   │ │
│ │ Would you like to change your order? 🙏          │ │
│ └──────────────────────────────────────────────────┘ │
│                                                        │
│ [Copy to WhatsApp] [Cancel Order] [Back]              │
└────────────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
const generateSoldOutMessage = (
  order: Order,
  soldOutItems: string[],
  availableMenu: MenuItem[]
): string => {
  const customer = order.customerName;
  const itemNames = soldOutItems.join(', ');

  let message = `Hi ${customer},\n\n`;
  message += `We're sorry, but ${itemNames} ${soldOutItems.length > 1 ? 'are' : 'is'} sold out today. 😔\n\n`;
  message += `Here's what we still have available:\n`;
  message += `📋 Today's Menu:\n`;

  availableMenu.forEach(item => {
    const remaining = getRemainingStock(item.id);
    message += `• ${item.name} (${remaining} left) - ${item.price} AED\n`;
  });

  message += `\nWould you like to change your order? Reply with your choice! 🙏`;

  return message;
};

const handleCancelCorrectOrder = (orderId: string, reason: string, soldOutItemIds: string[]) => {
  updateOrder(orderId, {
    status: 'cancelled',
    cancelReason: reason,
    cancelledAt: new Date().toISOString(),
    cancelledItems: soldOutItemIds
  });

  // Generate and copy message
  const order = orders.find(o => o.id === orderId);
  const soldOutItems = order.items
    .filter(item => soldOutItemIds.includes(item.menuItemId))
    .map(item => item.name);
  const available = menu.filter(m => m.isAvailable && m.dailyLimit > 0);

  const message = generateSoldOutMessage(order, soldOutItems, available);
  navigator.clipboard.writeText(message);

  alert('Order cancelled. Message copied to clipboard!');
};
```

---

## Implementation Tasks

### Task 1: Update Store Actions (store.tsx)
**Estimated Time**: 1 hour

- [ ] Add `markOrderReserved(orderId: string)` function
- [ ] Add `markOrderCompleted(orderId: string)` function
- [ ] Add `cancelOrderWithReason(orderId: string, reason: string, items?: string[])` function
- [ ] Update Order interface to add:
  - `reservedAt?: string`
  - `completedAt?: string`
  - `cancelledAt?: string`
  - `cancelReason?: string`
  - `cancelledItems?: string[]`

### Task 2: Reserved Tickets Section (Orders.tsx)
**Estimated Time**: 2-3 hours

- [ ] Create `ReservedOrdersSection` component
- [ ] Add section header with count badge
- [ ] Filter orders by `status === 'reserved'`
- [ ] Show "time since reserved" helper
- [ ] Add "Mark as Completed" button
- [ ] Add "Cancel/Correct" button
- [ ] Style with orange/amber theme
- [ ] Add animations for transitions

### Task 3: Mark as Completed Flow (Orders.tsx)
**Estimated Time**: 1 hour

- [ ] Create confirmation modal
- [ ] Call `markOrderCompleted()` on confirm
- [ ] Add success notification
- [ ] Test order disappears from Orders tab
- [ ] Test order appears in Payment tab

### Task 4: Update Payment Tab (Payments.tsx)
**Estimated Time**: 1 hour

- [ ] Show orders with `status === 'completed'`
- [ ] Update "Mark as Paid" button to generate receipt
- [ ] Add WhatsApp receipt generation function
- [ ] Auto-copy to clipboard
- [ ] Add "Open WhatsApp" optional button

### Task 5: WhatsApp Receipt Generation
**Estimated Time**: 1-2 hours

- [ ] Create `generateWhatsAppReceipt()` function
- [ ] Design receipt template
- [ ] Add customer info section
- [ ] Add itemized list
- [ ] Add totals and payment status
- [ ] Add branding/contact footer
- [ ] Integrate with "Mark as Paid" button
- [ ] Test copy to clipboard
- [ ] Test WhatsApp paste formatting

### Task 6: Sold-Out Cancellation Modal
**Estimated Time**: 2 hours

- [ ] Create `CancelOrderModal` component
- [ ] Add reason selection (radio buttons)
- [ ] Add sold-out items checkboxes
- [ ] Create `generateSoldOutMessage()` function
- [ ] Get available menu items with stock
- [ ] Generate editable message preview
- [ ] Add "Copy to WhatsApp" button
- [ ] Test cancellation flow

### Task 7: WhatsApp Order Parser
**Estimated Time**: 3-4 hours

- [ ] Create `PasteOrderModal` component
- [ ] Add textarea for pasting message
- [ ] Create `parseWhatsAppMessage()` function
- [ ] Implement customer name detection
- [ ] Implement quantity extraction
- [ ] Implement fuzzy item matching
- [ ] Create `fuzzyMatchMenuItem()` with Levenshtein distance
- [ ] Create manual assist UI for uncertain items
- [ ] Add confidence indicators
- [ ] Add manual selection dropdowns
- [ ] Test with various message formats
- [ ] Handle typos and variations

---

## Files to Modify

### 1. types.ts
**Changes**:
- [x] Update `OrderStatus` type
- [ ] Add cancellation fields to Order interface

### 2. store.tsx
**Changes**:
- [ ] Add `markOrderReserved()` action
- [ ] Add `markOrderCompleted()` action
- [ ] Add `cancelOrderWithReason()` action
- [ ] Update AppState interface

### 3. pages/Orders.tsx
**Major Changes**:
- [ ] Add ReservedOrdersSection component
- [ ] Add "Reserve Order" button to new orders
- [ ] Add "Mark Completed" button to reserved orders
- [ ] Add "Cancel/Correct" button to reserved orders
- [ ] Create CancelOrderModal component
- [ ] Create PasteOrderModal component
- [ ] Add "Paste WhatsApp Order" button
- [ ] Reorganize layout to show both sections

### 4. pages/Payments.tsx
**Changes**:
- [ ] Filter to show `status === 'completed'` orders
- [ ] Update "Mark as Paid" to generate receipt
- [ ] Add `generateWhatsAppReceipt()` function
- [ ] Add clipboard copy functionality
- [ ] Add success notification

### 5. New Utility File: utils/orderParser.ts (Optional)
**Purpose**: Separate parser logic
- [ ] `parseWhatsAppMessage()`
- [ ] `fuzzyMatchMenuItem()`
- [ ] `levenshteinDistance()`
- [ ] `extractCustomerName()`
- [ ] `extractQuantity()`
- [ ] `extractUnitNumber()`

---

## Testing Checklist

### Reserved Tickets Flow
- [ ] Create new order → appears in "New Orders"
- [ ] Click "Reserve Order" → moves to "Reserved Tickets"
- [ ] Reserved section shows order count badge
- [ ] Time since reserved displays correctly
- [ ] Click "Mark Completed" → order disappears
- [ ] Order appears in Payment Tab
- [ ] Completed timestamp recorded

### Sold-Out Cancellation
- [ ] Open "Cancel/Correct" modal from reserved order
- [ ] Select "Sold Out" reason
- [ ] Check sold-out items
- [ ] Message generates with correct items
- [ ] Available menu shows current stock
- [ ] Message editable before copy
- [ ] Copy to clipboard works
- [ ] Order status changes to 'cancelled'
- [ ] Cancellation reason saved

### WhatsApp Receipt
- [ ] Mark order as paid in Payment Tab
- [ ] Receipt generates with all fields
- [ ] Customer name correct
- [ ] Items list formatted correctly
- [ ] Totals calculated correctly
- [ ] Receipt copied to clipboard automatically
- [ ] Success notification shows
- [ ] Can paste receipt in WhatsApp
- [ ] Receipt formatting looks good in WhatsApp

### WhatsApp Order Parser
- [ ] Paste simple message format
- [ ] Customer name detected
- [ ] Quantities extracted correctly
- [ ] Items matched with high confidence
- [ ] Uncertain items flagged
- [ ] Manual selection dropdown works
- [ ] Can edit quantities before creating
- [ ] Order creates successfully
- [ ] Test with typos (e.g., "rost pork", "browneis")
- [ ] Test with variations (e.g., "2x", "2 -", "x2")
- [ ] Test with missing customer name
- [ ] Test with unit number extraction

### Edge Cases
- [ ] Empty reserved section displays correctly
- [ ] All items sold out in cancellation
- [ ] Parser handles empty paste
- [ ] Parser handles non-order text
- [ ] Receipt handles long item names
- [ ] Receipt handles multiple pages (many items)
- [ ] Concurrent status updates handled
- [ ] Network error during clipboard copy

---

## UI Mockups

### Orders Tab Layout
```
┌────────────────────────────────────────────────────────┐
│ 📱 Orders                                [+ New Order]  │
├────────────────────────────────────────────────────────┤
│ [Paste WhatsApp Order]                                 │
│                                                        │
│ 📋 New Orders (3)                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Sarah - 501                          45 AED       │ │
│ │ 2x Roast Pork, 1x Brownies                       │ │
│ │ Today 12:30 PM                                    │ │
│ │ [Reserve] [Details] [✕]                          │ │
│ └──────────────────────────────────────────────────┘ │
│                                                        │
│ 🔥 Reserved Tickets (5) ⏱ Being Prepared              │
│ ┌──────────────────────────────────────────────────┐ │
│ │ John - Reception                     45 AED       │ │
│ │ 1x Honey Ribs, 2x Siomai                         │ │
│ │ Reserved 15m ago                                  │ │
│ │ [✓ Completed] [Cancel/Correct]                   │ │
│ └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## Success Criteria

### Minimum Viable Implementation
- [ ] Reserved section functional
- [ ] Mark as completed moves to Payment
- [ ] WhatsApp receipt generation works
- [ ] Basic order parser (simple format only)
- [ ] Sold-out cancellation with message

### Full Implementation
- [ ] All features above
- [ ] Advanced parser with fuzzy matching
- [ ] Manual assist UI polished
- [ ] All edge cases handled
- [ ] Mobile-optimized UI
- [ ] Animations smooth
- [ ] Zero console errors
- [ ] TypeScript compilation clean

---

## Next Steps for Development Session

1. **Review this plan** with user
2. **Prioritize features** if time-constrained
3. **Start with Task 1** (Store actions) - foundation
4. **Build Task 2** (Reserved section) - core UI
5. **Test incrementally** after each task
6. **Commit frequently** with clear messages
7. **Update this plan** as implementation progresses

---

## Notes

- **Estimated Total Time**: 8-12 hours
- **Complexity**: Medium-High (multiple interconnected features)
- **Dependencies**: Types → Store → UI components
- **Risk Areas**:
  - WhatsApp parser complexity
  - Order state synchronization
  - Mobile clipboard API compatibility
- **Testing Priority**: Reserved flow > Receipt > Parser

---

**Document Version**: 1.0
**Last Updated**: December 4, 2025
**Status**: Ready for Implementation
**Branch**: `phase3-order-workflow-enhancements`
