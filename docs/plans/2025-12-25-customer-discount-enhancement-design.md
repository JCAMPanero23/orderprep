# Customer Discount Enhancement - Design Document

**Date:** 2025-12-25
**Status:** Design Complete - Ready for Implementation
**Priority:** 1 (Highest)

---

## Problem Statement

### Current Issues
1. **Bug:** Customer discount checkbox doesn't update WhatsApp modal messaging - discounted prices not shown
2. **Limited Flexibility:** Current flat "AED off per item" discount lacks granular control
3. **Poor UX:** Checkbox interface is not intuitive for applying discounts

### Business Impact
- Customers receive incorrect pricing information via WhatsApp
- Cannot apply flexible discounts (percentage or item-specific)
- Manual workarounds required, slowing down order processing

---

## Solution Overview

Replace the current customer discount checkbox with a comprehensive discount modal offering:
- **Percentage Discount:** Apply % discount to entire order total
- **Item-by-item Discount:** Set individual AED amounts per item
- **Flash Sale Integration:** Pre-fill flash sale discounts as starting point
- **Proper WhatsApp Display:** Show discounted prices correctly in receipts

---

## Design Specifications

### 1. Data Model Changes

**File:** `types.ts`

Extend the `Order` interface:

```typescript
export interface Order {
  // ... existing fields ...

  // Enhanced discount tracking
  discountType?: 'percentage' | 'item' | 'flash_sale';
  discountPercentage?: number; // If percentage discount (e.g., 10 for 10%)
  itemDiscounts?: { [itemId: string]: number }; // Item-specific discounts

  // Keep existing fields
  originalAmount?: number; // Before discount
  discountAmount?: number; // Total AED discounted
  isFlashSale?: boolean; // Keep for backward compatibility
}
```

**Field Descriptions:**
- `discountType`: Tracks which discount method was used
- `discountPercentage`: Stores percentage if that method chosen (0-100)
- `itemDiscounts`: Maps `{menuItemId: discountAmountInAED}`
- `originalAmount`: Subtotal before discount
- `discountAmount`: Total AED saved
- `isFlashSale`: Backward compatibility (legacy flash sale orders)

---

### 2. UI Component - Customer Discount Modal

**New Component:** `components/CustomerDiscountModal.tsx`

**Modal Structure:**
```
┌─────────────────────────────────────────┐
│ Apply Customer Discount            [X]  │
├─────────────────────────────────────────┤
│ [% Discount] [Item Discounts]           │
├─────────────────────────────────────────┤
│ (Tab Content)                           │
│                                         │
│ ⚠️ Will override 2 flash sale items     │
├─────────────────────────────────────────┤
│ [Cancel]              [Apply Discount]  │
└─────────────────────────────────────────┘
```

**Tab 1: Percentage Discount**
- Input field: 0-100%
- Live preview: "Original: 100 AED → Discounted: 90 AED"
- Warning badge if flash sale items in cart

**Tab 2: Item Discounts**
- List all cart items
- Each item shows:
  - Name and quantity
  - Original price (strikethrough if flash sale)
  - Discount input (AED amount)
  - Final price preview
- Running total discount at bottom
- **Pre-fill flash sale discounts:** Items on flash sale auto-populate with flash sale discount amount

**Flash Sale Override Warning:**
When discount is active:
```
⚠️ Customer discount will replace flash sale prices for affected items
```

---

### 3. Cart Calculation Logic

**File:** `pages/Orders.tsx`

**New State Variables:**
```typescript
const [discountModalOpen, setDiscountModalOpen] = useState(false);
const [discountType, setDiscountType] = useState<'percentage' | 'item' | null>(null);
const [discountPercentage, setDiscountPercentage] = useState(0);
const [itemDiscounts, setItemDiscounts] = useState<{[itemId: string]: number}>({});
```

**Calculation Flow:**

1. **Calculate Original Total:**
   ```typescript
   const originalTotal = cart.reduce((sum, c) => sum + (c.item.price * c.qty), 0);
   ```

