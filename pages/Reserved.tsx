
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Button, Modal } from '../components/UI';
import { WhatsAppSendModal } from '../components/WhatsAppSendModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { MapPin, CheckCircle, XCircle, ArrowUpDown, DollarSign, ClockIcon } from 'lucide-react';
import { Order, SortOption } from '../types';
import { generateWhatsAppReceipt, RECEIPT_TEMPLATES } from '../utils/receiptTemplates';

export const Reserved: React.FC = () => {
  const { customers, orders, updateOrder, markOrderHandedOver, cancelOrderWithReason } = useAppStore();

  // Reserved Section State
  const [sortBy, setSortBy] = useState<SortOption>('floor-asc');

  // Hand Over Modal State
  const [handOverModalOrder, setHandOverModalOrder] = useState<Order | null>(null);

  // WhatsApp Send Modal State
  const [whatsappSendModalOpen, setWhatsappSendModalOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [whatsappCustomerPhone, setWhatsappCustomerPhone] = useState('');
  const [whatsappCustomerName, setWhatsappCustomerName] = useState('');
  const [pendingHandOverAction, setPendingHandOverAction] = useState<{
    order: Order;
    isPaid: boolean;
  } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('friendly');

  // Cancel Order Confirmation Modal State
  const [confirmCancelModal, setConfirmCancelModal] = useState<{
    isOpen: boolean;
    order: Order | null;
  }>({ isOpen: false, order: null });

  // Sorting utility function
  const sortReservedOrders = (orders: Order[], sortOption: SortOption): Order[] => {
    return [...orders].sort((a, b) => {
      const customerA = customers.find(c => c.id === a.customerId);
      const customerB = customers.find(c => c.id === b.customerId);

      const getFloor = (c?: typeof customers[0]) => parseInt(c?.floor || '999');
      const getBuilding = (c?: typeof customers[0]) => c?.building || 'ZZZ';
      const getUnit = (c?: typeof customers[0]) => parseInt(c?.unitNumber || '999');

      switch (sortOption) {
        case 'floor-asc':
          return getFloor(customerA) - getFloor(customerB);
        case 'floor-desc':
          return getFloor(customerB) - getFloor(customerA);
        case 'building-asc':
          return getBuilding(customerA).localeCompare(getBuilding(customerB));
        case 'building-desc':
          return getBuilding(customerB).localeCompare(getBuilding(customerA));
        case 'unit-asc':
          return getUnit(customerA) - getUnit(customerB);
        case 'unit-desc':
          return getUnit(customerB) - getUnit(customerA);
        case 'time-asc':
          return new Date(a.reservedAt || a.createdAt).getTime() - new Date(b.reservedAt || b.createdAt).getTime();
        case 'time-desc':
          return new Date(b.reservedAt || b.createdAt).getTime() - new Date(a.reservedAt || a.createdAt).getTime();
        default:
          return 0;
      }
    });
  };

  // Get reserved orders and sort them
  const reservedOrders = sortReservedOrders(
    orders.filter(o => o.status === 'reserved'),
    sortBy
  );

  // Time since reserved helper
  const getTimeSinceReserved = (reservedAt?: string) => {
    if (!reservedAt) return '';
    const minutes = Math.floor((Date.now() - new Date(reservedAt).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  // Hand Over handlers
  const handleHandOverPaidCash = (order: Order) => {
    // Disable WhatsApp workflow for walk-in customers
    if (order.isWalkIn) {
      alert('WhatsApp receipts are only available for registered customers');
      // Just complete the order without WhatsApp
      markOrderHandedOver(order.id);
      updateOrder(order.id, { paymentStatus: 'paid', paymentDate: new Date().toISOString() });
      return;
    }

    const phone = order.customerPhone === 'N/A' ? '' : order.customerPhone;
    if (!phone) {
      alert('No phone number available for this customer');
      return;
    }

    // Mark as completed and paid
    markOrderHandedOver(order.id);
    updateOrder(order.id, { paymentStatus: 'paid', paymentDate: new Date().toISOString() });

    // Generate receipt
    const customer = customers.find(c => c.id === order.customerId);
    const receipt = generateWhatsAppReceipt(order, customer, selectedTemplateId);

    // Show WhatsApp modal
    setWhatsappMessage(receipt);
    setWhatsappCustomerPhone(phone);
    setWhatsappCustomerName(order.customerName);
    setPendingHandOverAction({ order, isPaid: true });
    setHandOverModalOrder(null);
    setWhatsappSendModalOpen(true);
  };

  const handleHandOverPayLater = (order: Order) => {
    // Disable WhatsApp workflow for walk-in customers
    if (order.isWalkIn) {
      alert('WhatsApp messages are only available for registered customers');
      // Just complete the order without WhatsApp
      markOrderHandedOver(order.id);
      return;
    }

    const phone = order.customerPhone === 'N/A' ? '' : order.customerPhone;
    if (!phone) {
      alert('No phone number available for this customer');
      return;
    }

    // Mark as completed but unpaid
    markOrderHandedOver(order.id);

    // Generate thank you message with payment reminder
    const itemsList = order.items
      .map(item => `• ${item.quantity}x ${item.name} - ${item.priceAtOrder * item.quantity} AED`)
      .join('\n');

    const message = `Hi ${order.customerName}! 👋\n\nThanks for your order today! 🙏\n\n📦 Your Order:\n${itemsList}\n\n💰 Total: ${order.totalAmount} AED\n⏳ Payment: Pending\n\nPlease send payment when convenient. Thank you! 😊`;

    // Show WhatsApp modal
    setWhatsappMessage(message);
    setWhatsappCustomerPhone(phone);
    setWhatsappCustomerName(order.customerName);
    setPendingHandOverAction({ order, isPaid: false });
    setHandOverModalOrder(null);
    setWhatsappSendModalOpen(true);
  };

  // WhatsApp send confirmation callback
  const handleWhatsAppSendConfirmed = () => {
    setPendingHandOverAction(null);
  };

  // Template change callback
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);

    // Regenerate message with new template
    if (pendingHandOverAction && pendingHandOverAction.isPaid) {
      const customer = customers.find(c => c.id === pendingHandOverAction.order.customerId);
      const receipt = generateWhatsAppReceipt(
        pendingHandOverAction.order,
        customer,
        templateId
      );
      setWhatsappMessage(receipt);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:h-auto overflow-y-auto pb-32">
      {/* Header */}
      <h1 className="text-2xl font-bold text-slate-900 mb-3">Reserved Orders</h1>

      {/* Reserved Orders Section */}
      {reservedOrders.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
          <p className="text-slate-500 text-lg">No reserved orders at the moment</p>
          <p className="text-slate-400 text-sm mt-2">Reserved orders will appear here</p>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
              🔥 {reservedOrders.length} Reserved {reservedOrders.length === 1 ? 'Order' : 'Orders'}
            </h2>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="floor-asc">Floor ↑</option>
                <option value="floor-desc">Floor ↓</option>
                <option value="building-asc">Building A-Z</option>
                <option value="building-desc">Building Z-A</option>
                <option value="unit-asc">Unit ↑</option>
                <option value="unit-desc">Unit ↓</option>
                <option value="time-asc">Oldest First</option>
                <option value="time-desc">Newest First</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {reservedOrders.map(order => {
              const customer = customers.find(c => c.id === order.customerId);
              return (
                <div
                  key={order.id}
                  className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{order.customerName}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                        {customer?.floor && customer?.building && (
                          <span className="bg-amber-100 px-2 py-0.5 rounded font-medium text-amber-900">
                            Floor {customer.floor} - {customer.building}
                          </span>
                        )}
                        {customer?.unitNumber && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                            Unit {customer.unitNumber}
                          </span>
                        )}
                        {customer?.location && (
                          <span className="text-slate-500">
                            <MapPin size={12} className="inline" /> {customer.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{order.totalAmount} AED</p>
                      <p className="text-xs text-slate-500">{getTimeSinceReserved(order.reservedAt)}</p>
                    </div>
                  </div>

                  <div className="mb-3 text-sm text-slate-700">
                    {order.items.map((item, idx) => (
                      <div key={idx}>
                        • {item.quantity}x {item.name}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => setHandOverModalOrder(order)}
                    >
                      <CheckCircle size={16} className="mr-1" /> Hand Over
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirmCancelModal({ isOpen: true, order })}
                    >
                      <XCircle size={16} className="mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hand Over Confirmation Modal */}
      {handOverModalOrder && (
        <Modal
          isOpen={true}
          onClose={() => setHandOverModalOrder(null)}
          title={`Hand Over Food to ${handOverModalOrder.customerName}`}
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Order Summary:</p>
              {handOverModalOrder.items.map((item, idx) => (
                <div key={idx} className="text-sm text-slate-700">
                  • {item.quantity}x {item.name} - {item.priceAtOrder * item.quantity} AED
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-lg font-bold text-slate-900">
                  Total: {handOverModalOrder.totalAmount} AED
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 text-center">How was this order paid?</p>

            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="primary"
                fullWidth
                className="py-4 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                onClick={() => handleHandOverPaidCash(handOverModalOrder)}
              >
                <DollarSign size={20} />
                <div className="text-left">
                  <div className="font-bold">Paid by Cash</div>
                  <div className="text-xs opacity-90">Send receipt via WhatsApp</div>
                </div>
              </Button>

              <Button
                fullWidth
                className="py-4 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-500"
                onClick={() => handleHandOverPayLater(handOverModalOrder)}
              >
                <ClockIcon size={20} />
                <div className="text-left">
                  <div className="font-bold">Pay Later</div>
                  <div className="text-xs opacity-90">Send thank you + payment reminder</div>
                </div>
              </Button>

              <Button
                variant="ghost"
                fullWidth
                onClick={() => setHandOverModalOrder(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* WhatsApp Send Modal */}
      <WhatsAppSendModal
        isOpen={whatsappSendModalOpen}
        onClose={() => setWhatsappSendModalOpen(false)}
        message={whatsappMessage}
        customerPhone={whatsappCustomerPhone}
        customerName={whatsappCustomerName}
        onConfirmSent={handleWhatsAppSendConfirmed}
        onTemplateChange={pendingHandOverAction?.isPaid ? handleTemplateChange : undefined}
        availableTemplates={pendingHandOverAction?.isPaid ? RECEIPT_TEMPLATES : undefined}
        currentTemplateId={pendingHandOverAction?.isPaid ? selectedTemplateId : undefined}
      />

      {/* Cancel Order Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmCancelModal.isOpen}
        onClose={() => setConfirmCancelModal({ isOpen: false, order: null })}
        onConfirm={() => {
          if (confirmCancelModal.order) {
            cancelOrderWithReason(confirmCancelModal.order.id, 'Cancelled by user');
          }
          setConfirmCancelModal({ isOpen: false, order: null });
        }}
        title="Cancel Reserved Order?"
        message={`Cancel order for ${confirmCancelModal.order?.customerName}? Stock will be restored automatically.`}
        confirmLabel="Yes, Cancel Order"
        variant="danger"
        isDangerous={true}
      />
    </div>
  );
};
