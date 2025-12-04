import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Modal } from '../components/UI';
import { Settings as SettingsIcon, AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const { resetDailyData, fullReset } = useAppStore();
  const [showDailyResetConfirm, setShowDailyResetConfirm] = useState(false);
  const [showFullResetConfirm, setShowFullResetConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDailyReset = () => {
    if (confirmText.toLowerCase() === 'reset') {
      resetDailyData();
      setShowDailyResetConfirm(false);
      setConfirmText('');
      alert('✅ Daily data has been reset!\n\n• All orders cleared\n• Menu daily limits reset\n• Customer order history reset\n• Customer contact info preserved\n• Menu items preserved\n• Inventory preserved');
    } else {
      alert('❌ Please type "RESET" to confirm');
    }
  };

  const handleFullReset = () => {
    if (confirmText.toLowerCase() === 'fullreset') {
      fullReset();
      setShowFullResetConfirm(false);
      setConfirmText('');
      alert('✅ Full reset complete!\n\n• All orders deleted\n• All customers deleted\n• Menu reset to default\n• Inventory reset to default');
    } else {
      alert('❌ Please type "FULLRESET" to confirm');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <SettingsIcon className="text-sky-600" size={24} />
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      {/* Reset Daily Data Section */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <RotateCcw className="text-amber-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg mb-1">Reset Daily Data</h3>
              <p className="text-sm text-slate-600 mb-3">
                Start fresh for a new day. This action will:
              </p>
              <ul className="text-sm text-slate-600 space-y-1 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <span><strong>Delete all orders</strong> (both paid and unpaid)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <span><strong>Reset menu daily limits</strong> (quantities cleared)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <span><strong>Reset customer order history</strong> (totalOrders and totalSpent set to 0)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span><strong>Keep customers</strong> (names, phone, addresses preserved)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span><strong>Keep menu items</strong> (items and prices preserved)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span><strong>Keep inventory</strong> (all inventory data preserved)</span>
                </li>
              </ul>
              <Button
                variant="secondary"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => setShowDailyResetConfirm(true)}
              >
                <RotateCcw size={16} className="mr-2" />
                Reset Daily Data
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Full Reset Section */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg mb-1 text-red-700">⚠️ Full Reset (Danger Zone)</h3>
              <p className="text-sm text-slate-600 mb-3">
                Reset everything to factory defaults. This action will:
              </p>
              <ul className="text-sm text-slate-600 space-y-1 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <span><strong>Delete ALL orders</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <span><strong>Delete ALL customers</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <span><strong>Reset menu to default</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <span><strong>Reset inventory to default</strong></span>
                </li>
              </ul>
              <Button
                variant="secondary"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setShowFullResetConfirm(true)}
              >
                <Trash2 size={16} className="mr-2" />
                Full Reset
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Daily Reset Confirmation Modal */}
      <Modal
        isOpen={showDailyResetConfirm}
        onClose={() => {
          setShowDailyResetConfirm(false);
          setConfirmText('');
        }}
        title="⚠️ Confirm Daily Reset"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-bold mb-2">
              ⚠️ WARNING: This action cannot be undone!
            </p>
            <p className="text-sm text-amber-700">
              All orders and customer order history will be permanently deleted. Customer contact info, menu items, and inventory will be preserved.
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-700 mb-2">
              Type <strong className="text-amber-600">RESET</strong> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESET"
              className="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-amber-500 outline-none text-center font-bold uppercase"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setShowDailyResetConfirm(false);
                setConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleDailyReset}
              disabled={confirmText.toLowerCase() !== 'reset'}
            >
              Reset Daily Data
            </Button>
          </div>
        </div>
      </Modal>

      {/* Full Reset Confirmation Modal */}
      <Modal
        isOpen={showFullResetConfirm}
        onClose={() => {
          setShowFullResetConfirm(false);
          setConfirmText('');
        }}
        title="🚨 Confirm Full Reset"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-bold mb-2">
              🚨 DANGER: This will delete EVERYTHING!
            </p>
            <p className="text-sm text-red-700">
              All orders, customers, custom menu items, and inventory data will be permanently deleted. The app will reset to factory defaults.
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-700 mb-2">
              Type <strong className="text-red-600">FULLRESET</strong> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type FULLRESET"
              className="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-red-500 outline-none text-center font-bold uppercase"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setShowFullResetConfirm(false);
                setConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleFullReset}
              disabled={confirmText.toLowerCase() !== 'fullreset'}
            >
              Full Reset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
