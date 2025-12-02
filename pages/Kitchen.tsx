
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Input, Badge } from '../components/UI';
import { ChefHat, ShoppingBasket, BookOpen, Save, Plus, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';
import { MenuItem } from '../types';

export const Kitchen: React.FC = () => {
  const { menu, inventory, updateMenu, addMenuItem, publishDailyMenu, orders } = useAppStore();
  const [activeTab, setActiveTab] = useState<'plan' | 'recipes' | 'inventory'>('plan');

  // Plan State
  const [prepValues, setPrepValues] = useState<Record<string, { qty: number, price: number }>>({});

  // Recipe/Menu State
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');

  // Smart Menu Analytics
  const getItemAnalytics = (itemId: string, days: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const relevantOrders = orders.filter(o =>
      new Date(o.deliveryDate) >= cutoffDate && o.status !== 'cancelled'
    );

    const itemOrders = relevantOrders.flatMap(o =>
      o.items.filter(i => i.menuItemId === itemId)
    );

    const totalSold = itemOrders.reduce((sum, item) => sum + item.quantity, 0);
    const avgPerDay = totalSold / days;
    const daysActive = new Set(relevantOrders.filter(o =>
      o.items.some(i => i.menuItemId === itemId)
    ).map(o => o.deliveryDate.split('T')[0])).size;

    const menuItem = menu.find(m => m.id === itemId);
    const dailyLimit = menuItem?.dailyLimit || 10;

    // Calculate if it sold out or had leftovers
    const soldOutDays = daysActive; // Simplified - in real app, track actual sold-out days
    const leftoverDays = Math.max(0, days - soldOutDays);

    return {
      totalSold,
      avgPerDay,
      daysActive,
      soldOutDays,
      leftoverDays,
      recommendation: avgPerDay > dailyLimit ? 'increase' : avgPerDay < dailyLimit * 0.7 ? 'decrease' : 'maintain'
    };
  };

  const handlePrepChange = (id: string, field: 'qty' | 'price', value: string) => {
    setPrepValues(prev => ({
        ...prev,
        [id]: {
            ...prev[id],
            [field]: Number(value)
        }
    }));
  };

  const initPrep = (item: MenuItem) => {
      if (!prepValues[item.id]) {
        setPrepValues(prev => ({
            ...prev,
            [item.id]: { qty: item.dailyLimit || 10, price: item.price }
        }));
      }
  };

  const handlePublish = () => {
      if (window.confirm('This will update "Today\'s Lunch Items" and reset stock counts. Continue?')) {
          const itemsToPublish = Object.entries(prepValues)
            .filter(([_, val]) => val.qty > 0)
            .map(([id, val]) => ({ id, qty: val.qty, price: val.price }));
            
          publishDailyMenu(itemsToPublish);
          alert('Menu Published for Today!');
      }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ChefHat className="text-sky-600" size={24} />
        <h1 className="text-2xl font-bold text-slate-900">Kitchen Prep</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
        {[
            { id: 'plan', label: 'Plan Today', icon: ChefHat },
            { id: 'recipes', label: 'Menu List', icon: BookOpen },
            { id: 'inventory', label: 'Inventory', icon: ShoppingBasket }
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === tab.id ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'
                }`}
            >
                <tab.icon size={16} />
                {tab.label}
            </button>
        ))}
      </div>

      {/* --- Tab Content --- */}
      
      {/* 1. PLAN TODAY */}
      {activeTab === 'plan' && (
          <div className="space-y-4 animate-in fade-in">
              {/* Smart Recommendations */}
              {orders.length > 5 && (
                  <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                      <div className="flex items-start gap-3 mb-3">
                          <div className="bg-purple-100 p-2 rounded-lg">
                              <Lightbulb className="text-purple-600" size={20} />
                          </div>
                          <div className="flex-1">
                              <h3 className="font-bold text-purple-900 text-sm">Smart Recommendations</h3>
                              <p className="text-xs text-purple-700 mt-1">Based on last 7 days sales data</p>
                          </div>
                      </div>

                      <div className="space-y-2">
                          {menu.slice(0, 3).map(item => {
                              const analytics = getItemAnalytics(item.id);
                              if (analytics.totalSold === 0) return null;

                              return (
                                  <div key={item.id} className="bg-white/80 p-3 rounded-lg border border-purple-100">
                                      <div className="flex justify-between items-start mb-1">
                                          <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                                          {analytics.recommendation === 'increase' && (
                                              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                  <TrendingUp size={10} /> COOK MORE
                                              </span>
                                          )}
                                          {analytics.recommendation === 'decrease' && (
                                              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                  <TrendingDown size={10} /> COOK LESS
                                              </span>
                                          )}
                                          {analytics.recommendation === 'maintain' && (
                                              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                                                  ✓ GOOD
                                              </span>
                                          )}
                                      </div>
                                      <p className="text-xs text-slate-600">
                                          Avg: <span className="font-bold">{analytics.avgPerDay.toFixed(1)}</span> sold/day
                                          • Suggested qty: <span className="font-bold text-purple-700">{Math.ceil(analytics.avgPerDay * 1.2)}</span>
                                      </p>
                                  </div>
                              );
                          }).filter(Boolean)}
                      </div>
                  </Card>
              )}

              <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl text-sm text-sky-800">
                  <p>Select items to cook today. Entering a quantity &gt; 0 makes it available in the Orders tab.</p>
              </div>

              <div className="space-y-3">
                  {menu.map(item => {
                      const val = prepValues[item.id] || { qty: item.dailyLimit || 0, price: item.price };
                      const isSelected = val.qty > 0;

                      return (
                        <Card key={item.id} className={`transition-colors ${isSelected ? 'border-sky-300 ring-1 ring-sky-100' : 'opacity-80'}`}>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900">{item.name}</h3>
                                    <span className="text-xs text-slate-500">{item.category}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-20">
                                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Qty</label>
                                        <input 
                                            type="number" 
                                            className="w-full border rounded p-1 text-center font-bold"
                                            value={val.qty}
                                            onChange={(e) => handlePrepChange(item.id, 'qty', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-20">
                                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Price</label>
                                        <input 
                                            type="number" 
                                            className="w-full border rounded p-1 text-center"
                                            value={val.price}
                                            onChange={(e) => handlePrepChange(item.id, 'price', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                      );
                  })}
              </div>

              <div className="sticky bottom-20 md:bottom-6 pt-4">
                  <Button size="lg" fullWidth className="shadow-xl py-4" onClick={handlePublish}>
                      <Save className="mr-2" size={20} /> Publish Today's Menu
                  </Button>
              </div>
          </div>
      )}

      {/* 2. RECIPES / MENU LIST */}
      {activeTab === 'recipes' && (
          <div className="space-y-3 animate-in fade-in">
              <div className="flex justify-between items-center mb-2">
                  <h2 className="font-bold text-slate-800">Master Menu List</h2>
                  <Button size="sm" variant="outline" onClick={() => {
                      const name = prompt("Enter new item name:");
                      if (name) addMenuItem({ 
                          id: Math.random().toString(36), 
                          name, 
                          price: 15, 
                          category: 'Main', 
                          isAvailable: false 
                        });
                  }}>
                      <Plus size={16} className="mr-1" /> Add Item
                  </Button>
              </div>
              {menu.map(item => (
                  <Card key={item.id} className="p-3">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="font-bold text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500">{item.description || 'No description'}</p>
                          </div>
                          <Badge variant="neutral">{item.category}</Badge>
                      </div>
                  </Card>
              ))}
          </div>
      )}

      {/* 3. INVENTORY */}
      {activeTab === 'inventory' && (
          <div className="space-y-3 animate-in fade-in">
              <div className="flex justify-between items-center mb-2">
                  <h2 className="font-bold text-slate-800">Ingredients Stock</h2>
                  <Button size="sm" variant="outline">
                      <Plus size={16} /> Add
                  </Button>
              </div>
              {inventory.map(item => (
                  <Card key={item.id} className="flex justify-between items-center p-3">
                      <div>
                          <p className="font-bold text-slate-900">{item.name}</p>
                          {item.currentStock <= item.lowStockThreshold && (
                              <Badge variant="danger" className="mt-1">Low Stock</Badge>
                          )}
                      </div>
                      <div className="text-right">
                          <span className="text-xl font-bold text-slate-800">{item.currentStock}</span>
                          <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
                      </div>
                  </Card>
              ))}
              {inventory.length === 0 && (
                  <div className="text-center p-8 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                      No ingredients tracked yet.
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
