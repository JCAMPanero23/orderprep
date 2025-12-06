import React, { useState, useRef } from 'react';
import {
  manualBackup,
  getBackupMetadata,
  importBackupData,
  formatBytes,
  formatBackupDate
} from '../utils/backupSystem';
import { Download, Upload, Loader, Info, Lock, CheckCircle } from 'lucide-react';

export function BackupSettings() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const metadata = getBackupMetadata();

  const handleManualBackup = async () => {
    setIsBackingUp(true);

    try {
      const success = await manualBackup();

      if (success) {
        alert('✅ Backup Complete!\n\nYour data has been downloaded to your Downloads folder.\n\nFilename: orderprep-backup-[date].json');
      } else {
        alert('❌ Backup failed. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Backup error:', error);
      alert('❌ Backup failed. Please check your internet connection and try again.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('❌ Please select a valid JSON backup file.');
      return;
    }

    const confirmRestore = window.confirm(
      '⚠️ RESTORE DATA\n\n' +
      'This will replace ALL current data with the backup data.\n\n' +
      'Are you sure you want to continue?\n\n' +
      'Tip: Create a backup of your current data first!'
    );

    if (!confirmRestore) return;

    setIsRestoring(true);

    try {
      const success = await importBackupData(file);

      if (success) {
        alert(
          '✅ Data Restored Successfully!\n\n' +
          'Please refresh the page to see your restored data.\n\n' +
          'The page will refresh automatically in 3 seconds...'
        );
        setTimeout(() => window.location.reload(), 3000);
      } else {
        alert('❌ Restore failed. The backup file may be corrupted or invalid.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      alert('❌ Restore failed. Please check the backup file and try again.');
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 mb-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
        <span className="text-3xl">💾</span>
        Data Backups
      </h2>

      {/* Backup Status */}
      <div className="bg-sky-50 border-2 border-sky-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="text-sky-600 flex-shrink-0 mt-0.5" size={24} />
          <div className="flex-1">
            <h3 className="font-semibold text-sky-900 mb-2">Automatic Backups Enabled</h3>
            <div className="space-y-1 text-sm text-sky-800">
              <p>📅 Last backup: <strong>{formatBackupDate(metadata.lastBackupDate)}</strong></p>
              <p>📊 Total backups: <strong>{metadata.totalBackups}</strong></p>
              {metadata.lastBackupSize > 0 && (
                <p>📦 Last backup size: <strong>{formatBytes(metadata.lastBackupSize)}</strong></p>
              )}
              <p>📁 Location: <strong>Downloads folder</strong></p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleManualBackup}
          disabled={isBackingUp}
          className="bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
        >
          {isBackingUp ? (
            <>
              <Loader className="animate-spin" size={20} />
              Backing up...
            </>
          ) : (
            <>
              <Download size={20} />
              Download Backup Now
            </>
          )}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isRestoring}
          className="bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
        >
          {isRestoring ? (
            <>
              <Loader className="animate-spin" size={20} />
              Restoring...
            </>
          ) : (
            <>
              <Upload size={20} />
              Restore from Backup
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Privacy Notice */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Lock className="text-slate-600 flex-shrink-0 mt-0.5" size={24} />
          <div className="flex-1 text-sm text-slate-700">
            <p className="font-semibold mb-2">Privacy & Security</p>
            <p className="mb-2">
              Your data is automatically backed up daily to your device <strong>and</strong> sent to our developer for support purposes only.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Backups are encrypted during transmission</li>
              <li>We never share your data with third parties</li>
              <li>Developer backups are kept for 90 days</li>
              <li>You can request deletion anytime</li>
            </ul>
            <p className="mt-3">
              <a href="/privacy" className="text-sky-600 hover:text-sky-800 font-semibold underline">
                View Full Privacy Policy →
              </a>
            </p>
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
            <span>Keep at least 7 days of backups in your Downloads folder</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Test restoring a backup monthly to ensure it works</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Before major changes, create a manual backup first</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Store critical backups in Google Drive or email for extra safety</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
