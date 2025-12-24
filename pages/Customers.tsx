
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Input, Modal } from '../components/UI';
import { Users, Phone, MapPin, Edit2, AlertTriangle, CheckCircle, Clock, Ban, Search, X, Trash2 } from 'lucide-react';
import { Customer } from '../types';
import { confirmNonUAEPhone } from '../utils/phoneValidation';
import { getActiveOrders } from '../utils/orderFilters';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const Customers: React.FC = () => {
  const { customers, updateCustomer, addCustomer, deleteCustomer, orders } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [isAddCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    unitNumber: '',
    floor: '',
    building: '',
    location: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    customer: Customer | null;
  }>({ isOpen: false, customer: null });

  const startEdit = (c: Customer) => {
      setEditingId(c.id);
      setEditForm(c);
  };

  const saveEdit = () => {
      if (editingId) {
          updateCustomer(editingId, editForm);
          setEditingId(null);
      }
  };

  const handleAddCustomer = () => {
    // Validation
    if (!newCustomerForm.name.trim()) {
        alert("Please enter customer name");
        return;
    }
    if (!newCustomerForm.phone.trim()) {
        alert("Please enter phone number");
        return;
    }

    // Validate UAE phone number
    if (!confirmNonUAEPhone(newCustomerForm.phone.trim())) {
        return; // User cancelled, don't proceed
    }

    // Create new customer object
    const newCustomer: Customer = {
        id: `cust_${Date.now()}`,
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        unitNumber: newCustomerForm.unitNumber.trim(),
        floor: newCustomerForm.floor.trim(),
        building: newCustomerForm.building.trim(),
        location: newCustomerForm.location.trim(),
        totalSpent: 0,
        totalOrders: 0
    };

    // Add to store
    addCustomer(newCustomer);

    // Close modal and reset form
    setAddCustomerModalOpen(false);
    setNewCustomerForm({ name: '', phone: '', unitNumber: '', floor: '', building: '', location: '' });

    // Success feedback
    alert(`Customer "${newCustomer.name}" added successfully!`);
  };

  const getPaymentBehaviorBadge = (customer: Customer) => {
    const unpaidOrders = getActiveOrders(orders).filter(o => o.customerName === customer.name && o.paymentStatus !== 'paid');
    const unpaidTotal = unpaidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    if (unpaidTotal === 0) {
      return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Good', border: 'border-green-200' };
    } else if (unpaidTotal > 0 && unpaidTotal < 100) {
      return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Watch', border: 'border-yellow-200' };
    } else if (unpaidTotal >= 100) {
      return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', label: 'Risk', border: 'border-red-200' };
    }
    return { icon: CheckCircle, color: 'text-slate-400', bg: 'bg-slate-50', label: 'New', border: 'border-slate-200' };
  };

  const getCustomerUnpaid = (customerName: string) => {
    return getActiveOrders(orders)
      .filter(o => o.customerName === customerName && o.paymentStatus !== 'paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);
  };

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      (customer.unitNumber && customer.unitNumber.toLowerCase().includes(query)) ||
      (customer.floor && customer.floor.toLowerCase().includes(query)) ||
      (customer.building && customer.building.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="text-sky-600" size={24} />
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        </div>
        <Button onClick={() => setAddCustomerModalOpen(true)}>
          + Add Customer
        </Button>
      </div>

      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 -mx-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, phone, unit, floor, building..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-600 mt-2">
            Found {filteredCustomers.length} of {customers.length} customers
          </p>
        )}
      </div>

      <div className="space-y-3">
        {filteredCustomers.map(c => {
          const badge = getPaymentBehaviorBadge(c);
          const unpaid = getCustomerUnpaid(c.name);
          const BadgeIcon = badge.icon;

          return (
            <Card key={c.id} className={`${badge.border}`}>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-lg">{c.name}</h3>
                            <span className={`${badge.bg} ${badge.color} px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1`}>
                                <BadgeIcon size={10} /> {badge.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                            <span className="flex items-center gap-1 min-w-[140px]"><Phone size={14}/> {c.phone}</span>
                            <span className="flex items-center gap-1"><MapPin size={14}/> Unit {c.unitNumber || '?'}</span>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => startEdit(c)} className="text-sky-500 p-2 hover:bg-sky-50 rounded-full">
                            <Edit2 size={18} />
                        </button>
                        <button
                            onClick={() => setConfirmDeleteModal({ isOpen: true, customer: c })}
                            className="text-red-600 p-2 hover:bg-red-50 rounded-full"
                            title="Delete Customer"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
                {unpaid > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-red-700">UNPAID CREDIT</span>
                            <span className="text-lg font-bold text-red-800">{unpaid} AED</span>
                        </div>
                    </div>
                )}
                <div className="flex gap-4 text-xs">
                    <div>
                        <span className="block text-slate-400 font-bold uppercase">Total Spent</span>
                        <span className="font-bold text-slate-800">{c.totalSpent} AED</span>
                    </div>
                    <div>
                        <span className="block text-slate-400 font-bold uppercase">Orders</span>
                        <span className="font-bold text-slate-800">{c.totalOrders}</span>
                    </div>
                    <button
                        onClick={() => setViewingHistoryId(c.id)}
                        className="ml-auto text-sky-600 hover:text-sky-700 font-medium text-xs underline"
                    >
                        View History →
                    </button>
                </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Customer">
         <div className="space-y-4">
            <Input
                label="Name"
                value={editForm.name || ''}
                onChange={e => setEditForm(prev => ({...prev, name: e.target.value}))}
            />
            <Input
                label="Phone"
                value={editForm.phone || ''}
                onChange={e => setEditForm(prev => ({...prev, phone: e.target.value}))}
            />
            <div className="grid grid-cols-3 gap-2">
                <Input
                    label="Unit #"
                    value={editForm.unitNumber || ''}
                    onChange={e => setEditForm(prev => ({...prev, unitNumber: e.target.value}))}
                    placeholder="501"
                />
                <Input
                    label="Floor"
                    value={editForm.floor || ''}
                    onChange={e => setEditForm(prev => ({...prev, floor: e.target.value}))}
                    placeholder="5"
                />
                <Input
                    label="Building"
                    value={editForm.building || ''}
                    onChange={e => setEditForm(prev => ({...prev, building: e.target.value}))}
                    placeholder="A"
                />
            </div>
            <Input
                label="Location (Optional)"
                value={editForm.location || ''}
                onChange={e => setEditForm(prev => ({...prev, location: e.target.value}))}
                placeholder="Reception, Lobby, etc."
            />
            <div className="flex gap-2 pt-2">
                <Button variant="ghost" fullWidth onClick={() => setEditingId(null)}>Cancel</Button>
                <Button fullWidth onClick={saveEdit}>Save Changes</Button>
            </div>
         </div>
      </Modal>

      {/* Add New Customer Modal */}
      <Modal
        isOpen={isAddCustomerModalOpen}
        onClose={() => {
          setAddCustomerModalOpen(false);
          setNewCustomerForm({ name: '', phone: '', unitNumber: '', floor: '', building: '', location: '' });
        }}
        title="Add New Customer"
      >
        <div className="space-y-4">
          <Input
            label="Name *"
            value={newCustomerForm.name}
            onChange={e => setNewCustomerForm(prev => ({...prev, name: e.target.value}))}
            placeholder="Customer name"
          />
          <Input
            label="Phone *"
            value={newCustomerForm.phone}
            onChange={e => setNewCustomerForm(prev => ({...prev, phone: e.target.value}))}
            placeholder="05XXXXXXXX"
            type="tel"
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Unit #"
              value={newCustomerForm.unitNumber}
              onChange={e => setNewCustomerForm(prev => ({...prev, unitNumber: e.target.value}))}
              placeholder="501"
            />
            <Input
              label="Floor"
              value={newCustomerForm.floor}
              onChange={e => setNewCustomerForm(prev => ({...prev, floor: e.target.value}))}
              placeholder="5"
            />
            <Input
              label="Building"
              value={newCustomerForm.building}
              onChange={e => setNewCustomerForm(prev => ({...prev, building: e.target.value}))}
              placeholder="A"
            />
          </div>
          <Input
            label="Location (Optional)"
            value={newCustomerForm.location}
            onChange={e => setNewCustomerForm(prev => ({...prev, location: e.target.value}))}
            placeholder="Reception, Lobby, etc."
          />
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setAddCustomerModalOpen(false);
                setNewCustomerForm({ name: '', phone: '', unitNumber: '', floor: '', building: '', location: '' });
              }}
            >
              Cancel
            </Button>
            <Button fullWidth onClick={handleAddCustomer}>
              Add Customer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment History Modal */}
      {viewingHistoryId && (() => {
        const customer = customers.find(c => c.id === viewingHistoryId);
        if (!customer) return null;

        const customerOrders = getActiveOrders(orders).filter(o => o.customerName === customer.name).sort((a, b) =>
          new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
        );
        const unpaidCount = customerOrders.filter(o => o.paymentStatus !== 'paid').length;
        const paidCount = customerOrders.filter(o => o.paymentStatus === 'paid').length;

        return (
          <Modal isOpen={true} onClose={() => setViewingHistoryId(null)} title={`${customer.name}'s History`}>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <p className="text-xs text-slate-500 font-bold">Total Orders</p>
                  <p className="text-lg font-bold text-slate-900">{customer.totalOrders}</p>
                </div>
                <div className="bg-green-50 p-2 rounded-lg">
                  <p className="text-xs text-green-700 font-bold">Paid</p>
                  <p className="text-lg font-bold text-green-800">{paidCount}</p>
                </div>
                <div className="bg-red-50 p-2 rounded-lg">
                  <p className="text-xs text-red-700 font-bold">Unpaid</p>
                  <p className="text-lg font-bold text-red-800">{unpaidCount}</p>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {customerOrders.map(order => (
                  <div key={order.id} className={`p-3 rounded-lg border ${order.paymentStatus === 'paid' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-slate-600">{new Date(order.deliveryDate).toLocaleDateString()}</span>
                      <span className={`text-sm font-bold ${order.paymentStatus === 'paid' ? 'text-green-800' : 'text-red-800'}`}>
                        {order.totalAmount} AED
                      </span>
                    </div>
                    <div className="text-xs text-slate-700">
                      {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {order.paymentStatus === 'paid' ? (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle size={10} /> PAID
                        </span>
                      ) : (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <AlertTriangle size={10} /> UNPAID
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Delete Customer Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDeleteModal.isOpen}
        onClose={() => setConfirmDeleteModal({ isOpen: false, customer: null })}
        onConfirm={() => {
          if (!confirmDeleteModal.customer) return;

          const customerId = confirmDeleteModal.customer.id;
          const customerName = confirmDeleteModal.customer.name;

          // Check order count before deletion
          const activeOrderCount = getActiveOrders(orders).filter(
            o => o.customerId === customerId && o.paymentStatus === 'paid'
          ).length;

          const result = deleteCustomer(customerId);

          if (!result.success) {
            alert(result.error);
            throw new Error(result.error); // Prevent modal from closing
          }

          // Close modal
          setConfirmDeleteModal({ isOpen: false, customer: null });

          // Show success message after modal closes
          if (activeOrderCount > 0) {
            setTimeout(() => {
              alert(`Customer "${customerName}" deleted. ${activeOrderCount} paid order(s) transferred to Walk-in Customer.`);
            }, 100);
          }
        }}
        title="Delete Customer?"
        message={`Delete ${confirmDeleteModal.customer?.name}? ${
          getActiveOrders(orders).filter(o => o.customerId === confirmDeleteModal.customer?.id && o.paymentStatus === 'paid').length
        } paid order(s) will be transferred to Walk-in Customer.`}
        confirmLabel="Yes, Delete Customer"
        variant="danger"
        requiresTypeConfirmation={true}
        typeConfirmationWord="DELETE"
        isDangerous={true}
      />
    </div>
  );
};
