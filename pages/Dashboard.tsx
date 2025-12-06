import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Modal } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Copy, Check, TrendingUp, AlertTriangle, Zap } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { orders, menu, getRemainingStock } = useAppStore();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Flash Sale Modal State
  const [showFlashSaleModal, setShowFlashSaleModal] = useState(false);
  const [flashSaleItems, setFlashSaleItems] = useState<{[key: string]: {selected: boolean, price: number}}>({});
  const [flashSaleCopied, setFlashSaleCopied] = useState(false);

  // Stats Logic
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.deliveryDate.startsWith(today) && o.status !== 'cancelled');
  const totalRevenue = orders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalAmount, 0);
  const unpaidTotal = orders.filter(o => o.paymentStatus !== 'paid').reduce((sum, o) => sum + o.totalAmount, 0);

  // Flash Sale Impact
  const flashSaleOrders = orders.filter(o => o.isFlashSale);
  const totalFlashSaleLoss = flashSaleOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  const flashSaleCountToday = todayOrders.filter(o => o.isFlashSale).length;

  // Filter Active Menu
  const mains = menu.filter(m => m.category === 'Main' && m.isAvailable);
  const others = menu.filter(m => m.category !== 'Main' && m.isAvailable);

  const generateWhatsAppMenu = () => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayName = days[new Date().getDay()];
    
    let text = `*MENU FOR ${dayName}*\n(Todays Lunch item)\n\n`;
    
    text += `*Main menu: 15aed*\n`;
    mains.forEach(item => {
        const stock = getRemainingStock(item.id);
        if (stock > 0) {
            text += `*${item.name.toUpperCase()}*\n—${item.description || ''}\n\n`;
        }
    });

    text += `*DESSERTS & SNACKS: 10aed*\n`;
    others.forEach(item => {
        const stock = getRemainingStock(item.id);
        if (stock > 0) {
            text += `${item.name}\n`;
        }
    });

    return text;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateWhatsAppMenu());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers or when clipboard API is not available
      const text = generateWhatsAppMenu();
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        alert('Failed to copy. Please try again.');
      }
      document.body.removeChild(textarea);
    }
  };

  // Flash Sale Functions
  const handleOpenFlashSale = () => {
    // Initialize flash sale items with available stock
    const availableItems = menu.filter(m => m.isAvailable && getRemainingStock(m.id) > 0);
    const initialItems: {[key: string]: {selected: boolean, price: number}} = {};
    availableItems.forEach(item => {
      initialItems[item.id] = {
        selected: false,
        price: item.price - 5 // Default 5 AED discount
      };
    });
    setFlashSaleItems(initialItems);
    setShowFlashSaleModal(true);
  };

  const toggleFlashSaleItem = (itemId: string) => {
    setFlashSaleItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId].selected }
    }));
  };

  const updateFlashSalePrice = (itemId: string, price: number) => {
    setFlashSaleItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], price }
    }));
  };

  const generateFlashSaleMenu = () => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayName = days[new Date().getDay()];

    let text = `*${dayName} Flash Sale!!*\n\n(Todays Lunch item)\n\n`;

    const selectedMains = menu.filter(m => m.category === 'Main' && m.isAvailable && flashSaleItems[m.id]?.selected);
    const selectedOthers = menu.filter(m => m.category !== 'Main' && m.isAvailable && flashSaleItems[m.id]?.selected);

    if (selectedMains.length > 0) {
      text += `*Main menu:*\n`;
      selectedMains.forEach(item => {
        const stock = getRemainingStock(item.id);
        if (stock > 0) {
          const flashPrice = flashSaleItems[item.id].price;
          text += `*${item.name.toUpperCase()}* ${flashPrice}aed only!*\n—${item.description || ''}\n\n`;
        }
      });
    }

    if (selectedOthers.length > 0) {
      text += `*DESSERTS & SNACKS:*\n`;
      selectedOthers.forEach(item => {
        const stock = getRemainingStock(item.id);
        if (stock > 0) {
          const flashPrice = flashSaleItems[item.id].price;
          text += `*${item.name}* ${flashPrice}aed only!*\n`;
        }
      });
    }

    return text;
  };

  const copyFlashSaleToClipboard = async () => {
    const selectedCount = Object.values(flashSaleItems).filter(item => item.selected).length;
    if (selectedCount === 0) {
      alert('Please select at least one item for flash sale');
      return;
    }

    try {
      await navigator.clipboard.writeText(generateFlashSaleMenu());
      setFlashSaleCopied(true);
      setTimeout(() => setFlashSaleCopied(false), 2000);
    } catch (err) {
      const text = generateFlashSaleMenu();
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setFlashSaleCopied(true);
        setTimeout(() => setFlashSaleCopied(false), 2000);
      } catch (fallbackErr) {
        alert('Failed to copy. Please try again.');
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="space-y-6">
      {/* Flash Sale Warning */}
      {totalFlashSaleLoss > 0 && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-start gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Zap className="text-amber-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 text-sm">Flash Sale Impact</h3>
              <p className="text-xs text-amber-700 mt-1">
                You've lost <span className="font-bold">{totalFlashSaleLoss} AED</span> to flash sale discounts
                {flashSaleCountToday > 0 && <span> ({flashSaleCountToday} today)</span>}
              </p>
              <p className="text-xs text-amber-600 mt-2 italic">
                💡 Tip: Use pre-orders to reduce leftovers and avoid discounting
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 1. Quick Stats Header */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-slate-900 text-white border-none p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Total Sales</p>
            <div className="flex items-end justify-between mt-1">
                <h3 className="text-2xl font-bold">{todayOrders.length}</h3>
                <ShoppingBag className="text-sky-400 opacity-80" size={20} />
            </div>
            <p className="text-xs text-slate-400 mt-2">Orders Today</p>
        </Card>
        <div className="grid grid-rows-2 gap-3">
            <Card className="bg-green-50 border-green-100 p-3 flex justify-between items-center">
                <div>
                    <p className="text-xs font-bold text-green-700 uppercase">Cash In</p>
                    <p className="font-bold text-slate-900">{totalRevenue} AED</p>
                </div>
                <TrendingUp size={16} className="text-green-500" />
            </Card>
            <Card className="bg-red-50 border-red-100 p-3 flex justify-between items-center cursor-pointer" onClick={() => navigate('/payments')}>
                <div>
                    <p className="text-xs font-bold text-red-700 uppercase">Unpaid</p>
                    <p className="font-bold text-slate-900">{unpaidTotal} AED</p>
                </div>
                <div className="bg-red-100 rounded-full px-2 py-0.5 text-[10px] font-bold text-red-700">Collect</div>
            </Card>
        </div>
      </div>

      {/* 2. Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          fullWidth
          size="lg"
          className="py-4 text-base shadow-lg shadow-sky-200"
          onClick={() => navigate('/orders')}
        >
          <ShoppingBag size={18} className="mr-1" /> Quick Sell
        </Button>
        <Button
          fullWidth
          size="lg"
          className="py-4 text-base bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200"
          onClick={handleOpenFlashSale}
          title="Create a flash sale offer to clear inventory"
        >
          <Zap size={18} className="mr-1" /> Flash Sale
        </Button>
      </div>

      {/* 3. Live Inventory */}
      <div>
        <h2 className="font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span>Live Stock</span>
            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">Resets Daily</span>
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {menu.filter(m => m.isAvailable).map(item => {
                const stock = getRemainingStock(item.id);
                const percent = (stock / (item.dailyLimit || 10)) * 100;
                
                return (
                    <div key={item.id} className="p-3 flex items-center justify-between">
                        <div className="flex-1">
                            <p className="font-medium text-slate-800 text-sm">{item.name}</p>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden max-w-[100px]">
                                <div 
                                    className={`h-full rounded-full ${stock < 3 ? 'bg-red-500' : 'bg-green-500'}`} 
                                    style={{width: `${percent}%`}}
                                ></div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-lg font-bold ${stock === 0 ? 'text-slate-300' : 'text-slate-900'}`}>
                                {stock}
                            </span>
                            <span className="text-xs text-slate-400 block">left</span>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* 4. WhatsApp Menu Generator */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
        <div className="flex justify-between items-start mb-3">
            <div>
                <h3 className="font-bold text-emerald-900">WhatsApp Menu</h3>
                <p className="text-xs text-emerald-700 mt-1">Auto-generated from available stock</p>
            </div>
            <Button size="sm" onClick={copyToClipboard} className="bg-emerald-600 hover:bg-emerald-700 border-none text-white">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
            </Button>
        </div>
        <div className="bg-white/60 p-3 rounded-lg border border-emerald-100/50">
            <pre className="text-[10px] text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                {generateWhatsAppMenu()}
            </pre>
        </div>
      </Card>

      {/* Flash Sale Modal */}
      <Modal
        isOpen={showFlashSaleModal}
        onClose={() => setShowFlashSaleModal(false)}
        title="Create Flash Sale Menu"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Select items and set flash sale prices:</p>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {menu.filter(m => m.isAvailable && getRemainingStock(m.id) > 0).map(item => {
              const stock = getRemainingStock(item.id);
              return (
                <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={flashSaleItems[item.id]?.selected || false}
                      onChange={() => toggleFlashSaleItem(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-slate-900">{item.name}</h4>
                          <p className="text-xs text-slate-500">{item.description}</p>
                          <p className="text-xs text-amber-600 mt-1">Stock: {stock} left</p>
                        </div>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded font-medium">
                          Original: {item.price} AED
                        </span>
                      </div>
                      {flashSaleItems[item.id]?.selected && (
                        <div className="flex items-center gap-2 mt-2">
                          <label className="text-xs font-medium text-slate-700">Flash Price:</label>
                          <input
                            type="number"
                            value={flashSaleItems[item.id]?.price || 0}
                            onChange={(e) => updateFlashSalePrice(item.id, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-amber-300 rounded text-sm font-bold text-amber-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            min="0"
                          />
                          <span className="text-xs text-slate-500">AED</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t pt-3">
            <h4 className="font-bold text-sm mb-2">Preview:</h4>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
              <pre className="text-[10px] text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                {generateFlashSaleMenu()}
              </pre>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setShowFlashSaleModal(false)}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              className="bg-amber-500 hover:bg-amber-600"
              onClick={() => {
                copyFlashSaleToClipboard();
                setShowFlashSaleModal(false);
              }}
            >
              {flashSaleCopied ? <Check size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
              {flashSaleCopied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};