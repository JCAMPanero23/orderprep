# Phase 12: Recipe Ingredient Linking + Simplified Analytics + End-of-Day Management

**Status:** Planning Complete - Ready for Implementation
**Total Estimated Time:** 17-21 hours across 5-6 working days
**Priority Order:** Phase 12C → Phase 12A → Phase 12B

---

## Executive Summary

Three focused, practical features for small food business operations:

1. **Phase 12C: End-of-Day Unsold Items Management** ⭐ **PRIORITY**
   - Track leftover item outcomes (flash sale, donated, discarded, kept)
   - Smart prep suggestions based on 7-day patterns
   - Reduce waste and improve planning accuracy

2. **Phase 12A: Recipe Ingredient Linking with Cost Tracking**
   - Link menu items to ingredients (including packaging)
   - Calculate cost per dish and profit margins
   - Auto-generate shopping lists with cost estimates

3. **Phase 12B: Simplified Business Analytics**
   - Monthly revenue, cost, and profit summary
   - One CSV export for accountant
   - Simple, clean UI (no complex trends)

---

## PHASE 12C: END-OF-DAY UNSOLD ITEMS MANAGEMENT ⭐ **PRIORITY**

**Estimated Time:** 3-4 hours
**Problem Solved:** "What do I do with leftovers? How do I cook better tomorrow?"

### Why This First?

- **Directly addresses user pain point:** Reducing waste and improving planning
- **Simplest to implement:** Just 3 data structures + 2 UI components
- **Immediate ROI:** Users get suggestions after 7 days of logging
- **Builds foundation:** Prepares for Phase 12A recipe costs

---

## Task 12C.1: Add Data Model (30 mins)

**File:** `D:\OrderPrep\types.ts`

### Add EndOfDayLog Interface:

```tsx
export interface EndOfDayLog {
  id: string;
  date: string; // YYYY-MM-DD
  menuItemId: string;
  menuItemName: string;
  leftoverQty: number;
  outcome: 'flash_sale' | 'donated' | 'discarded' | 'kept_next_day';
  recoveredAmount?: number; // If sold via flash sale
  notes?: string;
}
```

**File:** `D:\OrderPrep\store.tsx`

### Add State and Actions:

```tsx
const [endOfDayLogs, setEndOfDayLogs] = useLocalStorage<EndOfDayLog[]>('endOfDayLogs', []);

const addEndOfDayLog = (log: Omit<EndOfDayLog, 'id'>) => {
  setEndOfDayLogs(prev => [...prev, { ...log, id: generateId() }]);
};

const deleteEndOfDayLog = (id: string) => {
  setEndOfDayLogs(prev => prev.filter(log => log.id !== id));
};
```

### Update AppState Provider Value:
- Add `endOfDayLogs`
- Add `addEndOfDayLog`
- Add `deleteEndOfDayLog`

---

## Task 12C.2: Add End-of-Day Alert to Dashboard (1.5 hours)

**File:** `D:\OrderPrep\pages\Dashboard.tsx`

### Key Logic:

```tsx
{/* End-of-Day Alert - Show after 8 PM */}
{(() => {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 20) return null; // Only show after 8 PM

  // Calculate unsold items from today
  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.deliveryDate);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString() && o.status !== 'cancelled';
  });

  const soldQty: Record<string, number> = {};
  todayOrders.forEach(order => {
    order.items.forEach(item => {
      soldQty[item.menuItemId] = (soldQty[item.menuItemId] || 0) + item.quantity;
    });
  });

  const unsoldItems = publishedMenu.map(item => ({
    ...item,
    sold: soldQty[item.id] || 0,
    unsold: Math.max(0, (item.dailyLimit || 0) - (soldQty[item.id] || 0))
  })).filter(item => item.unsold > 0);

  if (unsoldItems.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <p className="font-bold text-green-900">🎉 All sold out today! Great job!</p>
      </Card>
    );
  }

  return (
    <Card className="bg-amber-50 border-amber-200">
      <h3 className="font-bold text-amber-900">⏰ End of Day - Unsold Items</h3>
      <p className="text-sm text-amber-700 mb-3">
        Track leftovers to improve tomorrow's planning
      </p>

      {unsoldItems.map(item => (
        <div key={item.id} className="bg-white p-3 rounded mb-2 border border-amber-100">
          <p className="font-bold text-slate-900">{item.name}</p>
          <p className="text-sm text-slate-600 mb-2">
            {item.unsold} unit{item.unsold !== 1 ? 's' : ''} left
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => logLeftover(item.id, item.unsold, 'flash_sale')}
              className="bg-green-50 hover:bg-green-100"
            >
              💰 Flash Sale
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => logLeftover(item.id, item.unsold, 'donated')}
              className="bg-blue-50 hover:bg-blue-100"
            >
              🤝 Donated
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => logLeftover(item.id, item.unsold, 'discarded')}
              className="bg-red-50 hover:bg-red-100"
            >
              🗑️ Discarded
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => logLeftover(item.id, item.unsold, 'kept_next_day')}
              className="bg-purple-50 hover:bg-purple-100"
            >
              📦 Keep Tomorrow
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
})()}
```

