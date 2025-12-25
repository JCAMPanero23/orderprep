
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Button, Modal } from '../components/UI';
import { WhatsAppSendModal } from '../components/WhatsAppSendModal';
import { CustomerDiscountModal } from '../components/CustomerDiscountModal';
import { User, Trash2, Banknote, Clock, ClipboardPaste, Phone, Check } from 'lucide-react';
import { Order, MenuItem, Customer, ParsedOrderResult } from '../types';
import { confirmNonUAEPhone } from '../utils/phoneValidation';
import { parseWhatsAppOrder } from '../utils/whatsappParser';
import { generateWhatsAppReceipt, generateReservationConfirmation, RECEIPT_TEMPLATES } from '../utils/receiptTemplates';

export const Orders: React.FC = () => {
  const { menu, customers, orders, addOrder, getRemainingStock, markOrderReserved, getFlashSalePrice, isItemOnFlashSale } = useAppStore();
  
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

  // Customer discount state
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'item' | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [itemDiscounts, setItemDiscounts] = useState<{[itemId: string]: number}>({});

  // WhatsApp Paste Modal
  const [isPasteModalOpen, setPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedOrderResult | null>(null);
  const [isPasteReviewModalOpen, setPasteReviewModalOpen] = useState(false);

  // WhatsApp Send Workflow
  const [whatsappSendModalOpen, setWhatsappSendModalOpen] = useState(false);
  const [orderConfirmationMessage, setOrderConfirmationMessage] = useState('');
  const [pendingOrderAction, setPendingOrderAction] = useState<{
    order: Order;
    action: 'paid' | 'unpaid';
  } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('friendly');
  const [isSoldOutMessage, setIsSoldOutMessage] = useState(false); // Track if sending sold-out message

  // Pending Order State (for deferring order creation until WhatsApp confirmation)
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);

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

    const items = cart.map(c => {
        // Use flash sale price if item is on flash sale, otherwise use regular price
        const flashPrice = getFlashSalePrice(c.item.id);
        const priceToUse = flashPrice ?? c.item.price;

        return {
            menuItemId: c.item.id,
            name: c.item.name,
            quantity: c.qty,
            priceAtOrder: priceToUse
        };
    });

    // Check if any items in cart are flash sale items
    const hasFlashSaleItems = cart.some(c => isItemOnFlashSale(c.item.id));

    // Calculate totals
    const finalTotal = items.reduce((sum, i) => sum + (i.priceAtOrder * i.quantity), 0);

    // For flash sale items, calculate the discount from original price
    let originalTotal = finalTotal;
    let discountAmount = 0;

    if (hasFlashSaleItems) {
        originalTotal = cart.reduce((sum, c) => {
            return sum + (c.item.price * c.qty);
        }, 0);
        discountAmount = originalTotal - finalTotal;
    }

    // Legacy manual flash sale discount (when user checks the flash sale checkbox)
    if (isFlashSale && !hasFlashSaleItems) {
        discountAmount = flashSaleDiscount * cart.reduce((sum, c) => sum + c.qty, 0);
        originalTotal = finalTotal + discountAmount;
    }

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
        originalAmount: (hasFlashSaleItems || isFlashSale) ? originalTotal : undefined,
        discountAmount: (hasFlashSaleItems || isFlashSale) ? discountAmount : undefined,
        isFlashSale: hasFlashSaleItems || isFlashSale,
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

    // CHANGE: For walk-in customers, create order immediately (no WhatsApp)
    if (isWalkInOrder) {
      addOrder(newOrder);
      // Clear cart and form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerUnit('');
      setCustomerBuilding('');
      setSelectedCustomer(null);
      setIsFlashSale(false);
      setFlashSaleDiscount(5);
      return;
    }

    // CHANGE: For non-walk-in, store as pending (don't save yet)
    setPendingOrder(newOrder);

    // Generate WhatsApp confirmation message
    // Use simple message for reservations, full receipt for completed orders
    const message = mode === 'reserve'
      ? generateReservationConfirmation(newOrder)
      : generateWhatsAppReceipt(newOrder, undefined, selectedTemplateId);

    setOrderConfirmationMessage(message);
    setPendingOrderAction({
      order: newOrder,
      action: mode === 'payCash' ? 'paid' : 'unpaid'
    });
    setIsSoldOutMessage(false); // This is an order confirmation, not a sold-out message
    setWhatsappSendModalOpen(true);

    // DON'T call addOrder() here for non-walk-in
    // DON'T clear cart here - wait for WhatsApp confirmation
  };

  // NEW: Handle WhatsApp confirmation (order confirmed)
  const handleWhatsAppConfirmed = () => {
    if (!pendingOrder) return;

    // NOW create the order
    addOrder(pendingOrder);

    // Clear pending order
    setPendingOrder(null);

    // Modal will handle cart clearing via existing logic
  };

  // NEW: Handle WhatsApp cancellation (user cancelled)
  const handleWhatsAppCancelled = () => {
    // Discard pending order without saving
    setPendingOrder(null);

    // Keep cart and customer selection intact
    // User can edit and try again
  };

  const handleParseWhatsAppOrder = () => {
    const result = parseWhatsAppOrder(pastedText, availableMenu);

    setParsedResult(result);
    setPasteModalOpen(false);
    setPasteReviewModalOpen(true);
    setPastedText('');
  };

  const handleApplyParsedOrder = () => {
    if (!parsedResult) return;

    // Apply customer info
    if (parsedResult.customerInfo.name) {
      setCustomerName(parsedResult.customerInfo.name);
    }
    if (parsedResult.customerInfo.phone) {
      setCustomerPhone(parsedResult.customerInfo.phone);
    }
    if (parsedResult.customerInfo.unitNumber) {
      setCustomerUnit(parsedResult.customerInfo.unitNumber);
    }
    if (parsedResult.customerInfo.building) {
      setCustomerBuilding(parsedResult.customerInfo.building);
    }

    // Add items to cart
    parsedResult.items.forEach(item => {
      if (item.selectedMatch) {
        addToCart(item.selectedMatch.menuItem, item.quantity);
      }
    });

    setPasteReviewModalOpen(false);
    setParsedResult(null);
  };

  // Handle sold-out item click - show modal with sold-out message
  const handleSoldOutClick = (soldOutItem: MenuItem) => {
    if (!customerPhone.trim()) {
      alert('Please enter customer phone number first to send WhatsApp notification');
      return;
    }

    // Generate sold-out message
    const availableItems = availableMenu
      .filter(item => {
        const stock = getRemainingStock(item.id);
        const inCart = cart.find(c => c.item.id === item.id)?.qty || 0;
        return (stock - inCart) > 0;
      })
      .map(item => ({
        name: item.name,
        category: item.category,
        stock: getRemainingStock(item.id) - (cart.find(c => c.item.id === item.id)?.qty || 0),
        price: item.price
      }));

    const message = generateSoldOutMessage(customerName || 'Customer', soldOutItem.name, availableItems);

    // Show WhatsApp modal instead of directly opening
    setOrderConfirmationMessage(message);
    setIsSoldOutMessage(true);
    setPendingOrderAction(null); // No order action for sold-out messages
    setWhatsappSendModalOpen(true);
  };

  // Generate sold-out message
  const generateSoldOutMessage = (
    customerName: string,
    soldOutItemName: string,
    availableItems: Array<{ name: string; category: string; stock: number; price: number }>
  ): string => {
    let message = `Hi ${customerName}! 👋\n\n`;
    message += `We're sorry, but *${soldOutItemName}* is sold out today. 😔\n\n`;
    message += `📋 *Here's what we still have available:*\n\n`;

    const mains = availableItems.filter(i => i.category === 'Main');
    const others = availableItems.filter(i => i.category !== 'Main');

    if (mains.length > 0) {
      message += `*Main Dishes (15 AED):*\n`;
      mains.forEach(item => {
        message += `• ${item.name} (${item.stock} left)\n`;
      });
      message += `\n`;
    }

    if (others.length > 0) {
      message += `*Desserts & Snacks (10 AED):*\n`;
      others.forEach(item => {
        message += `• ${item.name} (${item.stock} left)\n`;
      });
    }

    message += `\nWould you like to change your order? Just reply with your choice! 🙏`;

    return message;
  };

  // WhatsApp send confirmation callback
  const handleWhatsAppSendConfirmed = () => {
    if (isSoldOutMessage) {
      // For sold-out messages, just close the modal - don't clear cart
      setIsSoldOutMessage(false);
    } else if (pendingOrderAction) {
      // CHANGE: Call parent's confirm callback BEFORE clearing
      handleWhatsAppConfirmed();

      // For order confirmations, clear cart and form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerUnit('');
      setCustomerBuilding('');
      setSelectedCustomer(null);
      setIsFlashSale(false);
      setFlashSaleDiscount(5);
      setPendingOrderAction(null);
    }
  };

  // Template change callback
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);

    // Regenerate message with new template
    if (pendingOrderAction) {
      const message = generateWhatsAppReceipt(
        pendingOrderAction.order,
        undefined,
        templateId
      );
      setOrderConfirmationMessage(message);
    }
  };

  // Calculate cart total using flash sale prices when applicable
  const totalCart = cart.reduce((sum, c) => {
    const flashPrice = getFlashSalePrice(c.item.id);
    const priceToUse = flashPrice ?? c.item.price;
    return sum + (priceToUse * c.qty);
  }, 0);

  // Calculate original total (before flash sale) for displaying strikethrough
  const originalCart = cart.reduce((sum, c) => sum + (c.item.price * c.qty), 0);
  const hasFlashSaleItems = cart.some(c => getFlashSalePrice(c.item.id) !== null);

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
            className="text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed opacity-60"
            disabled
            title="WhatsApp Paste - Next Phase Development"
        >
            <ClipboardPaste size={16} className="mr-1" /> Paste (Coming Soon)
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
      <div className="mb-80">
        <h2 className="font-bold text-slate-800 mb-1 text-sm">Today's Menu Items</h2>
        <div className="grid grid-cols-2 gap-2">
            {availableMenu.map(item => {
                const stock = getRemainingStock(item.id);
                const inCart = cart.find(c => c.item.id === item.id)?.qty || 0;
                const remaining = stock - inCart;
                const isSoldOut = remaining <= 0;

                // Get flash sale price ONCE to avoid multiple calls
                const flashPrice = getFlashSalePrice(item.id);
                const onFlashSale = flashPrice !== null;
                const displayPrice = flashPrice ?? item.price;

                return (
                    <button
                        key={item.id}
                        onClick={() => isSoldOut ? handleSoldOutClick(item) : addToCart(item)}
                        className={`relative p-2 rounded-lg border text-left transition-all active:scale-95 ${
                            isSoldOut
                                ? 'bg-red-50 border-red-200 hover:border-red-400 cursor-pointer'
                                : onFlashSale
                                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 shadow-sm hover:border-amber-500'
                                : 'bg-white border-slate-200 shadow-sm hover:border-sky-500'
                        }`}
                    >
                        {/* Flash Sale Badge */}
                        {onFlashSale && !isSoldOut && (
                            <div className="absolute -top-2 -left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-10">
                                ⚡ SALE
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-1.5">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                                isSoldOut ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                            }`}>
                                {isSoldOut ? 'SOLD' : `${remaining} left`}
                            </span>
                            <div className="text-right min-w-[60px]">
                                {onFlashSale && !isSoldOut ? (
                                    // Flash Sale Price Display - ALWAYS show both prices for consistency
                                    <>
                                        <div className="text-base text-slate-400 line-through font-bold mb-0.5">
                                            {item.price}
                                        </div>
                                        <div className="font-bold text-2xl text-amber-600">
                                            {flashPrice}
                                        </div>
                                    </>
                                ) : (
                                    // Regular Price Display
                                    <span className="font-bold text-lg text-slate-900">
                                        {displayPrice}
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="font-bold text-slate-800 leading-tight line-clamp-2 h-10">{item.name}</p>

                        {isSoldOut && (
                            <p className="text-[10px] text-red-600 font-medium mt-1">
                                Tap to notify customer
                            </p>
                        )}

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
            
            {/* Customer-Specific Discount Toggle */}
            {cart.length > 0 && (
                <div className="mb-3 p-3 bg-sky-50 border border-sky-200 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isFlashSale}
                            onChange={(e) => setIsFlashSale(e.target.checked)}
                            className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="font-bold text-sky-900 text-sm">👤 Customer Discount</span>
                    </label>
                    {isFlashSale && (
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="number"
                                value={flashSaleDiscount}
                                onChange={(e) => setFlashSaleDiscount(Number(e.target.value))}
                                className="w-20 px-2 py-1 border border-sky-300 rounded text-center font-bold"
                                min="1"
                                max="10"
                            />
                            <span className="text-xs text-sky-800">AED off per item</span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between mb-3">
                <span className="text-slate-500 font-medium">{cart.reduce((a, b) => a + b.qty, 0)} items</span>
                <div className="text-right">
                    {(hasFlashSaleItems || isFlashSale) && (
                        <div className="text-sm text-slate-500 line-through">
                            {isFlashSale ? totalCart : originalCart} AED
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
                <Button onClick={handleParseWhatsAppOrder} fullWidth>Process Text</Button>
            </div>
        </div>
      </Modal>

      {/* WhatsApp Paste Review Modal */}
      <Modal
        isOpen={isPasteReviewModalOpen}
        onClose={() => setPasteReviewModalOpen(false)}
        title="Review Parsed Order"
      >
        {parsedResult && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Customer Info Section */}
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
              <h3 className="font-bold text-sky-900 text-sm mb-2">Customer Information</h3>
              <div className="space-y-2">
                {parsedResult.customerInfo.name && (
                  <div>
                    <label className="text-xs text-slate-600">Name</label>
                    <input
                      type="text"
                      value={parsedResult.customerInfo.name}
                      onChange={(e) => setParsedResult({
                        ...parsedResult,
                        customerInfo: { ...parsedResult.customerInfo, name: e.target.value }
                      })}
                      className="w-full border border-sky-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                )}
                {parsedResult.customerInfo.phone && (
                  <div>
                    <label className="text-xs text-slate-600">Phone</label>
                    <input
                      type="text"
                      value={parsedResult.customerInfo.phone}
                      onChange={(e) => setParsedResult({
                        ...parsedResult,
                        customerInfo: { ...parsedResult.customerInfo, phone: e.target.value }
                      })}
                      className="w-full border border-sky-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {parsedResult.customerInfo.unitNumber && (
                    <div>
                      <label className="text-xs text-slate-600">Unit</label>
                      <input
                        type="text"
                        value={parsedResult.customerInfo.unitNumber}
                        onChange={(e) => setParsedResult({
                          ...parsedResult,
                          customerInfo: { ...parsedResult.customerInfo, unitNumber: e.target.value }
                        })}
                        className="w-full border border-sky-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  )}
                  {parsedResult.customerInfo.building && (
                    <div>
                      <label className="text-xs text-slate-600">Building</label>
                      <input
                        type="text"
                        value={parsedResult.customerInfo.building}
                        onChange={(e) => setParsedResult({
                          ...parsedResult,
                          customerInfo: { ...parsedResult.customerInfo, building: e.target.value }
                        })}
                        className="w-full border border-sky-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Parsed Items Section */}
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">
                Detected Items ({parsedResult.items.length})
              </h3>
              <div className="space-y-3">
                {parsedResult.items.map((item, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1">
                          Original: <span className="italic">"{item.rawLine}"</span>
                        </p>
                        {item.confidence !== 'none' ? (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                item.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                item.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {item.confidence === 'high' ? '✓ High' :
                                 item.confidence === 'medium' ? '⚠ Medium' :
                                 '⚠ Low'} Confidence
                              </span>
                            </div>
                            {/* Match Selection Dropdown */}
                            <select
                              value={item.selectedMatch?.menuItem.id || ''}
                              onChange={(e) => {
                                const selected = item.matchResults.find(
                                  m => m.menuItem.id === e.target.value
                                );
                                const newItems = [...parsedResult.items];
                                newItems[index].selectedMatch = selected;
                                setParsedResult({ ...parsedResult, items: newItems });
                              }}
                              className="w-full border border-slate-300 rounded px-2 py-1 text-sm font-medium"
                            >
                              {item.matchResults.map(match => (
                                <option key={match.menuItem.id} value={match.menuItem.id}>
                                  {match.menuItem.name} ({match.score}% match on {match.matchedOn})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <p className="text-xs text-red-700 font-medium">
                              ❌ No matches found. Skip this item or add manually.
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Quantity Input */}
                      <div className="ml-3 w-16">
                        <label className="text-[10px] text-slate-500 block mb-1">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...parsedResult.items];
                            newItems[index].quantity = parseInt(e.target.value) || 1;
                            setParsedResult({ ...parsedResult, items: newItems });
                          }}
                          className="w-full border border-slate-300 rounded px-2 py-1 text-center font-bold text-sm"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="ghost" onClick={() => setPasteReviewModalOpen(false)} fullWidth>
                Cancel
              </Button>
              <Button onClick={handleApplyParsedOrder} fullWidth>
                <Check size={16} className="mr-1" /> Apply to Cart ({parsedResult.items.filter(i => i.selectedMatch).length} items)
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* WhatsApp Send Modal */}
      <WhatsAppSendModal
        isOpen={whatsappSendModalOpen}
        onClose={() => {
          handleWhatsAppCancelled();
          setWhatsappSendModalOpen(false);
        }}
        message={orderConfirmationMessage}
        customerPhone={customerPhone}
        customerName={customerName || 'Customer'}
        onConfirmSent={handleWhatsAppSendConfirmed}
        onTemplateChange={!isSoldOutMessage && pendingOrderAction?.action === 'paid' ? handleTemplateChange : undefined}
        availableTemplates={!isSoldOutMessage && pendingOrderAction?.action === 'paid' ? RECEIPT_TEMPLATES : undefined}
        currentTemplateId={!isSoldOutMessage && pendingOrderAction?.action === 'paid' ? selectedTemplateId : undefined}
      />
    </div>
  );
};
