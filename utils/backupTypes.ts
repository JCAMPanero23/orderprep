// Backup system TypeScript interfaces

export interface BackupData {
  version: string;
  exportDate: string;
  userInfo: UserInfo;
  orders: any[];
  customers: any[];
  recipes: any[];
  menuItems: any[];
  ingredients: any[];
  flashSales: any[];
  settings: any;
  authData: any; // Include auth state for full backup
}

export interface UserInfo {
  businessName: string;
  userEmail: string;
  phone?: string;
  lastActive: string;
}

export interface BackupMetadata {
  lastBackupDate: string | null;
  totalBackups: number;
  lastBackupSize: number;
}
