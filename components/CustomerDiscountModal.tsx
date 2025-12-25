import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from './UI';
import { MenuItem } from '../types';
import { X } from 'lucide-react';

interface CustomerDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: { item: MenuItem; qty: number }[];
  getFlashSalePrice: (itemId: string) => number | null;
  onApplyDiscount: (
    type: 'percentage' | 'item',
    percentage: number,
    itemDiscounts: { [itemId: string]: number }
  ) => void;
}

export const CustomerDiscountModal: React.FC<CustomerDiscountModalProps> = ({
  isOpen,
  onClose,
  cart,
  getFlashSalePrice,
  onApplyDiscount
}) => {
  const [activeTab, setActiveTab] = useState<'percentage' | 'item'>('percentage');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [itemDiscounts, setItemDiscounts] = useState<{ [itemId: string]: number }>({});

  // Calculate totals
  const originalTotal = cart.reduce((sum, c) => sum + (c.item.price * c.qty), 0);

  const calculateDiscount = (): number => {
    if (activeTab === 'percentage') {
      return originalTotal * (discountPercentage / 100);
    } else {
      return cart.reduce((sum, c) => {
        const itemDiscount = itemDiscounts[c.item.id] || 0;
        return sum + (itemDiscount * c.qty);
      }, 0);
    }
  };

  const discountAmount = calculateDiscount();
  const finalTotal = Math.max(0, originalTotal - discountAmount);

  // Count flash sale items for warning
  const flashSaleCount = cart.filter(c => getFlashSalePrice(c.item.id) !== null).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Apply Customer Discount</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('percentage')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'percentage'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            % Discount
          </button>
          <button
            onClick={() => setActiveTab('item')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'item'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Item Discounts
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 space-y-4">
          {activeTab === 'percentage' && (
            <div className="space-y-4">
              {/* Percentage Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Discount Percentage
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercentage}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value)));
                      setDiscountPercentage(val);
                    }}
                    className="flex-1 px-4 py-3 text-lg font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0"
                  />
                  <span className="text-2xl font-bold text-slate-600">%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Enter a value between 0-100</p>
              </div>

              {/* Live Preview */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Original Total:</span>
                  <span className="font-medium">{originalTotal.toFixed(0)} AED</span>
                </div>
                {discountPercentage > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-600">Discount ({discountPercentage}%):</span>
                      <span className="font-medium text-purple-600">-{discountAmount.toFixed(0)} AED</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between">
                      <span className="font-bold text-slate-900">Final Total:</span>
                      <span className="font-bold text-lg text-green-600">{finalTotal.toFixed(0)} AED</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'item' && (
            <div className="text-slate-500">
              Item-by-item discount coming next...
            </div>
          )}
        </div>

        {/* Flash Sale Warning */}
        {flashSaleCount > 0 && (
          <div className="mx-4 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              ⚠️ Will override {flashSaleCount} flash sale {flashSaleCount === 1 ? 'item' : 'items'}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onApplyDiscount(activeTab, discountPercentage, itemDiscounts);
              onClose();
            }}
            className="flex-1"
          >
            Apply Discount
          </Button>
        </div>
      </div>
    </div>
  );
};