2. **Apply Discount:**
   ```typescript
   let discountAmount = 0;

   if (discountType === 'percentage') {
     discountAmount = originalTotal * (discountPercentage / 100);
   } else if (discountType === 'item') {
     discountAmount = cart.reduce((sum, c) => {
       const itemDiscount = itemDiscounts[c.item.id] || 0;
       return sum + (itemDiscount * c.qty);
     }, 0);
   }

   const finalTotal = originalTotal - discountAmount;
   ```

3. **Calculate priceAtOrder for Each Item:**
   ```typescript
   const items = cart.map(c => {
     let priceAtOrder = c.item.price;

     if (discountType === 'percentage') {
       priceAtOrder = c.item.price * (1 - discountPercentage / 100);
     } else if (discountType === 'item') {
       const itemDiscount = itemDiscounts[c.item.id] || 0;
       priceAtOrder = c.item.price - itemDiscount;
     }

     return {
       menuItemId: c.item.id,
       name: c.item.name,
       quantity: c.qty,
       priceAtOrder: Math.max(0, priceAtOrder) // Prevent negative prices
     };
   });
   ```

**Key Rules:**
- Once customer discount is applied, flash sale prices are ignored
- Item discounts cannot exceed item price (validation)
- Discount state cleared after successful checkout

---

### 4. WhatsApp Receipt Formatting

**File:** `utils/receiptTemplates.ts`

**Function:** `generateWhatsAppReceipt()`

**Format (Option B - Simple):**

**Percentage Discount Example:**
```
📦 Your Order:
• 2x Pork Ribs - 30 AED
• 1x Siomai - 10 AED

Subtotal: 55 AED
Customer Discount (10%): -15 AED
💰 Total: 40 AED
```

**Item-by-item Discount Example:**
```
📦 Your Order:
• 2x Pork Ribs - 30 AED
• 1x Siomai - 12 AED

Subtotal: 55 AED
Customer Discount: -13 AED
💰 Total: 42 AED
```

**Implementation Logic:**
```typescript
function generateWhatsAppReceipt(order: Order, customer?: Customer, templateId?: string): string {
  let message = `Hi ${order.customerName}! 👋\n\n`;
  message += `📦 Your Order:\n`;

  // Show items at final (discounted) prices
  order.items.forEach(item => {
    const itemTotal = item.priceAtOrder * item.quantity;
    message += `• ${item.quantity}x ${item.name} - ${itemTotal} AED\n`;
  });

  // If customer discount exists, show breakdown
  if (order.discountType === 'percentage' || order.discountType === 'item') {
    message += `\nSubtotal: ${order.originalAmount} AED\n`;

    const discountLabel = order.discountType === 'percentage'
      ? `Customer Discount (${order.discountPercentage}%)`
      : 'Customer Discount';

    message += `${discountLabel}: -${order.discountAmount} AED\n`;
  }

  message += `💰 Total: ${order.totalAmount} AED\n`;

  // ... rest of receipt template

  return message;
}
```

---

### 5. Integration & Edge Cases

**UI Changes in Orders.tsx:**

Replace current checkbox (lines 584-609) with:
```tsx
{cart.length > 0 && (
  <Button
    variant="outline"
    className="mb-3 w-full bg-purple-50 border-purple-300 text-purple-900"
    onClick={() => setDiscountModalOpen(true)}
  >
    {discountType ? '✏️ Edit Discount' : '💰 Add Customer Discount'}
    {discountAmount > 0 && ` (-${discountAmount} AED)`}
  </Button>
)}
```

**Flash Sale Pre-fill Logic:**

When modal opens, check for flash sale items:
```typescript
const initializeItemDiscounts = () => {
  const prefilledDiscounts: {[itemId: string]: number} = {};

  cart.forEach(c => {
    const flashPrice = getFlashSalePrice(c.item.id);
    if (flashPrice !== null) {
      const flashDiscount = c.item.price - flashPrice;
      prefilledDiscounts[c.item.id] = flashDiscount;
    }
  });

  setItemDiscounts(prefilledDiscounts);
};
```

