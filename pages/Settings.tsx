import React, { useState } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../AuthContext';
import { Card, Button, Modal } from '../components/UI';
import { BackupSettings } from '../components/BackupSettings';
import { Settings as SettingsIcon, AlertTriangle, RotateCcw, Trash2, Upload, FileSpreadsheet, User, LogOut } from 'lucide-react';

export const Settings: React.FC = () => {
  const { resetDailyData, fullReset, importMenuItems, importCustomers, menu, customers } = useAppStore();
  const { authState, logout } = useAuth();
  const [showDailyResetConfirm, setShowDailyResetConfirm] = useState(false);
  const [showFullResetConfirm, setShowFullResetConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Import state
  const [importResult, setImportResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    type: 'menu' | 'customers';
    data: any[];
    existingCount: number;
  } | null>(null);

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

  // CSV Import Handlers
  const handleMenuImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        // Skip header if present
        const dataLines = lines[0].toLowerCase().includes('name') ? lines.slice(1) : lines;

        const menuItems = dataLines.map((line, index) => {
          const parts = line.split(',').map(p => p.trim());
          if (parts.length < 3) {
            throw new Error(`Invalid format on line ${index + 1}. Expected: Name, Price, Daily Limit, Description`);
          }

          const [name, priceStr, dailyLimitStr, ...descParts] = parts;
          const price = parseFloat(priceStr);
          const dailyLimit = parseInt(dailyLimitStr);

          if (isNaN(price) || isNaN(dailyLimit)) {
            throw new Error(`Invalid price or daily limit on line ${index + 1}`);
          }

          return {
            id: `menu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name,
            price: price,
            dailyLimit: dailyLimit,
            category: 'Main',
            isAvailable: true,
            description: descParts.join(',').trim() || undefined
          };
        });

        // Check if there's existing menu data
        if (menu.length > 0) {
          setPendingImport({
            type: 'menu',
            data: menuItems,
            existingCount: menu.length
          });
        } else {
          // No existing data, import directly
          importMenuItems(menuItems, false);
          setImportResult({
            type: 'success',
            message: `Successfully imported ${menuItems.length} menu items!`
          });
        }

        // Clear the file input
        event.target.value = '';
      } catch (error) {
        setImportResult({
          type: 'error',
          message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    };
    reader.readAsText(file);
  };

  const handleCustomersImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        // Skip header if present
        const dataLines = lines[0].toLowerCase().includes('name') ? lines.slice(1) : lines;

        const newCustomers = dataLines.map((line, index) => {
          const parts = line.split(',').map(p => p.trim());
          if (parts.length < 5) {
            throw new Error(`Invalid format on line ${index + 1}. Expected: Name, Phone, Unit, Floor, Building`);
          }

          const [name, phone, unit, floor, building] = parts;

          return {
            id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name,
            phone: phone,
            unitNumber: unit,
            floor: floor,
            building: building,
            totalOrders: 0,
            totalSpent: 0
          };
        });

        // Check if there's existing customer data
        if (customers.length > 0) {
          setPendingImport({
            type: 'customers',
            data: newCustomers,
            existingCount: customers.length
          });
        } else {
          // No existing data, import directly
          importCustomers(newCustomers, false);
          setImportResult({
            type: 'success',
            message: `Successfully imported ${newCustomers.length} customers!`
          });
        }

        // Clear the file input
        event.target.value = '';
      } catch (error) {
        setImportResult({
          type: 'error',
          message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    };
    reader.readAsText(file);
  };

  // Handle import confirmation
  const handleImportConfirm = (replaceAll: boolean) => {
    if (!pendingImport) return;

    if (pendingImport.type === 'menu') {
      importMenuItems(pendingImport.data, replaceAll);
      setImportResult({
        type: 'success',
        message: replaceAll
          ? `Replaced all menu items with ${pendingImport.data.length} new items!`
          : `Added ${pendingImport.data.length} menu items to existing ${pendingImport.existingCount} items!`
      });
    } else {
      importCustomers(pendingImport.data, replaceAll);
      setImportResult({
        type: 'success',
        message: replaceAll
          ? `Replaced all customers with ${pendingImport.data.length} new customers!`
          : `Added ${pendingImport.data.length} customers to existing ${pendingImport.existingCount} customers!`
      });
    }

    setPendingImport(null);
  };

  const handleLogout = () => {
    const confirmed = window.confirm(
      '⚠️ LOG OUT\n\n' +
      'Are you sure you want to log out?\n\n' +
      'Your data will be saved and you can log back in anytime.'
    );

    if (confirmed) {
      logout();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <SettingsIcon className="text-sky-600" size={24} />
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      {/* Profile Section */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <User className="text-blue-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg mb-1">Profile Information</h3>
              <p className="text-sm text-slate-600 mb-3">
                Your account details
              </p>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Business Name</label>
              <p className="text-base text-slate-900 font-medium">{authState.user?.businessName}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Owner Name</label>
              <p className="text-base text-slate-900 font-medium">{authState.user?.ownerName}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <p className="text-base text-slate-900 font-medium">{authState.user?.email}</p>
            </div>

            {authState.user?.phone && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                <p className="text-base text-slate-900 font-medium">{authState.user.phone}</p>
              </div>
            )}

            {authState.user?.authProvider && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sign-in Method</label>
                <p className="text-base text-slate-900 font-medium capitalize">
                  {authState.user.authProvider === 'google' ? (
                    <span className="inline-flex items-center gap-2">
                      <span>Google</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Verified</span>
                    </span>
                  ) : (
                    'Email & Password'
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Logout Section */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <LogOut className="text-red-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg mb-1">Log Out</h3>
              <p className="text-sm text-slate-600 mb-3">
                Log out of your OrderPrep account. Your data will be saved and you can log back in anytime.
              </p>
              <Button
                variant="secondary"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleLogout}
              >
                <LogOut size={16} className="mr-2" />
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Backup System Section */}
      <BackupSettings />

      {/* Import Result Alert */}
      {importResult && (
        <div className={`p-4 rounded-lg border ${
          importResult.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium">{importResult.message}</p>
            <button
              onClick={() => setImportResult(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Import Data Section */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-sky-50 rounded-lg">
              <Upload className="text-sky-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg mb-1">Import Data from Google Sheets</h3>
              <p className="text-sm text-slate-600 mb-3">
                Quickly import menu items and customers from CSV files exported from Google Sheets.
              </p>
            </div>
          </div>

          {/* Menu Items Import */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-start gap-3 mb-3">
              <FileSpreadsheet className="text-green-600 mt-1" size={20} />
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 mb-1">Import Menu Items</h4>
                <p className="text-xs text-slate-600 mb-2">
                  CSV Format: <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">Name, Price, Daily Limit, Description</code>
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  Example: <span className="italic">Honey Pork Ribs, 25, 50, Slow cooked pork ribs in honey soy sauce</span>
                </p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleMenuImport}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100"
                    onClick={(e) => {
                      e.preventDefault();
                      (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                    }}
                  >
                    <Upload size={16} className="mr-2" />
                    Upload Menu CSV
                  </Button>
                </label>
              </div>
            </div>
          </div>

          {/* Customers Import */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-start gap-3 mb-3">
              <FileSpreadsheet className="text-blue-600 mt-1" size={20} />
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 mb-1">Import Customers</h4>
                <p className="text-xs text-slate-600 mb-2">
                  CSV Format: <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">Name, Phone, Unit, Floor, Building</code>
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  Example: <span className="italic">John Doe, 0501234567, 101, 5, A</span>
                </p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCustomersImport}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                    onClick={(e) => {
                      e.preventDefault();
                      (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                    }}
                  >
                    <Upload size={16} className="mr-2" />
                    Upload Customers CSV
                  </Button>
                </label>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
            <p className="font-bold mb-2">How to export from Google Sheets:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Open your Google Sheet</li>
              <li>Click File → Download → Comma Separated Values (.csv)</li>
              <li>Upload the CSV file using the buttons above</li>
            </ol>
          </div>
        </div>
      </Card>

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

      {/* Import Confirmation Modal */}
      {pendingImport && (
        <Modal
          isOpen={true}
          onClose={() => setPendingImport(null)}
          title="Existing Data Found"
        >
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 font-bold mb-2">
                ⚠️ You already have {pendingImport.existingCount} {pendingImport.type === 'menu' ? 'menu items' : 'customers'}
              </p>
              <p className="text-sm text-amber-700">
                You're importing {pendingImport.data.length} new {pendingImport.type === 'menu' ? 'menu items' : 'customers'}.
                What would you like to do?
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                className="py-3 bg-sky-600 hover:bg-sky-700"
                onClick={() => handleImportConfirm(false)}
              >
                <div className="text-left w-full">
                  <div className="font-bold">Add to Existing</div>
                  <div className="text-xs opacity-90">
                    Keep current {pendingImport.type} and add {pendingImport.data.length} new items
                  </div>
                </div>
              </Button>

              <Button
                variant="secondary"
                fullWidth
                className="py-3 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleImportConfirm(true)}
              >
                <div className="text-left w-full">
                  <div className="font-bold">Replace All</div>
                  <div className="text-xs opacity-90">
                    Delete all {pendingImport.existingCount} existing and replace with {pendingImport.data.length} new items
                  </div>
                </div>
              </Button>

              <Button
                variant="ghost"
                fullWidth
                onClick={() => setPendingImport(null)}
              >
                Cancel Import
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
