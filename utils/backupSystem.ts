// OrderPrep Backup System - Dual backup with EmailJS integration

import emailjs from '@emailjs/browser';
import type { BackupData, BackupMetadata } from './backupTypes';

// ============================================
// CONFIGURATION
// ============================================

const DEVELOPER_EMAIL = import.meta.env.VITE_DEVELOPER_EMAIL || 'your-email@gmail.com';
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

// Storage keys
const LAST_BACKUP_DATE_KEY = 'lastBackupDate';
const BACKUP_COUNT_KEY = 'totalBackups';
const LAST_BACKUP_SIZE_KEY = 'lastBackupSize';

// ============================================
// BACKUP METADATA
// ============================================

function getLastBackupDate(): string | null {
  return localStorage.getItem(LAST_BACKUP_DATE_KEY);
}

function setLastBackupDate(): void {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  localStorage.setItem(LAST_BACKUP_DATE_KEY, today);
}

function needsBackup(): boolean {
  const lastBackup = getLastBackupDate();
  const today = new Date().toISOString().split('T')[0];
  return lastBackup !== today;
}

export function getBackupMetadata(): BackupMetadata {
  return {
    lastBackupDate: getLastBackupDate(),
    totalBackups: parseInt(localStorage.getItem(BACKUP_COUNT_KEY) || '0'),
    lastBackupSize: parseInt(localStorage.getItem(LAST_BACKUP_SIZE_KEY) || '0'),
  };
}

function incrementBackupCount(): void {
  const current = parseInt(localStorage.getItem(BACKUP_COUNT_KEY) || '0');
  localStorage.setItem(BACKUP_COUNT_KEY, (current + 1).toString());
}

function setLastBackupSize(sizeInBytes: number): void {
  localStorage.setItem(LAST_BACKUP_SIZE_KEY, sizeInBytes.toString());
}

// ============================================
// DATA EXPORT
// ============================================

/**
 * Exports all user data from localStorage
 */
export function exportAllData(): BackupData {
  // Get user info from auth system
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const data: BackupData = {
    version: '1.0',
    exportDate: new Date().toISOString(),

    // User info (for developer reference)
    userInfo: {
      businessName: user?.businessName || 'Unknown Business',
      userEmail: user?.email || 'no-email@unknown.com',
      phone: user?.phone || undefined,
      lastActive: new Date().toISOString(),
    },

    // All business data
    orders: JSON.parse(localStorage.getItem('orders') || '[]'),
    customers: JSON.parse(localStorage.getItem('customers') || '[]'),
    recipes: JSON.parse(localStorage.getItem('recipes') || '[]'),
    menuItems: JSON.parse(localStorage.getItem('menuItems') || '[]'),
    ingredients: JSON.parse(localStorage.getItem('ingredients') || '[]'),
    flashSales: JSON.parse(localStorage.getItem('flashSales') || '[]'),
    settings: JSON.parse(localStorage.getItem('settings') || '{}'),

    // Include auth data for full backup
    authData: {
      user: user,
      hasCompletedIntro: localStorage.getItem('has_completed_intro'),
      allUsers: JSON.parse(localStorage.getItem('all_users') || '[]'),
    },
  };

  return data;
}

// ============================================
// USER BACKUP: Download to device
// ============================================

function downloadBackupToDevice(data: BackupData, filename: string): void {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Track size
    setLastBackupSize(blob.size);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    console.log('✅ Backup downloaded to device:', filename);
  } catch (error) {
    console.error('❌ Failed to download backup:', error);
    throw error;
  }
}

// ============================================
// DEVELOPER BACKUP: Silent email
// ============================================

