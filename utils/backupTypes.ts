// Backup system TypeScript interfaces

export interface AuthData {
  user: any;
  hasCompletedIntro: string | null;
  allUsers?: any[]; // Optional - for backward compatibility with old backups
}

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
  authData: AuthData; // Only current user data (privacy-first)
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
