
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Order, MenuItem, Customer, Ingredient } from './types';

interface FlashSaleItem {
  price: number;
  expiresAt: string;
}

interface AppState {
  orders: Order[];
  menu: MenuItem[];
  customers: Customer[];
  inventory: Ingredient[];
  flashSaleItems: { [menuItemId: string]: FlashSaleItem };

  // Actions
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  markOrderPaid: (id: string) => void;
  markOrderReserved: (id: string) => void;
  markOrderHandedOver: (id: string) => void;
  cancelOrderWithReason: (id: string, reason: string, itemIds?: string[]) => void;

  // Menu & Kitchen
  updateMenu: (id: string, updates: Partial<MenuItem>) => void;
  addMenuItem: (item: MenuItem) => void;
  publishDailyMenu: (items: { id: string; qty: number; price: number }[]) => void;
  getRemainingStock: (itemId: string) => number;
  toggleMenuAvailability: (id: string) => void;
  resetDailyStock: () => void;

  // Flash Sale
  setFlashSale: (items: { [menuItemId: string]: number }) => void; // itemId -> flash price
  clearFlashSale: () => void;
  getFlashSalePrice: (itemId: string) => number | null;
  isItemOnFlashSale: (itemId: string) => boolean;

  // Inventory
  updateInventory: (id: string, updates: Partial<Ingredient>) => void;
  addInventoryItem: (item: Ingredient) => void;

  // Customers
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;

  // Import
  importMenuItems: (items: MenuItem[], replaceAll?: boolean) => void;
  importCustomers: (customers: Customer[], replaceAll?: boolean) => void;

  // System
  resetDailyData: () => void; // Reset orders, menu daily limits, and customer order history
  fullReset: () => void; // Reset ALL data (orders, menu, customers, inventory)
}

const AppContext = createContext<AppState | undefined>(undefined);

// Initial Data
const MOCK_MENU: MenuItem[] = [
  { id: '1', name: 'Roast Pork w/ Mushroom Gravy', price: 15, category: 'Main', isAvailable: true, description: 'Slow roasted pork in thin slices served with side of mushroom gravy and jasmine rice' },
  { id: '2', name: 'Honey Pork Ribs', price: 15, category: 'Main', isAvailable: true, description: 'Slow cooked pork ribs and belly in honey soy sauce served on top of jasmine rice' },
  { id: '3', name: 'Fried Pork Belly (Sweet & Sour)', price: 15, category: 'Main', isAvailable: true, description: 'Fried pork belly bits with sweet & sour sauce and egg fried rice' },
  { id: '4', name: 'Chicken & Broccoli Stir Fry', price: 15, category: 'Main', isAvailable: true, description: 'Asian style stir fry with chicken breast and broccoli with jasmine rice' },
  { id: '5', name: 'Spam Terriyaki', price: 15, category: 'Main', isAvailable: true, description: 'SPAM slices with scrambled egg and terriyaki fried rice' },
  { id: '6', name: 'Siomai (10pcs)', price: 15, category: 'Main', isAvailable: true, description: 'Steamed dumplings served with soy sauce and chili garlic oil' },
  { id: '7', name: 'Milk Chocolate Brownies', price: 10, category: 'Dessert', isAvailable: true },
  { id: '8', name: 'Peanuts (Normal/Spicy)', price: 10, category: 'Snack', isAvailable: true },
];

const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Sarah', phone: '971501234567', unitNumber: '501', floor: '5', building: 'A', location: 'Control Tower', totalOrders: 12, totalSpent: 540 },
  { id: 'c2', name: 'John', phone: '971559876543', unitNumber: '803', floor: '8', building: 'A', location: 'Control Tower', totalOrders: 3, totalSpent: 135 },
  { id: 'c3', name: 'Emma', phone: '971501112222', unitNumber: '305', floor: '3', building: 'B', location: 'Office Tower', totalOrders: 8, totalSpent: 360 },
];

