// OrderPrep Backup System - Supabase Cloud Storage Integration

import { supabase, BACKUP_BUCKET } from './supabaseClient';
import { getCurrentUserId } from './userIdGenerator';
import type { BackupData, BackupMetadata, AuthData } from './backupTypes';

// ============================================
// CONFIGURATION
// ============================================

// Storage keys for localStorage metadata
const LAST_BACKUP_DATE_KEY = 'lastBackupDate';
const BACKUP_COUNT_KEY = 'totalBackups';
const LAST_BACKUP_SIZE_KEY = 'lastBackupSize';

// Backup retention policy
const MAX_BACKUPS = 7; // Keep last 7 backups

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

    // User info (for metadata)
    userInfo: {
      businessName: user?.businessName || 'Unknown Business',
      userEmail: user?.email || 'no-email@unknown.com',
      phone: user?.phone || undefined,
      lastActive: new Date().toISOString(),
    },

    // All business data (using correct localStorage keys with 'orderprep_' prefix)
    orders: JSON.parse(localStorage.getItem('orderprep_orders') || '[]'),
    customers: JSON.parse(localStorage.getItem('orderprep_customers') || '[]'),
    recipes: JSON.parse(localStorage.getItem('orderprep_recipes') || '[]'),
    menuItems: JSON.parse(localStorage.getItem('orderprep_menu') || '[]'),
    ingredients: JSON.parse(localStorage.getItem('orderprep_inventory') || '[]'),
    flashSales: JSON.parse(localStorage.getItem('orderprep_flashsale') || '[]'),
    settings: JSON.parse(localStorage.getItem('orderprep_settings') || '{}'),

    // Include auth data for full backup (only current user for privacy)
    authData: {
      user: user,
      hasCompletedIntro: localStorage.getItem('has_completed_intro'),
      // allUsers removed for privacy - each user backs up only their own data
    },
  };

  return data;
}

// ============================================
// SUPABASE BACKUP FUNCTIONS
// ============================================

/**
 * Upload backup to Supabase Storage
 */
