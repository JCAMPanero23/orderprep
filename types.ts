
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';
export type OrderStatus = 'new' | 'reserved' | 'completed' | 'cancelled';
export type Unit = 'portion' | 'kg' | 'pcs' | 'liter' | 'pack' | 'tray';
export type PaymentBehavior = 'on_time' | 'late' | 'chronic_late' | 'never_paid' | 'new_customer';

export interface Ingredient {
  id: string;
  name: string;
  currentStock: number;
  unit: Unit;
  lowStockThreshold: number;
  costPerUnit?: number;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number; // Default price
  category: string;
  isAvailable: boolean; // Is it active in Master list?
  dailyLimit?: number; // How many cooked today
  description?: string;
  tags?: string[]; // Searchable tags for fuzzy matching (aliases, keywords, Tagalog words)
  ingredients?: RecipeIngredient[];
  // Flash sale tracking
  flashSaleCount?: number; // Times this went to flash sale
  totalRevenueLost?: number; // Total AED lost to flash sales
  lastFlashSaleDate?: string;
  // Sales analytics
  totalSold?: number; // Lifetime sales count
  avgDailySales?: number; // Average units sold per day
  soldOutDays?: number; // Days it sold out
  leftoverDays?: number; // Days with leftovers
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  unitNumber?: string;
  floor?: string; // Floor number (e.g., "5", "12")
  building?: string; // Building name (e.g., "A", "Tower A")
  location?: string; // Other location info (Reception, Lobby, etc.)
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  // Payment behavior tracking
  paymentBehavior?: PaymentBehavior;
  totalUnpaid?: number;
  daysSinceLastPayment?: number;
  onTimePayments?: number; // Count of orders paid on time
  latePayments?: number; // Count of orders paid late
  unpaidOrders?: number; // Count of currently unpaid orders
  isBlocked?: boolean; // Blocked for non-payment
  // Flash sale behavior
  waitsForFlashSales?: boolean; // Customer who waits for discounts
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  priceAtOrder: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryDate: string; // ISO Date string
  createdAt: string;
  notes?: string;
  // Payment tracking
  paymentDate?: string; // When payment was received
  originalAmount?: number; // Before discount
  discountAmount?: number; // Flash sale discount
  isFlashSale?: boolean; // Was this a flash sale order?
  paymentMethod?: 'cash' | 'transfer' | 'credit';
  // Order workflow tracking
  isWalkIn?: boolean; // Walk-in customer (skip reservation)
  reservedAt?: string; // When order was reserved
  handedOverAt?: string; // When food was handed to customer
  cancelledAt?: string; // When order was cancelled
  cancelReason?: string; // Reason for cancellation
  cancelledItems?: string[]; // IDs of cancelled items (for sold-out)
  // Initial customer location data (used when creating new customer)
  customerUnit?: string;
  customerBuilding?: string;
  customerFloor?: string;
}

export interface ShoppingListItem {
  ingredientId: string;
  ingredientName: string;
  needed: number;
  current: number;
  toBuy: number;
  unit: Unit;
  category?: string;
}

// Sorting options for Reserved Orders
export type SortOption =
  | 'floor-asc'
  | 'floor-desc'
  | 'building-asc'
  | 'building-desc'
  | 'unit-asc'
  | 'unit-desc'
  | 'time-asc'
  | 'time-desc';

// Receipt template for WhatsApp messages
export interface ReceiptTemplate {
  id: string;
  name: string;
  content: string; // Template with {variables}
  isDefault: boolean;
}

// Fuzzy matching interfaces for WhatsApp order parsing
export interface FuzzyMatchResult {
  menuItem: MenuItem;
  confidence: 'high' | 'medium' | 'low';
  matchedOn: 'name' | 'description' | 'tag';
  matchedText: string;
  score: number; // 0-100
}

export interface ParsedOrderResult {
  items: ParsedOrderItem[];
  customerInfo: ParsedCustomerInfo;
  rawText: string;
}

export interface ParsedOrderItem {
  quantity: number;
  matchResults: FuzzyMatchResult[];
  rawLine: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  selectedMatch?: FuzzyMatchResult;
}

export interface ParsedCustomerInfo {
  name?: string;
  phone?: string;
  unitNumber?: string;
  building?: string;
  floor?: string;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================
// AUTHENTICATION TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  businessName: string;
  ownerName: string;
  phone?: string;
  createdAt: string;
  lastLogin: string;
  authProvider?: 'email' | 'google'; // How they signed up
  googleId?: string; // Google account ID if using Google Sign-In
  photoURL?: string; // Profile photo URL
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  businessName: string;
  ownerName: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
}