**State Cleanup After Checkout:**
```typescript
// Clear discount state
setDiscountType(null);
setDiscountPercentage(0);
setItemDiscounts({});
```

**Edge Cases Handled:**

1. **Discount > Item Price:**
   - Validation: `discount <= item.price`
   - Show error: "Discount cannot exceed item price"

2. **Empty Cart:**
   - Discount button only visible when `cart.length > 0`

3. **Remove Discounted Item:**
   - If item removed from cart, remove from `itemDiscounts` map
   - Recalculate total discount

4. **Zero Discount:**
   - If percentage is 0 or all item discounts are 0, treat as no discount
   - Set `discountType = null`

5. **Flash Sale Override Warning:**
   - Count items on flash sale: `cart.filter(c => getFlashSalePrice(c.item.id) !== null).length`
   - Show banner: "⚠️ Will override X flash sale items"

6. **Negative Final Price Prevention:**
   - Always use `Math.max(0, priceAfterDiscount)`

---

## Implementation Checklist

### Phase 1: Data Model (30 min)
- [ ] Update `types.ts` - add new Order fields
- [ ] Test backward compatibility with existing orders

### Phase 2: Discount Modal Component (2-3 hours)
- [ ] Create `CustomerDiscountModal.tsx`
- [ ] Build tabbed interface (percentage/item)
- [ ] Implement percentage discount tab
- [ ] Implement item-by-item discount tab with pre-fill
- [ ] Add flash sale override warning
- [ ] Add input validation

### Phase 3: Cart Integration (1-2 hours)
- [ ] Add discount state to Orders.tsx
- [ ] Replace checkbox with discount button
- [ ] Connect modal to state
- [ ] Update cart calculation logic
- [ ] Handle discount application
- [ ] Add state cleanup after checkout

### Phase 4: WhatsApp Receipt Fix (1 hour)
- [ ] Update `generateWhatsAppReceipt()` in receiptTemplates.ts
- [ ] Implement Option B format
- [ ] Test with percentage discounts
- [ ] Test with item discounts
- [ ] Test with no discount (backward compatibility)

### Phase 5: Testing (1 hour)
- [ ] Test percentage discount flow
- [ ] Test item-by-item discount flow
- [ ] Test flash sale pre-fill
- [ ] Test WhatsApp receipt formatting
- [ ] Test edge cases (negative prices, empty cart, etc.)
- [ ] Test checkout and state cleanup

**Total Estimated Time:** 5-7 hours

---

## Success Criteria

✅ **Bug Fixed:**
- WhatsApp messages show correct discounted prices
- Discount breakdown visible in receipts

✅ **Feature Complete:**
- Percentage discount works correctly
- Item-by-item discount works correctly
- Flash sale amounts pre-fill in item discount tab
- Discount modal has intuitive UI

✅ **Data Integrity:**
- Orders store discount details correctly
- Backward compatibility maintained
- No negative prices possible

✅ **User Experience:**
- Clear visual feedback on discounts
- Flash sale override warning visible
- Smooth workflow from cart → discount → checkout → WhatsApp

---

## Future Enhancements (Out of Scope)

- Save favorite discount presets per customer
- Analytics: track discount usage patterns
- Discount approval workflow for large amounts
- Combine flash sale + customer discount (stacking)

---

## Questions & Decisions Log

**Q1:** Priority order for 4 features?
**A:** Fix customer discount bug first (highest priority)

**Q2:** Discount modal approach?
**A:** Combination of item-by-item AND percentage on total (two tabs)

**Q3:** WhatsApp receipt format?
**A:** Option B - Show final prices + subtotal + discount line + total

**Q4:** Customer discount + flash sale interaction?
**A:** Option B - No stacking, customer discount overrides flash sale (with warning)

**Q5:** Item-by-item discount format in WhatsApp?
**A:** Simple format (no per-item discount details, just total)

**Q6:** Flash sale pre-fill?
**A:** Yes - auto-populate item discounts with flash sale amounts as starting point

---

**End of Design Document**