async function sendBackupToDeveloper(data: BackupData): Promise<boolean> {
  // Check if EmailJS is configured
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('⚠️ EmailJS not configured. Skipping developer backup.');
    return false;
  }

  try {
    const businessName = data.userInfo?.businessName || 'Unknown Business';
    const userEmail = data.userInfo?.userEmail || 'no-email@unknown.com';
    const orderCount = data.orders?.length || 0;
    const customerCount = data.customers?.length || 0;
    const recipeCount = data.recipes?.length || 0;

    const now = new Date();
    const backupDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const backupTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Prepare email data
    const emailData = {
      to_email: DEVELOPER_EMAIL,
      business_name: businessName,
      user_email: userEmail,
      backup_date: backupDate,
      backup_time: backupTime,
      order_count: orderCount.toString(),
      customer_count: customerCount.toString(),
      recipe_count: recipeCount.toString(),
      backup_json: JSON.stringify(data, null, 2), // Full backup as JSON
    };

    // Send via EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      emailData,
      EMAILJS_PUBLIC_KEY
    );

    if (response.status === 200) {
      console.log('✅ Backup sent to developer email');
      return true;
    } else {
      console.error('❌ EmailJS returned non-200 status:', response.status);
      return false;
    }

  } catch (error) {
    console.error('❌ Failed to send backup to developer:', error);
    return false;
  }
}

// ============================================
// MAIN BACKUP FUNCTION
// ============================================

export async function performDualBackup(userInitiated = false): Promise<boolean> {
  // Check if backup needed (skip check for manual backups)
  if (!userInitiated && !needsBackup()) {
    console.log('ℹ️ Backup already done today. Skipping.');
    return true;
  }

  try {
    console.log('🔄 Starting dual backup...');

    // Export all data
    const data = exportAllData();
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `orderprep-backup-${timestamp}.json`;

    // 1. Download to user's device
    downloadBackupToDevice(data, filename);

    // 2. Send to developer email (silently in background)
    const emailSent = await sendBackupToDeveloper(data);

    // Update metadata
    if (!userInitiated) {
      setLastBackupDate();
    }
    incrementBackupCount();

    console.log(`✅ Dual backup complete! (Email sent: ${emailSent ? 'Yes' : 'No'})`);
    return true;

  } catch (error) {
    console.error('❌ Backup failed:', error);
    return false;
  }
}

// ============================================
// AUTO-BACKUP INITIALIZATION
// ============================================

export function initAutoBackup(): void {
  console.log('🔄 Initializing auto-backup system...');

  // Wait 5 seconds after app loads to avoid interfering with startup
  setTimeout(async () => {
    console.log('🔄 Running automatic backup check...');
    await performDualBackup(false);
  }, 5000);
}

// ============================================
// MANUAL BACKUP (from Settings page)
// ============================================

export async function manualBackup(): Promise<boolean> {
  console.log('🔄 Manual backup triggered by user...');
  return await performDualBackup(true);
}

// ============================================
// DATA IMPORT/RESTORE
// ============================================

export async function importBackupData(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const data: BackupData = JSON.parse(text);

    // Validate backup data structure
    if (!data.version || !data.exportDate) {
      throw new Error('Invalid backup file format');
    }

    // Restore all data to localStorage
    localStorage.setItem('orders', JSON.stringify(data.orders || []));
    localStorage.setItem('customers', JSON.stringify(data.customers || []));
    localStorage.setItem('recipes', JSON.stringify(data.recipes || []));
    localStorage.setItem('menuItems', JSON.stringify(data.menuItems || []));
    localStorage.setItem('ingredients', JSON.stringify(data.ingredients || []));
    localStorage.setItem('flashSales', JSON.stringify(data.flashSales || []));
    localStorage.setItem('settings', JSON.stringify(data.settings || {}));

    // Restore auth data if present
    if (data.authData) {
      if (data.authData.user) {
        localStorage.setItem('user', JSON.stringify(data.authData.user));
      }
      if (data.authData.hasCompletedIntro) {
        localStorage.setItem('has_completed_intro', data.authData.hasCompletedIntro);
      }
      if (data.authData.allUsers) {
        localStorage.setItem('all_users', JSON.stringify(data.authData.allUsers));
      }
    }

    console.log('✅ Backup restored successfully!');
    return true;

  } catch (error) {
    console.error('❌ Failed to import backup:', error);
    return false;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatBackupDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