### Handler Function:

```tsx
const logLeftover = (menuItemId: string, qty: number, outcome: EndOfDayLog['outcome']) => {
  const menuItem = publishedMenu.find(m => m.id === menuItemId);
  if (!menuItem) return;

  addEndOfDayLog({
    date: new Date().toISOString().split('T')[0],
    menuItemId,
    menuItemName: menuItem.name,
    leftoverQty: qty,
    outcome
  });

  // Show success toast
  showToast(`Logged ${qty} ${menuItem.name} as ${outcome.replace('_', ' ')}`);
};
```

---

## Task 12C.3: Add Prep Suggestions to Kitchen (1.5 hours)

**File:** `D:\OrderPrep\pages\Kitchen.tsx`

### Add Smart Prep Suggestions Card:

```tsx
{/* Smart Prep Suggestions - Based on last 7 days of leftovers */}
<Card className="bg-purple-50 border-purple-200">
  <h3 className="font-bold text-purple-900">📊 Smart Prep Suggestions</h3>
  <p className="text-xs text-purple-700 mb-3">Based on last 7 days of operations</p>

  {(() => {
    const suggestions = menu.map(item => {
      // Get last 7 days of end-of-day logs for this item
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentLogs = endOfDayLogs.filter(log =>
        log.menuItemId === item.id &&
        new Date(log.date) >= sevenDaysAgo
      );

      if (recentLogs.length === 0) return null;

      const avgLeftover = recentLogs.reduce((sum, log) => sum + log.leftoverQty, 0) / recentLogs.length;
      const flashSaleCount = recentLogs.filter(log => log.outcome === 'flash_sale').length;
      const recoveryRate = flashSaleCount / recentLogs.length;
      const discardedCount = recentLogs.filter(log => log.outcome === 'discarded').length;

      return {
        item,
        avgLeftover,
        recoveryRate,
        logsCount: recentLogs.length,
        discardedCount
      };
    }).filter(s => s !== null);

    if (suggestions.length === 0) {
      return (
        <p className="text-sm text-slate-600 text-center py-4">
          Log end-of-day items for 7 days to see suggestions
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {suggestions.map(s => (
          <div key={s!.item.id} className="bg-white p-2 rounded border-l-4 border-purple-400">
            <p className="font-bold text-slate-900">{s!.item.name}</p>
            <p className="text-xs text-slate-600 mb-1">
              {s!.logsCount} days tracked • Avg leftover: {s!.avgLeftover.toFixed(1)} units
            </p>

            {/* Suggestion 1: Reduce prep if high average leftover */}
            {s!.avgLeftover > 2 && (
              <div className="bg-amber-50 p-2 rounded mt-1 border border-amber-200">
                <p className="text-sm font-bold text-amber-900">💡 Cook Less Tomorrow</p>
                <p className="text-xs text-amber-800">
                  You averaged {s!.avgLeftover.toFixed(1)} leftovers.
                  Try cooking {Math.ceil(s!.avgLeftover)} units less.
                </p>
              </div>
            )}

            {/* Suggestion 2: Improve recovery if flash sale rate is low */}
            {s!.recoveryRate < 0.3 && s!.avgLeftover > 0.5 && (
              <div className="bg-orange-50 p-2 rounded mt-1 border border-orange-200">
                <p className="text-sm font-bold text-orange-900">⚠️ Low Recovery Rate</p>
                <p className="text-xs text-orange-800">
                  Only {(s!.recoveryRate * 100).toFixed(0)}% sold via flash sale.
                  Try lower flash sale prices or promote earlier.
                </p>
              </div>
            )}

            {/* Suggestion 3: Consider discontinuing if high discard rate */}
            {s!.discardedCount > 2 && (
              <div className="bg-red-50 p-2 rounded mt-1 border border-red-200">
                <p className="text-sm font-bold text-red-900">🗑️ High Discard Rate</p>
                <p className="text-xs text-red-800">
                  Discarded {s!.discardedCount} times in 7 days.
                  Consider reducing daily limit or removing this item.
                </p>
              </div>
            )}

            {/* Positive feedback */}
            {s!.avgLeftover <= 1 && s!.recoveryRate >= 0.5 && (
              <div className="bg-green-50 p-2 rounded mt-1 border border-green-200">
                <p className="text-sm font-bold text-green-900">✨ Well Balanced!</p>
                <p className="text-xs text-green-800">
                  Great planning! Keep current quantities. {(s!.recoveryRate * 100).toFixed(0)}% recovery rate.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  })()}
</Card>
```

