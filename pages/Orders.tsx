
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Button, Modal } from '../components/UI';
import { User, Trash2, Banknote, Clock, ClipboardPaste, Phone } from 'lucide-react';
import { Order, MenuItem, Customer } from '../types';
import { confirmNonUAEPhone } from '../utils/phoneValidation';

export const Orders: React.FC = () => {
  const { menu, customers, orders, addOrder, getRemainingStock, markOrderReserved } = useAppStore();
  
  // POS State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerUnit, setCustomerUnit] = useState('');
  const [customerBuilding, setCustomerBuilding] = useState('');
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
    setCustomerUnit(customer.unitNumber || '');
    setCustomerBuilding(customer.building || '');
    setSelectedCustomer(customer);
    setShowCustomerResults(false);
  };

  const handleCheckout = (mode: 'reserve' | 'payCash' | 'payLater') => {
    if (cart.length === 0) return;

    // Validate UAE phone number for non-walk-in customers
    if (customerPhone && customerPhone !== 'N/A') {
      if (!confirmNonUAEPhone(customerPhone)) {
        return; // User cancelled, don't proceed
      }
    }

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

    // Walk-in = ONLY name entered (no phone or phone is N/A)
    // NOT walk-in = name + phone (with or without unit/building)
    const isWalkInOrder = !customerPhone || customerPhone.trim() === '' || customerPhone === 'N/A';

    // BUG FIX: Find existing customer by name or use selectedCustomer ID
    let customerId = selectedCustomer?.id;
    if (!customerId) {
      // Check if customer already exists by name (case-insensitive)
      const existingCustomer = customers.find(c => c.name.toLowerCase() === finalName.toLowerCase());
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Generate a new ID that will be used by addOrder to create the customer
        customerId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      }
    }

    const newOrder: Order = {
        id: Math.random().toString(36).substr(2, 9),
        customerId: customerId,
        customerName: finalName,
        customerPhone: customerPhone || 'N/A',
        items,
        totalAmount,
        originalAmount: isFlashSale ? originalTotal : undefined,
        discountAmount: isFlashSale ? discountAmount : undefined,
        isFlashSale: isFlashSale,
        status: mode === 'reserve' ? 'reserved' : 'completed',
        paymentStatus: mode === 'payCash' ? 'paid' : 'unpaid',
        deliveryDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isWalkIn: isWalkInOrder,
        reservedAt: mode === 'reserve' ? new Date().toISOString() : undefined,
        handedOverAt: (mode === 'payCash' || mode === 'payLater') ? new Date().toISOString() : undefined,
        paymentDate: mode === 'payCash' ? new Date().toISOString() : undefined,
        customerUnit: customerUnit.trim() || undefined,
        customerBuilding: customerBuilding.trim() || undefined
    };

    addOrder(newOrder);

    // Reset POS
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerUnit('');
    setCustomerBuilding('');
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

  // Get unique buildings for autocomplete
  const uniqueBuildings = Array.from(new Set(customers.map(c => c.building).filter(b => b && b.trim() !== '')));

  return (
    <div className="pb-32">
      {/* 1. Header */}
      <h1 className="text-xl font-bold text-slate-900 mb-1">Orders</h1>

      {/* 2. New Order Form Header with Paste Button */}
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-base font-bold text-slate-900">➕ Create New Order</h2>
        <Button
            variant="outline"
            size="sm"
            className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100"
            onClick={() => setPasteModalOpen(true)}
        >
            <ClipboardPaste size={16} className="mr-1" /> Paste
        </Button>
      </div>

      {/* 3. Customer Section */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-300 mb-2 relative z-20">
        <div className="flex items-center gap-2 mb-1.5">
            <User className="text-sky-600" size={16} />
            <h2 className="font-bold text-slate-900 text-sm">Who is buying?</h2>
        </div>

        <div className="space-y-1.5">
            {/* Name and Phone Row */}
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
                        className="w-full p-2 bg-white border-2 border-slate-300 rounded-lg focus:border-sky-500 focus:ring-0 outline-none font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal text-sm"
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
                                        {c.building && <span>Bldg {c.building}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1">
                     <div className="relative h-full">
                        <Phone className="absolute left-2 top-2.5 text-slate-400" size={14} />
                        <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="Phone"
                            className="w-full h-full pl-8 pr-2 py-2 bg-white border-2 border-slate-300 rounded-lg focus:border-sky-500 outline-none font-medium text-slate-900 text-sm"
                        />
                     </div>
                </div>
            </div>

            {/* Unit and Building Row */}
            <div className="flex gap-2">
                <div className="flex-1">
                    <input
                        type="text"
                        value={customerUnit}
                        onChange={(e) => setCustomerUnit(e.target.value)}
                        placeholder="Unit # (optional)"
                        className="w-full py-1.5 px-2 bg-white border-2 border-slate-300 rounded-lg focus:border-sky-500 outline-none text-slate-900 text-xs"
                    />
                </div>
                <div className="flex-1">
                    <input
                        type="text"
                        value={customerBuilding}
                        onChange={(e) => setCustomerBuilding(e.target.value)}
                        placeholder="Building"
                        list="building-suggestions"
                        className="w-full py-1.5 px-2 bg-white border-2 border-slate-300 rounded-lg focus:border-sky-500 outline-none text-slate-900 text-xs"
                    />
                    <datalist id="building-suggestions">
                        {uniqueBuildings.map((building, idx) => (
                            <option key={idx} value={building} />
                        ))}
                    </datalist>
                </div>
            </div>
        </div>
      </div>

      {/* 4. Menu Grid */}
      <div>
        <h2 className="font-bold text-slate-800 mb-1 text-sm">Today's Menu Items</h2>
        <div className="grid grid-cols-2 gap-2">
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
                        className={`relative p-2 rounded-lg border text-left transition-all active:scale-95 ${
                            isSoldOut
                                ? 'bg-slate-100 border-slate-200 opacity-60'
                                : 'bg-white border-slate-200 shadow-sm hover:border-sky-500'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-1.5">
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

      {/* 6. Sticky Cart Footer */}
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

            <div className="grid grid-cols-3 gap-2">
                <Button
                    fullWidth
                    className="py-3 flex flex-col items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-amber-500"
                    disabled={cart.length === 0 || !(selectedCustomer || (customerName.trim() && customerPhone.trim()))}
                    onClick={() => {
                      if (!selectedCustomer && !(customerName.trim() && customerPhone.trim())) {
                        alert('Please enter customer name and phone to reserve an order.');
                        return;
                      }
                      handleCheckout('reserve');
                    }}
                    title={!(selectedCustomer || (customerName.trim() && customerPhone.trim())) ? "Enter customer name and phone to reserve" : ""}
                >
                    <Clock size={18} />
                    <span className="text-xs font-bold">Reserve</span>
                </Button>
                <Button
                    fullWidth
                    className="py-3 flex flex-col items-center justify-center gap-1 bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-sky-500"
                    disabled={cart.length === 0 || !(selectedCustomer || (customerName.trim() && customerPhone.trim()))}
                    onClick={() => {
                      if (!selectedCustomer && !(customerName.trim() && customerPhone.trim())) {
                        alert('Please enter customer name and phone to hand over order.');
                        return;
                      }
                      handleCheckout('payLater');
                    }}
                    title={!(selectedCustomer || (customerName.trim() && customerPhone.trim())) ? "Enter customer name and phone" : ""}
                >
                    <Clock size={18} />
                    <span className="text-xs font-bold">Pay Later</span>
                </Button>
                <Button
                    variant="primary"
                    fullWidth
                    className="py-3 flex flex-col items-center justify-center gap-1 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200"
                    disabled={cart.length === 0}
                    onClick={() => handleCheckout('payCash')}
                >
                    <Banknote size={18} />
                    <span className="text-xs font-bold">Pay Cash</span>
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
