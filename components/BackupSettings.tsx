import React, { useState, useEffect } from 'react';
import {
  manualBackup,
  getBackupMetadata,
  listUserBackups,
  restoreFromSupabase,
  formatBytes,
  formatBackupDate
} from '../utils/backupSystem';
import { Download, Upload, Loader, Info, Lock, CheckCircle, Cloud, RefreshCw } from 'lucide-react';

export function BackupSettings() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [backups, setBackups] = useState<Array<{
    filename: string;
    date: string;
    time: string;
    size: number;
    sizeFormatted: string;
    path: string;
    isLatest: boolean;
  }>>([]);

  const metadata = getBackupMetadata();

  // Load backup history on mount
  useEffect(() => {
    loadBackupHistory();
  }, []);

  const loadBackupHistory = async () => {
    setIsLoadingBackups(true);
    try {
      const backupList = await listUserBackups();
      setBackups(backupList);
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);

    try {
      const success = await manualBackup();

      if (success) {
        alert('✅ Backup Complete!\n\nYour data has been uploaded to cloud storage.\n\nRefreshing backup list...');
        // Reload backup list
        await loadBackupHistory();
      } else {
        alert('❌ Backup failed. Please check your internet connection and try again.');
      }
    } catch (error) {
      console.error('Backup error:', error);
      alert('❌ Backup failed. Please check your internet connection and try again.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (backupPath: string, backupDate: string) => {
    console.log('🔄 handleRestore called with path:', backupPath);

    const confirmRestore = window.confirm(
      `⚠️ RESTORE DATA\n\n` +
      `This will replace ALL current data with the backup from:\n${backupDate}\n\n` +
      `Are you sure you want to continue?\n\n` +
      `Tip: Create a backup of your current data first!`
    );

    console.log('User confirmed restore:', confirmRestore);

    if (!confirmRestore) return;

    setIsRestoring(true);

    try {
      const success = await restoreFromSupabase(backupPath);

      if (success) {
        alert(
          '✅ Data Restored Successfully!\n\n' +
          'Please refresh the page to see your restored data.\n\n' +
          'The page will refresh automatically in 3 seconds...'
        );
        setTimeout(() => window.location.reload(), 3000);
      } else {
        alert('❌ Restore failed. The backup may be corrupted or inaccessible.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      alert('❌ Restore failed. Please check the backup file and try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 mb-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
        <span className="text-3xl">☁️</span>
        Cloud Backups
      </h2>

      {/* Backup Status */}
      <div className="bg-sky-50 border-2 border-sky-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Cloud className="text-sky-600 flex-shrink-0 mt-0.5" size={24} />
          <div className="flex-1">
            <h3 className="font-semibold text-sky-900 mb-2">Automatic Cloud Backups</h3>
            <div className="space-y-1 text-sm text-sky-800">
              <p>📅 Last backup: <strong>{formatBackupDate(metadata.lastBackupDate)}</strong></p>
              <p>📊 Total backups: <strong>{metadata.totalBackups}</strong></p>
              {metadata.lastBackupSize > 0 && (
                <p>📦 Last backup size: <strong>{formatBytes(metadata.lastBackupSize)}</strong></p>
              )}
              <p>☁️ Storage: <strong>Supabase Cloud</strong></p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Backup Button */}
      <div className="mb-6">
        <button
          onClick={handleManualBackup}
          disabled={isBackingUp}
          className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
        >
          {isBackingUp ? (
            <>
              <Loader className="animate-spin" size={20} />
              Uploading to Cloud...
            </>
          ) : (
            <>
              <Upload size={20} />
              Create Backup Now
            </>
          )}
        </button>
      </div>

      {/* Backup History */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Download size={20} className="text-slate-600" />
            Your Backups (Last 7 Days)
          </h3>
          <button
            onClick={loadBackupHistory}
            disabled={isLoadingBackups}
            className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoadingBackups ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {isLoadingBackups ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Loader className="animate-spin mr-2" size={20} />
            Loading your backups...
          </div>
        ) : backups.length === 0 ? (
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-8 text-center">
            <Cloud className="mx-auto text-slate-400 mb-3" size={48} />
            <p className="text-slate-600 font-medium mb-2">No backups yet</p>
            <p className="text-sm text-slate-500">
              Click "Create Backup Now" to save your first cloud backup
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.path}
                className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900">
                        {backup.date} - {backup.time}
                      </p>
                      {backup.isLatest && (
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          LATEST
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      📦 {backup.sizeFormatted}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(backup.path, backup.date)}
                    disabled={isRestoring}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
                  >
                    {isRestoring ? (
                      <>
                        <Loader className="animate-spin" size={16} />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        Restore
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Lock className="text-slate-600 flex-shrink-0 mt-0.5" size={24} />
          <div className="flex-1 text-sm text-slate-700">
            <p className="font-semibold mb-2">Privacy & Security</p>
            <p className="mb-2">
              Your data is securely stored in Supabase cloud storage with encryption at rest and in transit.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Primary data stays in browser (localStorage)</li>
              <li>Backups encrypted during upload (HTTPS)</li>
              <li>User ID is hashed for privacy</li>
              <li>Only you can access your backups</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="pt-6 border-t-2 border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <CheckCircle className="text-green-600" size={20} />
          Best Practices
        </h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Create a backup before making major changes to your data</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Test restoring a backup monthly to ensure it works</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>System keeps last 7 backups automatically</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Backups are stored securely in the cloud</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
