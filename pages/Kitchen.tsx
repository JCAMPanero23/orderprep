
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Input, Badge, Modal } from '../components/UI';
import { ChefHat, ShoppingBasket, BookOpen, Save, Plus, TrendingUp, TrendingDown, Lightbulb, Edit2, Download, Clock } from 'lucide-react';
import { MenuItem } from '../types';

// Menu Preset Interface
interface MenuPreset {
  id: string;
  name: string;
  mode: 'full' | 'slot';
  createdAt: string;
  notes?: string;
  items: { id: string; qty: number; price: number }[];
}

export const Kitchen: React.FC = () => {
  const { menu, inventory, updateMenu, addMenuItem, publishDailyMenu, orders } = useAppStore();
  const [activeTab, setActiveTab] = useState<'plan' | 'recipes' | 'inventory'>('plan');

  // Plan State
  const [prepValues, setPrepValues] = useState<Record<string, { qty: number, price: number }>>({});

  // Plan Mode State (Full Menu vs Slot Mode) - persisted in localStorage
  const [planMode, setPlanMode] = useState<'full' | 'slot'>(() => {
    const saved = localStorage.getItem('orderprep_planMode');
    return (saved === 'slot' || saved === 'full') ? saved : 'full';
  });
  const [slotCount, setSlotCount] = useState(10); // Default 10 slots
  const [slots, setSlots] = useState<Array<{ menuItemId: string | null, qty: number, price: number }>>(
    Array(10).fill(null).map(() => ({ menuItemId: null, qty: 0, price: 15 }))
  );

  // Derive Published State from menu data (persists across tab navigation)
  const isPublished = menu.some(item => item.dailyLimit && item.dailyLimit > 0);
  const [isEditingPublished, setIsEditingPublished] = useState(false);
  const isLocked = isPublished && !isEditingPublished;

  // Add Menu Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    description: '',
    category: 'Main' as 'Main' | 'Dessert' | 'Snack' | 'Beverage',
    price: 15
  });

  // Edit Menu Item State
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MenuItem | null>(null);

  // Menu Preset State
  const [presets, setPresets] = useState<MenuPreset[]>(() => {
    const saved = localStorage.getItem('orderprep_menuPresets');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

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
    // Bug Fix #1: Handle text input properly (allow empty string during editing)
    // Only update if value is empty or a valid number
    if (value === '' || !isNaN(Number(value))) {
      setPrepValues(prev => ({
          ...prev,
          [id]: {
              ...prev[id],
              [field]: value === '' ? 0 : Number(value)
          }
      }));
    }
  };

  const initPrep = (item: MenuItem) => {
      if (!prepValues[item.id]) {
        setPrepValues(prev => ({
            ...prev,
            [item.id]: { qty: item.dailyLimit || 10, price: item.price }
        }));
      }
  };

  // Initialize prepValues and sync with published menu data
  // Enhancement: Retain published items when editing
  useEffect(() => {
    if (activeTab === 'plan' && menu.length > 0) {
      const initialValues: Record<string, { qty: number, price: number }> = {};

      if (isPublished) {
        // Sync ALL values with published menu data (for editing published menu)
        menu.forEach(item => {
          initialValues[item.id] = {
            qty: item.dailyLimit || 0,
            price: item.price
          };
        });
        setPrepValues(initialValues);

        // Reconstruct slots from published data (for Slot Mode)
        const publishedItems = menu.filter(item => item.dailyLimit && item.dailyLimit > 0);
        if (publishedItems.length > 0 && planMode === 'slot') {
          const newSlots = Array(slotCount).fill(null).map((_, index) => {
            const item = publishedItems[index];
            return item
              ? { menuItemId: item.id, qty: item.dailyLimit!, price: item.price }
              : { menuItemId: null, qty: 0, price: 15 };
          });
          setSlots(newSlots);
        }
      } else {
        // Initialize only missing values (default behavior)
        menu.forEach(item => {
          if (!prepValues[item.id]) {
            initialValues[item.id] = {
              qty: item.dailyLimit || 10,
              price: item.price
            };
          }
        });
        if (Object.keys(initialValues).length > 0) {
          setPrepValues(prev => ({ ...prev, ...initialValues }));
        }
      }
    }
  }, [activeTab, menu, isPublished]);

  // Persist planMode to localStorage
  useEffect(() => {
    localStorage.setItem('orderprep_planMode', planMode);
  }, [planMode]);

  // Persist presets to localStorage
  useEffect(() => {
    localStorage.setItem('orderprep_menuPresets', JSON.stringify(presets));
  }, [presets]);

  const handlePublish = () => {
      if (window.confirm('This will update "Today\'s Lunch Items" and reset stock counts. Continue?')) {
          let itemsToPublish;

          if (planMode === 'full') {
              // Full Menu Mode
              itemsToPublish = Object.entries(prepValues)
                .filter(([_, val]) => val.qty > 0)
                .map(([id, val]) => ({ id, qty: val.qty, price: val.price }));
          } else {
              // Slot Mode
              itemsToPublish = slots
                .filter(slot => slot.menuItemId && slot.qty > 0)
                .map(slot => ({ id: slot.menuItemId!, qty: slot.qty, price: slot.price }));
          }

          publishDailyMenu(itemsToPublish);
          setIsEditingPublished(false); // Lock UI after publish
          alert('Menu Published for Today!');
      }
  };

  const handleEditPublishedMenu = () => {
      if (window.confirm('Are you sure you want to edit today\'s published menu? This may affect current orders.')) {
          setIsEditingPublished(true); // Unlock UI for editing
      }
  };

  // Slot Mode Handlers
  const handleSlotChange = (index: number, field: 'menuItemId' | 'qty' | 'price', value: string | number) => {
    setSlots(prev => {
      const updated = [...prev];
      if (field === 'menuItemId') {
        updated[index] = { ...updated[index], menuItemId: value as string };
        // Auto-populate price from menu item
        const item = menu.find(m => m.id === value);
        if (item) {
          updated[index].price = item.price;
        }
      } else if (field === 'qty' || field === 'price') {
        updated[index] = { ...updated[index], [field]: Number(value) };
      }
      return updated;
    });
  };

  const handleSlotCountChange = (newCount: number) => {
    setSlotCount(newCount);
    setSlots(prev => {
      if (newCount > prev.length) {
        // Add new slots
        return [...prev, ...Array(newCount - prev.length).fill(null).map(() => ({ menuItemId: null, qty: 0, price: 15 }))];
      } else {
        // Remove excess slots
        return prev.slice(0, newCount);
      }
    });
  };

  // Enhancement: Mode Switching with Data Preservation
  const handleSwitchToSlotMode = () => {
    // Convert prepValues to slots (preserve Full Menu data)
    const itemsWithQty = Object.entries(prepValues)
      .filter(([_, val]) => val.qty > 0)
      .map(([id, val]) => ({ menuItemId: id, qty: val.qty, price: val.price }));

    const newSlots = Array(slotCount).fill(null).map((_, index) => {
      return itemsWithQty[index] || { menuItemId: null, qty: 0, price: 15 };
    });

    setSlots(newSlots);
    setPlanMode('slot');
  };

  const handleSwitchToFullMode = () => {
    // Convert slots to prepValues (preserve Slot data)
    const updatedPrepValues = { ...prepValues };

    slots.forEach(slot => {
      if (slot.menuItemId) {
        updatedPrepValues[slot.menuItemId] = {
          qty: slot.qty,
          price: slot.price
        };
      }
    });

    setPrepValues(updatedPrepValues);
    setPlanMode('full');
  };

  // Preset System Handlers
  const handleSavePreset = () => {
    // Generate auto-name with current date
    const now = new Date();
    const dateName = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeName = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const autoName = `Menu ${dateName} ${timeName}`;

    // Get current items based on mode
    let items: { id: string; qty: number; price: number }[] = [];
    if (planMode === 'full') {
      items = Object.entries(prepValues)
        .filter(([_, val]) => val.qty > 0)
        .map(([id, val]) => ({ id, qty: val.qty, price: val.price }));
    } else {
      items = slots
        .filter(slot => slot.menuItemId && slot.qty > 0)
        .map(slot => ({ id: slot.menuItemId!, qty: slot.qty, price: slot.price }));
    }

    if (items.length === 0) {
      alert('No items to save. Please configure your menu first.');
      return;
    }

    const newPreset: MenuPreset = {
      id: Math.random().toString(36).substr(2, 9),
      name: autoName,
      mode: planMode,
      createdAt: now.toISOString(),
      items
    };

    setPresets(prev => [newPreset, ...prev]);
    alert(`Preset saved as "${autoName}"!`);
  };

  const handleLoadPreset = () => {
    if (!selectedPresetId) {
      alert('Please select a preset to load');
      return;
    }

    const preset = presets.find(p => p.id === selectedPresetId);
    if (!preset) {
      alert('Preset not found');
      return;
    }

    // Switch to the preset's mode first
    if (preset.mode !== planMode) {
      setPlanMode(preset.mode);
    }

    // Load items based on preset mode
    if (preset.mode === 'full') {
      const newPrepValues: Record<string, { qty: number, price: number }> = {};
      preset.items.forEach(item => {
        newPrepValues[item.id] = { qty: item.qty, price: item.price };
      });
      setPrepValues(newPrepValues);
    } else {
      const newSlots = Array(slotCount).fill(null).map((_, index) => {
        const item = preset.items[index];
        return item
          ? { menuItemId: item.id, qty: item.qty, price: item.price }
          : { menuItemId: null, qty: 0, price: 15 };
      });
      setSlots(newSlots);
    }

    alert(`Preset "${preset.name}" loaded!`);
  };

  const handleDeletePreset = (presetId: string) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      setPresets(prev => prev.filter(p => p.id !== presetId));
      if (selectedPresetId === presetId) {
        setSelectedPresetId(null);
      }
      alert('Preset deleted');
    }
  };

  // Add Menu Item Handlers
  const handleAddMenuItem = () => {
    if (!newItemForm.name.trim()) {
      alert('Please enter a menu item name');
      return;
    }
    if (newItemForm.price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    const newItem: MenuItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemForm.name.trim(),
      description: newItemForm.description.trim() || undefined,
      category: newItemForm.category,
      price: newItemForm.price,
      isAvailable: false,
      dailyLimit: 10
    };

    addMenuItem(newItem);

    // Reset form
    setNewItemForm({
      name: '',
      description: '',
      category: 'Main',
      price: 15
    });
    setIsAddModalOpen(false);
    alert('Menu item added successfully!');
  };

  // Edit Menu Item Handlers
  const startEdit = (item: MenuItem) => {
    setIsEditing(item.id);
    setEditForm({ ...item });
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setEditForm(null);
  };

  const saveEdit = () => {
    if (!editForm) return;

    if (!editForm.name.trim()) {
      alert('Please enter a menu item name');
      return;
    }
    if (editForm.price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    updateMenu(editForm.id, editForm);
    setIsEditing(null);
    setEditForm(null);
    alert('Menu item updated successfully!');
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
              {/* Published Menu Lock */}
              {isPublished && (
                  <Card className="bg-green-50 border-green-200">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="bg-green-100 p-2 rounded-lg">
                                  <Save className="text-green-600" size={20} />
                              </div>
                              <div>
                                  <h3 className="font-bold text-green-900">Menu Published for Today</h3>
                                  <p className="text-xs text-green-700 mt-1">
                                      Your menu is live and available for orders. Edit with caution.
                                  </p>
                              </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={handleEditPublishedMenu} className="border-green-300 text-green-700 hover:bg-green-100">
                              <Edit2 size={14} className="mr-1" /> Edit Today's Menu
                          </Button>
                      </div>
                  </Card>
              )}

              {/* Menu Presets */}
              {!isLocked && presets.length > 0 && (
                  <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
                      <div className="flex items-center gap-3 mb-3">
                          <Clock className="text-cyan-600" size={20} />
                          <h3 className="font-bold text-slate-900">Saved Presets</h3>
                      </div>
                      <div className="flex gap-2">
                          <select
                              value={selectedPresetId || ''}
                              onChange={(e) => setSelectedPresetId(e.target.value || null)}
                              className="flex-1 border border-cyan-300 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          >
                              <option value="">Select a preset...</option>
                              {presets.map(preset => {
                                  const date = new Date(preset.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                  const mode = preset.mode === 'full' ? '📋' : '🎰';
                                  return (
                                      <option key={preset.id} value={preset.id}>
                                          {mode} {preset.name} ({preset.items.length} items)
                                      </option>
                                  );
                              })}
                          </select>
                          <Button size="sm" variant="primary" onClick={handleLoadPreset} className="whitespace-nowrap">
                              <Download size={14} className="mr-1" /> Load
                          </Button>
                          {selectedPresetId && (
                              <Button size="sm" variant="danger" onClick={() => handleDeletePreset(selectedPresetId)}>
                                  ✕
                              </Button>
                          )}
                      </div>
                  </Card>
              )}

              {/* Save Preset Button */}
              {!isLocked && (
                  <Button size="sm" variant="outline" fullWidth onClick={handleSavePreset} className="border-cyan-300 text-cyan-700 hover:bg-cyan-50">
                      <Save size={14} className="mr-1" /> Quick Save as Preset
                  </Button>
              )}

              {/* Mode Toggle */}
              <div className={`flex gap-2 bg-slate-100 p-1 rounded-lg ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                  <button
                      onClick={handleSwitchToFullMode}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                          planMode === 'full' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'
                      }`}
                  >
                      📋 Full Menu Mode
                  </button>
                  <button
                      onClick={handleSwitchToSlotMode}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                          planMode === 'slot' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'
                      }`}
                  >
                      🎰 Slot Mode
                  </button>
              </div>

              {/* Smart Recommendations */}
              {orders.length > 5 && (
                  <Card className={`bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 ${isLocked ? 'opacity-50' : ''}`}>
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

              {/* Full Menu Mode UI */}
              {planMode === 'full' && (
                  <div className={isLocked ? 'opacity-50 pointer-events-none' : ''}>
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
                                            type="text"
                                            inputMode="numeric"
                                            className="w-full border rounded p-1 text-center font-bold"
                                            value={val.qty}
                                            onChange={(e) => handlePrepChange(item.id, 'qty', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-20">
                                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Price</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
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
                  </div>
              )}

              {/* Slot Mode UI */}
              {planMode === 'slot' && (
                  <div className={isLocked ? 'opacity-50 pointer-events-none' : ''}>
                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-sm text-amber-800">
                          <p>📍 <strong>Slot Mode:</strong> Select menu items for each slot. Perfect for fixed menu rotations!</p>
                      </div>

                      {/* Slot Count Selector */}
                      <Card className="bg-white">
                          <label className="block text-sm font-bold text-slate-700 mb-2">Number of Slots</label>
                          <select
                              value={slotCount}
                              onChange={(e) => handleSlotCountChange(Number(e.target.value))}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          >
                              {[8, 9, 10, 11, 12, 13, 14, 15].map(num => (
                                  <option key={num} value={num}>{num} Slots</option>
                              ))}
                          </select>
                      </Card>

                      {/* Slots Grid */}
                      <div className="space-y-3">
                          {slots.map((slot, index) => {
                              const selectedItem = slot.menuItemId ? menu.find(m => m.id === slot.menuItemId) : null;

                              return (
                                  <Card key={index} className="transition-colors hover:border-sky-300">
                                      <div className="flex items-center gap-3">
                                          {/* Slot Number */}
                                          <div className="flex-shrink-0 w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center font-bold text-sky-700">
                                              {index + 1}
                                          </div>

                                          {/* Menu Item Dropdown */}
                                          <div className="flex-1">
                                              <select
                                                  value={slot.menuItemId || ''}
                                                  onChange={(e) => handleSlotChange(index, 'menuItemId', e.target.value)}
                                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium"
                                              >
                                                  <option value="">-- Select Item --</option>
                                                  {menu.map(item => (
                                                      <option key={item.id} value={item.id}>
                                                          {item.name} ({item.category})
                                                      </option>
                                                  ))}
                                              </select>
                                              {selectedItem && (
                                                  <p className="text-xs text-slate-500 mt-1">{selectedItem.description || 'No description'}</p>
                                              )}
                                          </div>

                                          {/* Quantity Input */}
                                          <div className="w-20">
                                              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Qty</label>
                                              <input
                                                  type="text"
                                                  inputMode="numeric"
                                                  value={slot.qty}
                                                  onChange={(e) => {
                                                      const val = e.target.value;
                                                      if (val === '' || !isNaN(Number(val))) {
                                                          handleSlotChange(index, 'qty', val === '' ? 0 : val);
                                                      }
                                                  }}
                                                  className="w-full border border-slate-300 rounded-lg p-2 text-center font-bold text-sm"
                                              />
                                          </div>

                                          {/* Price Input */}
                                          <div className="w-20">
                                              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Price</label>
                                              <input
                                                  type="text"
                                                  inputMode="numeric"
                                                  value={slot.price}
                                                  onChange={(e) => {
                                                      const val = e.target.value;
                                                      if (val === '' || !isNaN(Number(val))) {
                                                          handleSlotChange(index, 'price', val === '' ? 1 : val);
                                                      }
                                                  }}
                                                  className="w-full border border-slate-300 rounded-lg p-2 text-center text-sm"
                                              />
                                          </div>
                                      </div>
                                  </Card>
                              );
                          })}
                      </div>
                  </div>
              )}

              {/* Publish Button (both modes) - Only show when not locked */}
              {!isLocked && (
                  <div className="sticky bottom-20 md:bottom-6 pt-4">
                      <Button size="lg" fullWidth className="shadow-xl py-4" onClick={handlePublish}>
                          <Save className="mr-2" size={20} /> Publish Today's Menu
                      </Button>
                  </div>
              )}
          </div>
      )}

      {/* 2. RECIPES / MENU LIST */}
      {activeTab === 'recipes' && (
          <div className="space-y-3 animate-in fade-in">
              <div className="flex justify-between items-center mb-2">
                  <h2 className="font-bold text-slate-800">Master Menu List</h2>
                  <Button size="sm" variant="outline" onClick={() => setIsAddModalOpen(true)}>
                      <Plus size={16} className="mr-1" /> Add Item
                  </Button>
              </div>
              {menu.map(item => {
                  const isEditingThis = isEditing === item.id;
                  const formData = isEditingThis && editForm ? editForm : item;

                  return (
                      <Card key={item.id} className="p-3">
                          {!isEditingThis ? (
                              // View Mode
                              <div>
                                  <div className="flex justify-between items-start mb-2">
                                      <div className="flex-1">
                                          <p className="font-bold text-slate-900">{item.name}</p>
                                          <p className="text-xs text-slate-500">{item.description || 'No description'}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <Badge variant="neutral">{item.category}</Badge>
                                          <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>
                                              <Edit2 size={14} className="mr-1" /> Edit
                                          </Button>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                      <span className="text-sm font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded">
                                          {item.price} AED
                                      </span>
                                      <span className="text-xs text-slate-400">Limit: {item.dailyLimit || 10}</span>
                                  </div>
                              </div>
                          ) : (
                              // Edit Mode
                              <div className="space-y-3">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-700 mb-1">Name</label>
                                      <input
                                          type="text"
                                          value={formData.name}
                                          onChange={(e) => setEditForm({ ...formData, name: e.target.value })}
                                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                                      <textarea
                                          value={formData.description || ''}
                                          onChange={(e) => setEditForm({ ...formData, description: e.target.value })}
                                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                          rows={2}
                                      />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                      <div>
                                          <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                                          <select
                                              value={formData.category}
                                              onChange={(e) => setEditForm({ ...formData, category: e.target.value as any })}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                          >
                                              <option value="Main">Main</option>
                                              <option value="Dessert">Dessert</option>
                                              <option value="Snack">Snack</option>
                                              <option value="Beverage">Beverage</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-700 mb-1">Price (AED)</label>
                                          <input
                                              type="number"
                                              value={formData.price}
                                              onChange={(e) => setEditForm({ ...formData, price: Number(e.target.value) })}
                                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                              min="1"
                                          />
                                      </div>
                                  </div>
                                  <div className="flex gap-2">
                                      <Button size="sm" onClick={saveEdit} fullWidth>
                                          <Save size={14} className="mr-1" /> Save
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={cancelEdit} fullWidth>
                                          Cancel
                                      </Button>
                                  </div>
                              </div>
                          )}
                      </Card>
                  );
              })}
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

      {/* Add Menu Item Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Menu Item">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={newItemForm.name}
              onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
              placeholder="e.g., Honey Garlic Pork Ribs"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
            <textarea
              value={newItemForm.description}
              onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
              placeholder="Brief description of the dish..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Category *</label>
              <select
                value={newItemForm.category}
                onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value as any })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="Main">Main</option>
                <option value="Dessert">Dessert</option>
                <option value="Snack">Snack</option>
                <option value="Beverage">Beverage</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Price (AED) *</label>
              <input
                type="number"
                value={newItemForm.price}
                onChange={(e) => setNewItemForm({ ...newItemForm, price: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                min="1"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} fullWidth>
              Cancel
            </Button>
            <Button onClick={handleAddMenuItem} fullWidth>
              <Plus size={16} className="mr-1" /> Add Item
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
