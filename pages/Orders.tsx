
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Button, Modal } from '../components/UI';
import { User, Trash2, Banknote, Clock, ClipboardPaste, Phone, MapPin } from 'lucide-react';
import { Order, MenuItem, Customer } from '../types';

export const Orders: React.FC = () => {
  const { menu, customers, addOrder, getRemainingStock } = useAppStore();
  
  // POS State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cart, setCart] = useState<{item: MenuItem, qty: number}[]>([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [flashSaleDiscount, setFlashSaleDiscount] = useState(5);

  // WhatsApp Paste Modal
  const [isPasteModalOpen, setPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // Filter menu for available items
  const availableMenu = menu.filter(m => m.isAvailable && (m.dailyLimit || 0) > 0);

  const addToCart = (item: MenuItem, qty: number = 1) => {
    const stock = getRemainingStock(item.id);
    const currentInCart = cart.find(c => c.item.id === item.id)?.qty || 0;
    
    if (currentInCart + qty > stock) {
        alert("Not enough stock!");
        return; 
    }

    setCart(prev => {
        const existing = prev.find(c => c.item.id === item.id);
        if (existing) {
            return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + qty } : c);
        }
        return [...prev, { item, qty }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  };

  const selectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setSelectedCustomer(customer);
    setShowCustomerResults(false);
  };

  const handleCheckout = (isPaid: boolean) => {
    if (cart.length === 0) return;
    const finalName = customerName.trim() || 'Walk-in Customer';

    const items = cart.map(c => ({
        menuItemId: c.item.id,
        name: c.item.name,
        quantity: c.qty,
        priceAtOrder: c.item.price
    }));

    const originalTotal = items.reduce((sum, i) => sum + (i.priceAtOrder * i.quantity), 0);
    const discountAmount = isFlashSale ? flashSaleDiscount * cart.reduce((sum, c) => sum + c.qty, 0) : 0;
    const totalAmount = originalTotal - discountAmount;

    const newOrder: Order = {
        id: Math.random().toString(36).substr(2, 9),
        customerId: selectedCustomer?.id || Math.random().toString(36).substr(2, 9),
        customerName: finalName,
        customerPhone: customerPhone || 'N/A',
        items,
        totalAmount,
        originalAmount: isFlashSale ? originalTotal : undefined,
        discountAmount: isFlashSale ? discountAmount : undefined,
        isFlashSale: isFlashSale,
        status: isPaid ? 'delivered' : 'preparing',
        paymentStatus: isPaid ? 'paid' : 'unpaid',
        deliveryDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };

    addOrder(newOrder);

    // Reset POS
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setSelectedCustomer(null);
    setIsFlashSale(false);
    setFlashSaleDiscount(5);
  };

  const parseWhatsAppOrder = () => {
    // 1. Try to find customer name
    // Heuristic: Usually first line or after "Name:"
    const lines = pastedText.split('\n').filter(l => l.trim().length > 0);
    let foundName = '';
    let foundPhone = '';

    // 2. Try to match items
    const matchedItems: {item: MenuItem, qty: number}[] = [];
    
    // Simple heuristic: Look for menu item names in the text
    availableMenu.forEach(menuItem => {
        // Create regex for item name (case insensitive)
        const regex = new RegExp(menuItem.name.split(' ')[0], 'i'); // Match at least first word
        if (regex.test(pastedText)) {
             // Look for numbers near the item match? simpler: assume 1 unless digit found
             const lineWithItem = lines.find(l => regex.test(l));
             if (lineWithItem) {
                 const numbers = lineWithItem.match(/\d+/);
                 const qty = numbers ? parseInt(numbers[0]) : 1;
                 matchedItems.push({item: menuItem, qty});
             }
        }
    });

    if (matchedItems.length > 0) {
        matchedItems.forEach(m => addToCart(m.item, m.qty));
    }

    // Try to extract name (assume first line if short)
    if (lines.length > 0 && lines[0].length < 30) {
        foundName = lines[0].replace(/name[:\s-]*/i, '').trim();
    }
    
    // Try to extract phone
    const phoneMatch = pastedText.match(/(\+?971|05)\d+/);
    if (phoneMatch) foundPhone = phoneMatch[0];

    if (foundName) setCustomerName(foundName);
    if (foundPhone) setCustomerPhone(foundPhone);

    setPasteModalOpen(false);
    setPastedText('');
  };

  const totalCart = cart.reduce((sum, c) => sum + (c.item.price * c.qty), 0);

  // Filtered customers for autocomplete
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerName.toLowerCase()) && customerName.length > 1
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:h-auto">
      {/* 1. Header & WhatsApp Paste */}
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-2xl font-bold text-slate-900">New Order Ticket</h1>
        <Button 
            variant="outline" 
            size="sm" 
            className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100"
            onClick={() => setPasteModalOpen(true)}
        >
            <ClipboardPaste size={16} className="mr-1" /> Paste Order
        </Button>
      </div>

      {/* 2. Customer Section (Improved Contrast) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-300 mb-4 relative z-20">
        <div className="flex items-center gap-2 mb-2">
            <User className="text-sky-600" size={18} />
            <h2 className="font-bold text-slate-900">Who is buying?</h2>
        </div>
        
        <div className="flex gap-2">
            <div className="relative flex-1">
                <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                        setCustomerName(e.target.value);
                        setShowCustomerResults(true);
                        setSelectedCustomer(null); // Reset selection on edit
                    }}
                    placeholder="Name"
                    className="w-full p-3 bg-white border-2 border-slate-300 rounded-lg focus:border-sky-500 focus:ring-0 outline-none font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                />
                
                {/* Autocomplete Dropdown */}
                {showCustomerResults && filteredCustomers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-xl border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto z-50">
                        {filteredCustomers.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => selectCustomer(c)}
                                className="p-3 hover:bg-sky-50 cursor-pointer border-b border-slate-100 last:border-0"
                            >
                                <p className="font-bold text-slate-900">{c.name}</p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    {c.unitNumber && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-medium">Unit {c.unitNumber}</span>}
                                    <span>{c.location}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="w-1/3">
                 <div className="relative h-full">
                    <Phone className="absolute left-3 top-3.5 text-slate-400" size={16} />
                    <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Phone"
                        className="w-full h-full pl-9 pr-3 bg-white border-2 border-slate-300 rounded-lg focus:border-sky-500 outline-none font-medium text-slate-900 text-sm"
                    />
                 </div>
            </div>
        </div>
        
        {/* Customer Unit Info Display */}
        {selectedCustomer && selectedCustomer.unitNumber && (
            <div className="mt-2 flex items-center gap-1 text-sky-700 bg-sky-50 px-2 py-1 rounded-md text-sm inline-flex">
                <MapPin size={14} />
                <span>Unit: <b>{selectedCustomer.unitNumber}</b> ({selectedCustomer.location})</span>
            </div>
        )}
      </div>

      {/* 3. Menu Grid */}
      <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
        <h2 className="font-bold text-slate-800 mb-3 px-1">Today's Menu Items</h2>
        <div className="grid grid-cols-2 gap-3">
            {availableMenu.map(item => {
                const stock = getRemainingStock(item.id);
                const inCart = cart.find(c => c.item.id === item.id)?.qty || 0;
                const remaining = stock - inCart;
                const isSoldOut = remaining <= 0;

                return (
                    <button
                        key={item.id}
                        onClick={() => !isSoldOut && addToCart(item)}
                        disabled={isSoldOut}
                        className={`relative p-3 rounded-xl border text-left transition-all active:scale-95 ${
                            isSoldOut 
                                ? 'bg-slate-100 border-slate-200 opacity-60' 
                                : 'bg-white border-slate-200 shadow-sm hover:border-sky-500'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                                isSoldOut ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                            }`}>
                                {isSoldOut ? 'SOLD' : `${remaining} left`}
                            </span>
                            <span className="font-bold text-slate-900 text-lg">{item.price}</span>
                        </div>
                        <p className="font-bold text-slate-800 leading-tight line-clamp-2 h-10">{item.name}</p>
                        
                        {inCart > 0 && (
                            <div className="absolute -top-2 -right-2 bg-sky-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold shadow-md text-sm border-2 border-white">
                                {inCart}
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
      </div>

      {/* 4. Sticky Cart Footer */}
      <div className="fixed bottom-16 left-0 right-0 md:relative md:bottom-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30">
        <div className="max-w-2xl mx-auto">
            {/* Cart Summary */}
            {cart.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-2 border-b border-slate-100">
                    {cart.map((c, idx) => (
                        <div key={idx} className="flex-shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 flex items-center gap-2">
                            <span className="font-bold text-sky-600">{c.qty}x</span>
                            <span className="text-sm text-slate-700 truncate max-w-[100px]">{c.item.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); removeFromCart(c.item.id); }} className="text-red-400 hover:text-red-600">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Flash Sale Toggle */}
            {cart.length > 0 && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isFlashSale}
                            onChange={(e) => setIsFlashSale(e.target.checked)}
                            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                        />
                        <span className="font-bold text-amber-900 text-sm">⚡ Flash Sale Discount</span>
                    </label>
                    {isFlashSale && (
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="number"
                                value={flashSaleDiscount}
                                onChange={(e) => setFlashSaleDiscount(Number(e.target.value))}
                                className="w-20 px-2 py-1 border border-amber-300 rounded text-center font-bold"
                                min="1"
                                max="10"
                            />
                            <span className="text-xs text-amber-800">AED off per item</span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between mb-3">
                <span className="text-slate-500 font-medium">{cart.reduce((a, b) => a + b.qty, 0)} items</span>
                <div className="text-right">
                    {isFlashSale && (
                        <div className="text-sm text-slate-500 line-through">
                            {totalCart} AED
                        </div>
                    )}
                    <span className="text-3xl font-bold text-slate-900">
                        {isFlashSale ? totalCart - (flashSaleDiscount * cart.reduce((a, b) => a + b.qty, 0)) : totalCart}
                        <span className="text-sm font-normal text-slate-500"> AED</span>
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button 
                    variant="secondary" 
                    fullWidth 
                    className="py-3 flex items-center justify-center gap-2"
                    disabled={cart.length === 0}
                    onClick={() => handleCheckout(false)}
                >
                    <Clock size={18} /> Reserve
                </Button>
                <Button 
                    variant="primary" 
                    fullWidth 
                    className="py-3 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200"
                    disabled={cart.length === 0}
                    onClick={() => handleCheckout(true)}
                >
                    <Banknote size={18} /> Pay Cash
                </Button>
            </div>
        </div>
      </div>

      {/* WhatsApp Modal */}
      <Modal isOpen={isPasteModalOpen} onClose={() => setPasteModalOpen(false)} title="Paste WhatsApp Order">
        <div className="space-y-4">
            <p className="text-sm text-slate-500">Paste the text directly from WhatsApp. We will try to find the items and customer details.</p>
            <textarea
                className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                placeholder="Example: One honey pork ribs and 2 siomai for Sarah..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
            ></textarea>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPasteModalOpen(false)} fullWidth>Cancel</Button>
                <Button onClick={parseWhatsAppOrder} fullWidth>Process Text</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};