---

## Phase 12C Testing Checklist

- [ ] Add `EndOfDayLog` interface to `types.ts`
- [ ] Add state and actions to `store.tsx`
- [ ] Create end-of-day alert card in Dashboard
- [ ] Test alert appears after 8 PM only
- [ ] Test all 4 outcome buttons (flash sale, donated, discarded, kept)
- [ ] Verify localStorage persistence
- [ ] Create 7+ days of end-of-day logs
- [ ] Verify prep suggestions display correctly
- [ ] Test all suggestion scenarios:
  - High average leftover (should suggest cook less)
  - Low recovery rate (should suggest promote flash sale)
  - High discard rate (should suggest discontinue)
  - Well balanced (should show positive feedback)
- [ ] Test mobile viewport
- [ ] Verify calculations are accurate

---

## Key User Benefits

### For Reducing Waste:
```
Day 1: Log 5 Pork Belly leftovers → Flash Sale ✓
Day 2: Log 4 Pork Belly leftovers → Flash Sale ✓
Day 3: Log 3 Pork Belly leftovers → Discarded ✗
Day 4: Log 6 Pork Belly leftovers → Donated ✓
Day 5: Log 4 Pork Belly leftovers → Flash Sale ✓
Day 6: Log 5 Pork Belly leftovers → Flash Sale ✓
Day 7: Log 3 Pork Belly leftovers → Flash Sale ✓

SUGGESTION: "Avg 4.3 leftovers. Cook 4 less tomorrow.
Recovery rate: 86% via flash sale - excellent!"
```

### Impact:
- **Before:** Cook 20 units, sell 16, waste 4 (20% loss)
- **After:** Cook 16 units, sell 14-15, waste 1-2 (6-12% loss)
- **Savings:** Potential 100-150 AED/month in reduced food waste

---

## PHASE 12A: RECIPE INGREDIENT LINKING WITH COST TRACKING

**Estimated Time:** 10-12 hours
**Problem Solved:** "What does each dish cost me? What should I buy?"

### Tasks (Brief Overview)

1. **12A.1:** Enable Inventory Tab + CRUD UI (2-3 hours)
   - Add ingredients (food + packaging)
   - Add costs per unit

2. **12A.2:** Build Recipe Editor (3-4 hours)
   - Link ingredients to menu items
   - Live profit margin calculation
   - Color-coded warnings

3. **12A.3:** Store Actions (30 mins)
   - `updateMenuRecipe` action
   - `deleteInventoryItem` action

4. **12A.4:** Mock Data with Costs (30 mins)
   - 11+ ingredients with costs
   - 4+ sample recipes

5. **12A.5:** Shopping List Enhancements (1-2 hours)
   - Add cost estimates
   - Total shopping cost card

6. **12A.6:** Dashboard Profit Margins (1 hour)
   - Average margin display
   - Low margin warnings

### Sample Recipe Structure:

```
Roast Pork w/ Mushroom Gravy (Price: 15 AED)
├─ Pork Belly: 0.15 kg × 45.00 = 6.75 AED
├─ Rice: 0.2 kg × 8.00 = 1.60 AED
├─ Mushrooms: 0.05 kg × 25.00 = 1.25 AED
├─ Soy Sauce: 0.02 L × 12.00 = 0.24 AED
└─ Container (Large): 1 pcs × 2.50 = 2.50 AED
────────────────────────────────
Total Cost: 12.34 AED
Profit: 2.66 AED
Margin: 17.7% ⚠️ (Below 30% target)
```

---

## PHASE 12B: SIMPLIFIED BUSINESS ANALYTICS

