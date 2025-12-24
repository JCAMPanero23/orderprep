import { Order } from '../types';

/**
 * Get only active (non-cancelled) orders
 * Use this consistently across all components to prevent
 * cancelled orders from appearing in totals and counts
 */
export const getActiveOrders = (orders: Order[]): Order[] => {
  return orders.filter(order => order.status !== 'cancelled');
};

/**
 * Get unpaid active orders only
 * Excludes both cancelled orders and paid orders
 */
export const getUnpaidOrders = (orders: Order[]): Order[] => {
  return getActiveOrders(orders).filter(order => order.paymentStatus !== 'paid');
};

/**
 * Get paid active orders only
 * Excludes both cancelled orders and unpaid orders
 */
export const getPaidOrders = (orders: Order[]): Order[] => {
  return getActiveOrders(orders).filter(order => order.paymentStatus === 'paid');
};

/**
 * Calculate total unpaid amount (active orders only)
 * This should be used for all unpaid amount calculations
 * to ensure cancelled orders don't inflate unpaid totals
 */
export const calculateUnpaidAmount = (orders: Order[]): number => {
  return getUnpaidOrders(orders).reduce((sum, order) => sum + order.totalAmount, 0);
};

/**
 * Calculate total paid amount (active orders only)
 * This should be used for all revenue calculations
 */
export const calculatePaidAmount = (orders: Order[]): number => {
  return getPaidOrders(orders).reduce((sum, order) => sum + order.totalAmount, 0);
};