async function uploadBackupToSupabase(data: BackupData, userId: string): Promise<{
  success: boolean;
  size: number;
  path: string;
  error?: string;
}> {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const size = blob.size;

    // Generate filename: YYYY-MM-DD_HH-MM-SS.json (with timestamp for uniqueness)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const filename = `${dateStr}_${timeStr}.json`;
    const filePath = `${userId}/${filename}`;

    console.log(`📤 Uploading backup to Supabase: ${filePath} (${formatBytes(size)})`);

    // Upload to Supabase Storage
    const { data: uploadData, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(filePath, blob, {
        contentType: 'application/json',
        upsert: false, // Create new file each time
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      return {
        success: false,
        size: 0,
        path: '',
        error: error.message,
      };
    }

    console.log('✅ Backup uploaded to Supabase successfully');
    setLastBackupSize(size);

    return {
      success: true,
      size,
      path: uploadData.path,
    };

  } catch (error: any) {
    console.error('❌ Failed to upload backup:', error);
    return {
      success: false,
      size: 0,
      path: '',
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * List all user's backups from Supabase
 */
export async function listUserBackups(userId?: string): Promise<Array<{
  filename: string;
  date: string;
  time: string;
  size: number;
  sizeFormatted: string;
  path: string;
  isLatest: boolean;
}>> {
  try {
    // Get user ID if not provided
    const userIdToUse = userId || await getCurrentUserId();
    if (!userIdToUse) {
      console.error('❌ No user ID available');
      return [];
    }

    console.log(`📋 Listing backups for user: ${userIdToUse}`);

    // List files in user's folder
    const { data: files, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list(userIdToUse, {
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('❌ Error listing backups:', error);
      return [];
    }

    if (!files || files.length === 0) {
      console.log('ℹ️ No backups found');
      return [];
    }

    // Parse and format backup list
    const backups = files
      .filter(file => file.name.endsWith('.json'))
      .map((file, index) => {
        // Extract date and time from filename (YYYY-MM-DD_HH-MM-SS.json)
        const filenamePart = file.name.replace('.json', '');
        const [datePart, timePart] = filenamePart.split('_');

        // Parse date (YYYY-MM-DD)
        const dateObj = new Date(datePart);

        // Parse time (HH-MM-SS) if available
        let timeStr = 'Unknown';
        if (timePart) {
          const [hours, minutes, seconds] = timePart.split('-');
          const tempDate = new Date();
          tempDate.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
          timeStr = tempDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
        }

        return {
          filename: file.name,
          date: dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          time: timeStr,
          size: file.metadata?.size || 0,
          sizeFormatted: formatBytes(file.metadata?.size || 0),
          path: `${userIdToUse}/${file.name}`,
          isLatest: index === 0, // First item is latest
        };
      });

    console.log(`✅ Found ${backups.length} backup(s)`);
    return backups;

  } catch (error) {
    console.error('❌ Failed to list backups:', error);
    return [];
  }
}

/**
 * Restore backup from Supabase
 */
export async function restoreFromSupabase(path: string): Promise<boolean> {
  try {
    console.log(`📥 Restoring backup from: ${path}`);

    // Download file from Supabase
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .download(path);

    if (error) {
      console.error('❌ Error downloading backup:', error);
      return false;
    }

    if (!data) {
      console.error('❌ No data received from Supabase');
      return false;
    }

    // Parse JSON
    const text = await data.text();
    const backupData: BackupData = JSON.parse(text);

    // Validate backup data structure
    if (!backupData.version || !backupData.exportDate) {
      throw new Error('Invalid backup file format');
    }

    // Restore all data to localStorage (using correct keys with 'orderprep_' prefix)
    console.log('📝 Restoring data to localStorage...');
    console.log('- Orders:', backupData.orders?.length || 0);
    console.log('- Customers:', backupData.customers?.length || 0);
    console.log('- Recipes:', backupData.recipes?.length || 0);
    console.log('- Menu Items:', backupData.menuItems?.length || 0);

    localStorage.setItem('orderprep_orders', JSON.stringify(backupData.orders || []));
    localStorage.setItem('orderprep_customers', JSON.stringify(backupData.customers || []));
    localStorage.setItem('orderprep_recipes', JSON.stringify(backupData.recipes || []));
    localStorage.setItem('orderprep_menu', JSON.stringify(backupData.menuItems || []));
    localStorage.setItem('orderprep_inventory', JSON.stringify(backupData.ingredients || []));
    localStorage.setItem('orderprep_flashsale', JSON.stringify(backupData.flashSales || []));
    localStorage.setItem('orderprep_settings', JSON.stringify(backupData.settings || {}));

    // Restore auth data if present (only current user for privacy)
    if (backupData.authData) {
      console.log('📝 Restoring auth data...');
      if (backupData.authData.user) {
        localStorage.setItem('user', JSON.stringify(backupData.authData.user));
      }
      if (backupData.authData.hasCompletedIntro) {
        localStorage.setItem('has_completed_intro', backupData.authData.hasCompletedIntro);
      }
      // allUsers is no longer restored - privacy fix
      // Old backups with allUsers will be ignored
    }

    console.log('✅ Backup restored successfully! Data written to localStorage.');
    return true;

  } catch (error) {
    console.error('❌ Failed to restore backup:', error);
    return false;
  }
}

/**
 * Cleanup old backups (keep only last MAX_BACKUPS)
 */
async function cleanupOldBackups(userId: string): Promise<number> {
  try {
    const backups = await listUserBackups(userId);

    if (backups.length <= MAX_BACKUPS) {
      console.log(`ℹ️ Only ${backups.length} backups, no cleanup needed`);
      return 0;
    }

    // Get backups to delete (oldest ones)
    const backupsToDelete = backups.slice(MAX_BACKUPS);

    console.log(`🗑️ Deleting ${backupsToDelete.length} old backup(s)...`);

    // Delete old backups
    for (const backup of backupsToDelete) {
      const { error } = await supabase.storage
        .from(BACKUP_BUCKET)
        .remove([backup.path]);

      if (error) {
        console.error(`❌ Failed to delete ${backup.path}:`, error);
      } else {
        console.log(`✅ Deleted: ${backup.filename}`);
      }
    }

    return backupsToDelete.length;

  } catch (error) {
    console.error('❌ Failed to cleanup old backups:', error);
    return 0;
  }
}

// ============================================
// MAIN BACKUP FUNCTION
// ============================================

export async function performBackup(userInitiated = false): Promise<boolean> {
  // Check if backup needed (skip check for manual backups)
  if (!userInitiated && !needsBackup()) {
    console.log('ℹ️ Backup already done today. Skipping.');
    return true;
  }

  // Get user ID
  const userId = await getCurrentUserId();
  if (!userId) {
    console.error('❌ No user logged in. Cannot perform backup.');
    return false;
  }

  try {
    console.log('🔄 Starting cloud backup...');

    // Export all data
    const data = exportAllData();

    // Upload to Supabase
    const result = await uploadBackupToSupabase(data, userId);

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    // Update metadata
    if (!userInitiated) {
      setLastBackupDate();
    }
    incrementBackupCount();

    // Cleanup old backups
    const deletedCount = await cleanupOldBackups(userId);
    if (deletedCount > 0) {
      console.log(`🗑️ Cleaned up ${deletedCount} old backup(s)`);
    }

    console.log('✅ Cloud backup complete!');
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
    await performBackup(false);
  }, 5000);
}

// ============================================
// MANUAL BACKUP (from Settings page)
// ============================================

export async function manualBackup(): Promise<boolean> {
  console.log('🔄 Manual backup triggered by user...');
  return await performBackup(true);
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
