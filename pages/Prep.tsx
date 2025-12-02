import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, Button } from '../components/UI';
import { ClipboardList, CheckSquare, ShoppingCart, Copy, Check } from 'lucide-react';

export const Prep: React.FC = () => {
  const { orders, menu, inventory } = useAppStore();
  const [copiedShopping, setCopiedShopping] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o =>
    o.deliveryDate.startsWith(today) && o.status !== 'cancelled'
  );

  // Aggregate quantities
  const prepList: Record<string, { name: string, qty: number }> = {};

  todayOrders.forEach(order => {
    order.items.forEach(item => {
        if (prepList[item.menuItemId]) {
            prepList[item.menuItemId].qty += item.quantity;
        } else {
            prepList[item.menuItemId] = { name: item.name, qty: item.quantity };
        }
    });
  });

  const prepItems = Object.values(prepList);

  // Shopping List Generator
  const generateShoppingList = () => {
    const shoppingList: Record<string, { name: string, needed: number, current: number, unit: string, category?: string }> = {};

    // Go through each prep item and calculate ingredients needed
    prepItems.forEach(prepItem => {
      const menuItem = menu.find(m => m.name === prepItem.name);
      if (menuItem && menuItem.ingredients) {
        menuItem.ingredients.forEach(recipeIng => {
          const ingredient = inventory.find(inv => inv.id === recipeIng.ingredientId);
          if (ingredient) {
            const totalNeeded = recipeIng.quantity * prepItem.qty;
            if (shoppingList[ingredient.id]) {
              shoppingList[ingredient.id].needed += totalNeeded;
            } else {
              shoppingList[ingredient.id] = {
                name: ingredient.name,
                needed: totalNeeded,
                current: ingredient.currentStock,
                unit: ingredient.unit,
                category: 'General'
              };
            }
          }
        });
      }
    });

    return Object.values(shoppingList).filter(item => item.needed > item.current);
  };

  const shoppingList = generateShoppingList();

  const copyShoppingList = () => {
    if (shoppingList.length === 0) {
      alert('No items to buy!');
      return;
    }

    const text = `🛒 SHOPPING LIST - ${new Date().toLocaleDateString()}\n\n` +
      shoppingList.map(item => {
        const toBuy = Math.max(0, item.needed - item.current);
        return `• ${item.name}: ${toBuy} ${item.unit} (Have: ${item.current}, Need: ${item.needed})`;
      }).join('\n') +
      `\n\n✅ Total Items: ${shoppingList.length}`;

    navigator.clipboard.writeText(text);
    setCopiedShopping(true);
    setTimeout(() => setCopiedShopping(false), 2000);
  };

  return (
    <div className="space-y-6">
       <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg -mx-2 md:mx-0">
            <h1 className="text-2xl font-bold mb-1">Kitchen Prep</h1>
            <p className="text-slate-400 text-sm">Summary for today, {new Date().toLocaleDateString()}</p>
            
            <div className="mt-6 flex justify-between items-end">
                <div>
                    <span className="text-4xl font-bold text-sky-400">{todayOrders.length}</span>
                    <span className="text-sm text-slate-400 ml-2">Total Orders</span>
                </div>
                <ClipboardList className="text-slate-700" size={48} />
            </div>
       </div>

       <div className="space-y-4">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <CheckSquare size={20} className="text-sky-500" /> 
                Items to Prepare
            </h2>
            
            {prepItems.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
                    <p className="text-slate-500">No orders for today yet.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {prepItems.map((item, idx) => (
                        <Card key={idx} className="flex justify-between items-center py-4">
                            <span className="font-medium text-slate-800 text-lg">{item.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-sky-600">{item.qty}</span>
                                <span className="text-xs text-slate-400 font-medium uppercase mt-2">Qty</span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
       </div>

       {/* Shopping List Generator */}
       <div className="mt-8">
            <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="font-bold text-emerald-900 text-lg flex items-center gap-2">
                            <ShoppingCart size={20} />
                            Shopping List
                        </h2>
                        <p className="text-xs text-emerald-700 mt-1">Auto-generated based on today's orders</p>
                    </div>
                    <Button
                        size="sm"
                        onClick={copyShoppingList}
                        disabled={shoppingList.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 border-none text-white"
                    >
                        {copiedShopping ? <Check size={16} /> : <Copy size={16} />}
                        <span className="ml-1">{copiedShopping ? 'Copied!' : 'Copy'}</span>
                    </Button>
                </div>

                {shoppingList.length === 0 ? (
                    <div className="text-center py-6 bg-white/60 rounded-lg border border-emerald-100">
                        <p className="text-emerald-700 text-sm">
                            ✅ All stocked up! No ingredients needed.
                        </p>
                        <p className="text-xs text-emerald-600 mt-1">
                            (Add recipes to menu items in Kitchen to enable shopping list)
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {shoppingList.map((item, idx) => {
                            const toBuy = Math.max(0, item.needed - item.current);
                            return (
                                <div key={idx} className="bg-white/80 p-3 rounded-lg border border-emerald-100 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-800">{item.name}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Have: {item.current} {item.unit} • Need: {item.needed} {item.unit}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-emerald-800">{toBuy}</p>
                                        <p className="text-xs text-slate-500">{item.unit}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
       </div>

       {/* Detailed breakdown per order (Optional but helpful for packing) */}
       <div className="mt-8">
            <h2 className="font-bold text-slate-800 text-lg mb-3">Packing List</h2>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {todayOrders.map(order => (
                    <div key={order.id} className="p-4 flex justify-between items-center">
                        <span className="font-medium text-slate-700">{order.customerName}</span>
                        <span className="text-sm text-slate-500">
                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </span>
                    </div>
                ))}
                {todayOrders.length === 0 && <div className="p-4 text-center text-slate-400 text-sm">Nothing to pack yet.</div>}
            </div>
       </div>
    </div>
  );
};