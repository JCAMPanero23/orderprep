
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Modal, Input } from '../components/UI';
import { Check, MessageCircle, Clock, Search, Copy, Send, Eye, UserPlus } from 'lucide-react';
import { Order, Customer } from '../types';
import { confirmNonUAEPhone } from '../utils/phoneValidation';

export const Payments: React.FC = () => {
  const { orders, customers, markOrderPaid, addCustomer, updateOrder } = useAppStore();
  const [activeTab, setActiveTab] = useState<'unpaid' | 'paid' | 'all'>('unpaid');
  const [searchTerm, setSearchTerm] = useState('');

  // Reminder Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Preview Order Modal State
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  // Convert to Customer Modal State
  const [convertOrder, setConvertOrder] = useState<Order | null>(null);
  const [convertForm, setConvertForm] = useState({
    name: '',
    phone: '',
    unitNumber: '',
    floor: '',
    building: '',
    location: ''
  });

  const filteredOrders = orders
    .filter(o => {
      if (activeTab === 'unpaid') return o.paymentStatus !== 'paid';
      if (activeTab === 'paid') return o.paymentStatus === 'paid';
      return true;
    })
    .filter(o => o.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleRemind = (order: Order) => {
    setSelectedOrder(order);
    setShowReminderModal(true);
  };

  const handleMarkPaid = (order: Order) => {
      if (window.confirm(`Mark ${order.totalAmount} AED as PAID from ${order.customerName}?`)) {
          markOrderPaid(order.id);
          // Auto trigger receipt offer?
          if (order.customerPhone !== 'N/A') {
              const sendReceipt = window.confirm("Send payment receipt via WhatsApp?");
              if (sendReceipt) {
                  const msg = `Hi ${order.customerName}! Payment of ${order.totalAmount} AED received with thanks! ✅`;
                  window.open(`https://wa.me/${order.customerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
              }
          }
      }
  };

  const sendWhatsApp = (message: string) => {
    if (!selectedOrder) return;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${selectedOrder.customerPhone}?text=${encoded}`, '_blank');
    setShowReminderModal(false);
  };

  const handleConvertToCustomer = (order: Order) => {
    // Pre-fill form with order data
    setConvertForm({
      name: order.customerName,
      phone: order.customerPhone,
      unitNumber: order.customerUnit || '',
      floor: order.customerFloor || '',
      building: order.customerBuilding || '',
      location: ''
    });
    setConvertOrder(order);
  };

  const handleSaveCustomer = () => {
    if (!convertOrder) return;

    // Validation
    if (!convertForm.name.trim()) {
      alert('Please enter customer name');
      return;
    }
    if (!convertForm.phone.trim()) {
      alert('Please enter phone number');
      return;
    }

    // Validate UAE phone number
    if (!confirmNonUAEPhone(convertForm.phone.trim())) {
      return; // User cancelled, don't proceed
    }

    // Create new customer
    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: convertForm.name.trim(),
      phone: convertForm.phone.trim(),
      unitNumber: convertForm.unitNumber.trim(),
      floor: convertForm.floor.trim(),
      building: convertForm.building.trim(),
      location: convertForm.location.trim(),
      totalSpent: convertOrder.totalAmount,
      totalOrders: 1
    };

    addCustomer(newCustomer);

    // Update order to link to new customer and remove walk-in flag
    updateOrder(convertOrder.id, {
      customerId: newCustomer.id,
      customerName: newCustomer.name,
      customerPhone: newCustomer.phone,
      isWalkIn: false,
      customerUnit: newCustomer.unitNumber,
      customerBuilding: newCustomer.building,
      customerFloor: newCustomer.floor
    });

    // Close modal and reset
    setConvertOrder(null);
    setConvertForm({ name: '', phone: '', unitNumber: '', floor: '', building: '', location: '' });
    alert(`Customer "${newCustomer.name}" created successfully!`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
             <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                <p className="text-xs text-red-600 uppercase font-bold tracking-wider">Unpaid</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                    {orders.filter(o => o.paymentStatus !== 'paid').reduce((sum, o) => sum + o.totalAmount, 0)} <span className="text-xs text-slate-500">AED</span>
                </p>
             </div>
             <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                <p className="text-xs text-green-600 uppercase font-bold tracking-wider">Collected</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                    {orders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalAmount, 0)} <span className="text-xs text-slate-500">AED</span>
                </p>
             </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
        {['unpaid', 'paid', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
        <input 
            type="text" 
            placeholder="Search customer..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
            <div className="text-center py-10">
                <p className="text-slate-500">No {activeTab} orders found.</p>
            </div>
        ) : (
            filteredOrders.map(order => {
                const daysOverdue = Math.floor((Date.now() - new Date(order.deliveryDate).getTime()) / (1000 * 60 * 60 * 24));
                return (
                    <Card key={order.id} className="relative overflow-hidden">
                        {order.paymentStatus === 'paid' && (
                             <div className="absolute top-0 right-0 p-2">
                                <Check className="text-green-500" size={20} />
                             </div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-900 text-lg">{order.customerName}</h3>
                                    {order.isWalkIn && (
                                        <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            WALK-IN
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500">{new Date(order.deliveryDate).toDateString()}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-slate-900">{order.totalAmount} AED</span>
                                {order.paymentStatus !== 'paid' && daysOverdue > 0 && (
                                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center justify-end gap-1">
                                        <Clock size={12} /> {daysOverdue} days overdue
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            {order.paymentStatus !== 'paid' ? (
                                <>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={() => handleMarkPaid(order)}
                                    >
                                        Mark Paid
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleRemind(order)}
                                    >
                                        <MessageCircle size={16} className="mr-1" /> Remind
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPreviewOrder(order)}
                                    >
                                        <Eye size={16} />
                                    </Button>
                                </>
                            ) : (
                                <div className="w-full space-y-2">
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-green-50 text-green-700 text-center py-1.5 rounded-lg text-sm font-medium border border-green-100 flex items-center justify-center gap-1">
                                            <Check size={14} /> Paid
                                        </div>
                                        <Button size="sm" variant="outline" className="border-green-200 text-green-700 bg-green-50" onClick={() => {
                                            const msg = `Hi ${order.customerName}! Payment of ${order.totalAmount} AED received with thanks! ✅`;
                                            window.open(`https://wa.me/${order.customerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                        }}>
                                            <Send size={14} /> Receipt
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPreviewOrder(order)}
                                        >
                                            <Eye size={16} />
                                        </Button>
                                    </div>
                                    {order.isWalkIn && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            fullWidth
                                            className="border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
                                            onClick={() => handleConvertToCustomer(order)}
                                        >
                                            <UserPlus size={14} className="mr-1" /> Convert to Customer
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                );
            })
        )}
      </div>

      {/* WhatsApp Reminder Modal */}
      <Modal 
        isOpen={showReminderModal} 
        onClose={() => setShowReminderModal(false)} 
        title="Send Reminder"
      >
        <div className="space-y-3">
            <p className="text-sm text-slate-600 mb-4">Choose a message template for <b>{selectedOrder?.customerName}</b>:</p>
            
            <button onClick={() => sendWhatsApp(`Hi ${selectedOrder?.customerName}! Hope you enjoyed the food. Just a gentle reminder regarding the ${selectedOrder?.totalAmount} AED payment. Thanks!`)} className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-sky-500 hover:bg-sky-50 transition-all group">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800 text-sm">👋 Friendly Reminder</span>
                    <Copy size={14} className="text-slate-400 group-hover:text-sky-500" />
                </div>
                <p className="text-xs text-slate-500">Hi {selectedOrder?.customerName}! Hope you enjoyed...</p>
            </button>
             <button onClick={() => sendWhatsApp(`Hello ${selectedOrder?.customerName}. This is a reminder for your outstanding balance of ${selectedOrder?.totalAmount} AED. Please settle at your earliest convenience. Thank you.`)} className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-sky-500 hover:bg-sky-50 transition-all group">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800 text-sm">👔 Professional</span>
                    <Copy size={14} className="text-slate-400 group-hover:text-sky-500" />
                </div>
                <p className="text-xs text-slate-500">Hello {selectedOrder?.customerName}. This is a reminder...</p>
            </button>
            <button onClick={() => sendWhatsApp(`${selectedOrder?.customerName}, this is a final notice regarding your outstanding payment of ${selectedOrder?.totalAmount} AED. We kindly request immediate settlement to continue service. Thank you for your understanding.`)} className="w-full text-left p-3 rounded-lg border border-red-200 hover:border-red-500 hover:bg-red-50 transition-all group">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-red-800 text-sm">⚠️ Final Notice</span>
                    <Copy size={14} className="text-slate-400 group-hover:text-red-500" />
                </div>
                <p className="text-xs text-slate-500">{selectedOrder?.customerName}, this is a final notice...</p>
            </button>
        </div>
      </Modal>

      {/* Preview Order Details Modal */}
      {previewOrder && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewOrder(null)}
          title="Order Details"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 font-medium">Customer</p>
                  <p className="font-bold text-slate-900">{previewOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Phone</p>
                  <p className="font-bold text-slate-900">{previewOrder.customerPhone}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Order Date</p>
                  <p className="font-bold text-slate-900">{new Date(previewOrder.deliveryDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Order ID</p>
                  <p className="font-bold text-slate-900 text-xs">#{previewOrder.id.substring(0, 8)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-600 font-medium mb-2">Items Ordered:</p>
              <div className="space-y-2">
                {previewOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity} × {item.priceAtOrder} AED</p>
                    </div>
                    <p className="font-bold text-slate-900">{item.quantity * item.priceAtOrder} AED</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-100 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <p className="font-bold text-slate-700">Total Amount</p>
                <p className="text-2xl font-bold text-slate-900">{previewOrder.totalAmount} AED</p>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-300">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-600">Payment Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    previewOrder.paymentStatus === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {previewOrder.paymentStatus === 'paid' ? '✓ PAID' : '⏳ UNPAID'}
                  </span>
                </div>
              </div>
            </div>

            <Button variant="ghost" fullWidth onClick={() => setPreviewOrder(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Convert to Customer Modal */}
      {convertOrder && (
        <Modal
          isOpen={true}
          onClose={() => {
            setConvertOrder(null);
            setConvertForm({ name: '', phone: '', unitNumber: '', floor: '', building: '', location: '' });
          }}
          title="Convert Walk-in to Customer"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Create a customer profile for this walk-in order.</p>

            <Input
              label="Name *"
              value={convertForm.name}
              onChange={e => setConvertForm(prev => ({...prev, name: e.target.value}))}
              placeholder="Customer name"
            />
            <Input
              label="Phone *"
              value={convertForm.phone}
              onChange={e => setConvertForm(prev => ({...prev, phone: e.target.value}))}
              placeholder="05XXXXXXXX"
              type="tel"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Unit #"
                value={convertForm.unitNumber}
                onChange={e => setConvertForm(prev => ({...prev, unitNumber: e.target.value}))}
                placeholder="501"
              />
              <Input
                label="Floor"
                value={convertForm.floor}
                onChange={e => setConvertForm(prev => ({...prev, floor: e.target.value}))}
                placeholder="5"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Building</label>
                <input
                  type="text"
                  value={convertForm.building}
                  onChange={e => setConvertForm(prev => ({...prev, building: e.target.value}))}
                  placeholder="A"
                  list="convert-building-suggestions"
                  className="w-full p-2 bg-white border-2 border-slate-300 rounded-lg focus:border-sky-500 outline-none text-slate-900 text-sm"
                />
                <datalist id="convert-building-suggestions">
                  {Array.from(new Set(customers.map(c => c.building).filter(b => b && b.trim() !== ''))).map((building, idx) => (
                    <option key={idx} value={building} />
                  ))}
                </datalist>
              </div>
            </div>
            <Input
              label="Location (Optional)"
              value={convertForm.location}
              onChange={e => setConvertForm(prev => ({...prev, location: e.target.value}))}
              placeholder="Reception, Lobby, etc."
            />
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setConvertOrder(null);
                  setConvertForm({ name: '', phone: '', unitNumber: '', floor: '', building: '', location: '' });
                }}
              >
                Cancel
              </Button>
              <Button fullWidth onClick={handleSaveCustomer}>
                Create Customer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
