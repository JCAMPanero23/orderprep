
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Modal } from '../components/UI';
import { Check, MessageCircle, Clock, Search, Copy, Send } from 'lucide-react';
import { Order } from '../types';

export const Payments: React.FC = () => {
  const { orders, markOrderPaid } = useAppStore();
  const [activeTab, setActiveTab] = useState<'unpaid' | 'paid' | 'all'>('unpaid');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Reminder Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

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
                                <h3 className="font-bold text-slate-900 text-lg">{order.customerName}</h3>
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
                                </>
                            ) : (
                                <div className="w-full flex gap-2">
                                    <div className="flex-1 bg-green-50 text-green-700 text-center py-1.5 rounded-lg text-sm font-medium border border-green-100 flex items-center justify-center gap-1">
                                        <Check size={14} /> Paid
                                    </div>
                                    <Button size="sm" variant="outline" className="border-green-200 text-green-700 bg-green-50" onClick={() => {
                                        const msg = `Hi ${order.customerName}! Payment of ${order.totalAmount} AED received with thanks! ✅`;
                                        window.open(`https://wa.me/${order.customerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                    }}>
                                        <Send size={14} /> Receipt
                                    </Button>
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
            
            <button onClick={() => sendWhatsApp(`Hi ${selectedOrder?.customerName}! 👋 Hope you enjoyed the food. Just a gentle reminder regarding the ${selectedOrder?.totalAmount} AED payment. Thanks!`)} className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-sky-500 hover:bg-sky-50 transition-all group">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800 text-sm">👋 Friendly Reminder</span>
                    <Copy size={14} className="text-slate-400 group-hover:text-sky-500" />
                </div>
                <p className="text-xs text-slate-500">Hi {selectedOrder?.customerName}! 👋 Hope you enjoyed...</p>
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
    </div>
  );
};