**Estimated Time:** 4-5 hours
**Problem Solved:** "How much profit did I make this month? What's my actual margin?"

### Key Features

1. **Simple Monthly Summary**
   - Revenue card (green)
   - Costs card (red)
   - Profit card (purple)
   - Margin card (sky blue)

2. **Cost Breakdown**
   - Total Revenue
   - Total Cost (from recipes)
   - Gross Profit
   - Profit Margin %

3. **CSV Export**
   - One simple export file
   - Accountant-ready format
   - No complex features

### Example Output:

```
OrderPrep Monthly Report - December 2025

Metric                 Value
─────────────────────────────
Total Orders          55
Total Revenue         1,650 AED
Total Cost            850 AED
Gross Profit          800 AED
Profit Margin         48.5%
Avg Order Value       30 AED
```

---

## Implementation Order (Revised Priority)

1. **Phase 12C First** (3-4 hours)
   - Highest user impact (waste reduction)
   - Simplest to implement
   - Foundation for later phases

2. **Phase 12A Second** (10-12 hours)
   - Builds on Phase 12C knowledge
   - Enables cost tracking for analytics

3. **Phase 12B Third** (4-5 hours)
   - Uses data from Phase 12A
   - Final reporting layer

---

## Total Implementation Timeline

### Day 1: Phase 12C (3-4 hours)
- 12C.1: Data model (30 mins)
- 12C.2: End-of-day alert (1.5 hours)
- 12C.3: Prep suggestions (1.5 hours)
- Testing (30 mins)

### Days 2-4: Phase 12A (10-12 hours)
- 12A.1: Inventory CRUD (2-3 hours)
- 12A.2: Recipe Editor (3-4 hours)
- 12A.3: Store Actions (30 mins)
- 12A.4: Mock Data (30 mins)
- 12A.5: Shopping List (1-2 hours)
- 12A.6: Dashboard (1 hour)
- Testing (2 hours)

### Day 5: Phase 12B (4-5 hours)
- 12B.1: Analytics Page (2 hours)
- 12B.2: CSV Export (1 hour)
- 12B.3: Routes & Nav (1 hour)
- Testing (1 hour)

**Total:** 17-21 hours across 5 working days

---

## Critical Files to Modify

### Phase 12C
- `D:\OrderPrep\types.ts` - Add EndOfDayLog interface
- `D:\OrderPrep\store.tsx` - Add state and actions
- `D:\OrderPrep\pages\Dashboard.tsx` - Add end-of-day alert

### Phase 12A
- `D:\OrderPrep\pages\Kitchen.tsx` - Inventory CRUD + Recipe Editor
- `D:\OrderPrep\store.tsx` - Recipe actions
- `D:\OrderPrep\pages\Prep.tsx` - Shopping list enhancements
- `D:\OrderPrep\pages\Dashboard.tsx` - Profit margins

### Phase 12B
- `D:\OrderPrep\pages\Analytics.tsx` - NEW FILE
- `D:\OrderPrep\App.tsx` - Add route
- `D:\OrderPrep\components\Layout.tsx` - Add navigation
- `D:\OrderPrep\pages\Dashboard.tsx` - Add analytics link

---

## Key Design Decisions

1. **Packaging as Ingredient:** No separate tracking. Container = 1 ingredient at 2.50 AED cost
2. **Simplified Analytics:** No expense categories, trends, or complex UI
3. **7-Day Rolling Window:** Suggestions based on last 7 days only
4. **localStorage Only:** All data persists locally (no cloud sync needed yet)
5. **Mobile-First:** All components optimized for 80% mobile users

---

## Success Metrics

### Phase 12C
- ✅ Users can log leftovers in <15 seconds
- ✅ Suggestions appear after 7 days
- ✅ Users understand waste reduction potential

### Phase 12A
- ✅ Users can create recipes with costs
- ✅ Profit margins visible on every item
- ✅ Shopping list shows cost estimates

### Phase 12B
- ✅ Monthly report fits on one page
- ✅ CSV exports cleanly to Excel
- ✅ Accountant can understand profit calculation

---

## Future Enhancements (Phase 13+)

- Visual charts (bar graphs of waste recovery)
- Expense categories (utilities, rent, marketing)
- Monthly trends (revenue over time)
- Batch end-of-day logging
- Waste trend analysis
- Buyer Link System implementation

---

**Version:** 2.0
**Date Created:** December 13, 2025
**Status:** Ready for Implementation
**Priority:** Phase 12C First → 12A → 12B