const MOCK_INVENTORY: Ingredient[] = [
  { id: 'i1', name: 'Pork Belly', currentStock: 5, unit: 'kg', lowStockThreshold: 2 },
  { id: 'i2', name: 'Jasmine Rice', currentStock: 10, unit: 'kg', lowStockThreshold: 5 },
  { id: 'i3', name: 'Chicken Breast', currentStock: 3, unit: 'kg', lowStockThreshold: 2 },
  { id: 'i4', name: 'Eggs', currentStock: 30, unit: 'pcs', lowStockThreshold: 12 },
  { id: 'i5', name: 'Soy Sauce', currentStock: 1, unit: 'liter', lowStockThreshold: 1 },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('orderprep_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [menu, setMenu] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('orderprep_menu');
    return saved ? JSON.parse(saved) : MOCK_MENU;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('orderprep_customers');
    return saved ? JSON.parse(saved) : MOCK_CUSTOMERS;
  });

  const [inventory, setInventory] = useState<Ingredient[]>(() => {
    const saved = localStorage.getItem('orderprep_inventory');
    return saved ? JSON.parse(saved) : MOCK_INVENTORY;
  });

  const [flashSaleItems, setFlashSaleItems] = useState<{ [menuItemId: string]: FlashSaleItem }>(() => {
    const saved = localStorage.getItem('orderprep_flashsale');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => { localStorage.setItem('orderprep_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('orderprep_menu', JSON.stringify(menu)); }, [menu]);
  useEffect(() => { localStorage.setItem('orderprep_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('orderprep_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('orderprep_flashsale', JSON.stringify(flashSaleItems)); }, [flashSaleItems]);

  // --- Orders ---
  const addOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);

    // Auto-update or create customer (skip for walk-in customers)
    if (!order.isWalkIn) {
      setCustomers(prev => {
          const existing = prev.find(c => c.id === order.customerId);
          if (existing) {
              return prev.map(c => c.id === existing.id ? {
                  ...c,
                  totalOrders: c.totalOrders + 1,
                  totalSpent: c.totalSpent + order.totalAmount,
                  // Update phone if provided and currently empty or N/A
                  phone: (order.customerPhone && order.customerPhone !== 'N/A') ? order.customerPhone : c.phone
              } : c);
          } else {
              const newCustomer: Customer = {
                  id: order.customerId, // BUG FIX: Use the order's customerId
                  name: order.customerName,
                  phone: order.customerPhone,
                  totalOrders: 1,
                  totalSpent: order.totalAmount,
                  unitNumber: order.customerUnit || '',
                  building: order.customerBuilding || '',
                  floor: order.customerFloor || '',
                  location: '', // Can be updated later in Customers tab
              };
              return [...prev, newCustomer];
          }
      });
    }
  };

  const updateOrder = (id: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const markOrderPaid = (id: string) => {
    updateOrder(id, {
      paymentStatus: 'paid',
      paymentDate: new Date().toISOString()
    });
  };

  const markOrderReserved = (id: string) => {
    updateOrder(id, {
      status: 'reserved',
      reservedAt: new Date().toISOString()
    });
  };

  const markOrderHandedOver = (id: string) => {
    updateOrder(id, {
      status: 'completed',
      handedOverAt: new Date().toISOString()
    });
  };

  const cancelOrderWithReason = (id: string, reason: string, itemIds?: string[]) => {
    const order = state.orders.find(o => o.id === id);
    if (!order) return;

    // Restore stock for all items in the order
    order.items.forEach(item => {
      const menuItem = state.menu.find(m => m.id === item.menuItemId);
      if (menuItem && menuItem.dailyLimit !== undefined) {
        updateMenu(item.menuItemId, {
          dailyLimit: menuItem.dailyLimit + item.quantity
        });
      }
    });

    // Mark order as cancelled
    updateOrder(id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: reason,
      cancelledItems: itemIds
    });
  };

  // --- Menu & Kitchen ---
  const updateMenu = (id: string, updates: Partial<MenuItem>) => {
    setMenu(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const addMenuItem = (item: MenuItem) => {
    setMenu(prev => [...prev, item]);
  };

  const publishDailyMenu = (items: { id: string; qty: number; price: number }[]) => {
    setMenu(prev => prev.map(m => {
        const selected = items.find(i => i.id === m.id);
        if (selected) {
            return { 
                ...m, 
                dailyLimit: selected.qty, 
                price: selected.price,
                isAvailable: true // Make it live
            };
        }
        // If not selected, remove daily limit (optional: or set isAvailable false for POS)
        return { ...m, dailyLimit: 0, isAvailable: false };
    }));
  };

  const toggleMenuAvailability = (id: string) => {
    setMenu(prev => prev.map(m => m.id === id ? { ...m, isAvailable: !m.isAvailable } : m));
  };

  const resetDailyStock = () => {
    setMenu(prev => prev.map(m => ({ ...m, dailyLimit: 10 })));
  };

  const getRemainingStock = (itemId: string) => {
    const item = menu.find(m => m.id === itemId);
    if (!item || !item.dailyLimit) return 0;

    const today = new Date().toISOString().split('T')[0];
    const todaySold = orders
        .filter(o => o.deliveryDate.startsWith(today) && o.status !== 'cancelled')
        .reduce((sum, order) => {
            const orderItem = order.items.find(i => i.menuItemId === itemId);
            return sum + (orderItem ? orderItem.quantity : 0);
        }, 0);

    return Math.max(0, item.dailyLimit - todaySold);
  };

  // --- Flash Sale ---
  const setFlashSale = (items: { [menuItemId: string]: number }) => {
    // Set flash sale to expire at end of day
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999);

    const flashSale: { [menuItemId: string]: FlashSaleItem } = {};
    Object.entries(items).forEach(([itemId, price]) => {
      flashSale[itemId] = {
        price,
        expiresAt: expiresAt.toISOString()
      };
    });

    setFlashSaleItems(flashSale);
  };

  const clearFlashSale = () => {
    setFlashSaleItems({});
  };

  const getFlashSalePrice = (itemId: string): number | null => {
    const flashItem = flashSaleItems[itemId];
    if (!flashItem) return null;

    // Check if expired
    const now = new Date();
    const expires = new Date(flashItem.expiresAt);
    if (now > expires) {
      // Auto-clear expired flash sale
      setFlashSaleItems(prev => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
      return null;
    }

    return flashItem.price;
  };

  const isItemOnFlashSale = (itemId: string): boolean => {
    return getFlashSalePrice(itemId) !== null;
  };

  // --- Inventory ---
  const updateInventory = (id: string, updates: Partial<Ingredient>) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const addInventoryItem = (item: Ingredient) => {
    setInventory(prev => [...prev, item]);
  };

  // --- Customers ---
  const addCustomer = (customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // --- System ---
  const resetDailyData = () => {
    // Clear all orders
    setOrders([]);

    // Reset menu daily limits (keep menu items but clear dailyLimit)
    setMenu(prev => prev.map(item => ({
      ...item,
      dailyLimit: undefined,
      isAvailable: false
    })));

    // Reset customer order history (totalOrders and totalSpent)
    setCustomers(prev => prev.map(customer => ({
      ...customer,
      totalOrders: 0,
      totalSpent: 0
    })));

    // Inventory is preserved
  };

  const fullReset = () => {
    // Reset ALL data to initial state
    setOrders([]);
    setMenu(MOCK_MENU);
    setCustomers(MOCK_CUSTOMERS);
    setInventory(MOCK_INVENTORY);
  };

  // --- Import Functions ---
  const importMenuItems = (items: MenuItem[], replaceAll: boolean = false) => {
    if (replaceAll) {
      setMenu(items);
    } else {
      setMenu(prev => [...prev, ...items]);
    }
  };

  const importCustomers = (newCustomers: Customer[], replaceAll: boolean = false) => {
    if (replaceAll) {
      setCustomers(newCustomers);
    } else {
      setCustomers(prev => [...prev, ...newCustomers]);
    }
  };

  return (
    <AppContext.Provider value={{
      orders, menu, customers, inventory, flashSaleItems,
      addOrder, updateOrder, markOrderPaid, markOrderReserved, markOrderHandedOver, cancelOrderWithReason,
      updateMenu, addMenuItem, publishDailyMenu, getRemainingStock, toggleMenuAvailability, resetDailyStock,
      setFlashSale, clearFlashSale, getFlashSalePrice, isItemOnFlashSale,
      updateInventory, addInventoryItem,
      addCustomer, updateCustomer,
      importMenuItems, importCustomers,
      resetDailyData, fullReset
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};
