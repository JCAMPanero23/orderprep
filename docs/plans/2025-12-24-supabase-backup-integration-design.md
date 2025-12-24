# Supabase Backup Integration Design

**Date:** December 24, 2025
**Author:** Claude Code with User Input
**Status:** Approved - Ready for Implementation

---

## Overview

Replace EmailJS-based backup system with Supabase Storage for cloud backups. This provides faster, more reliable backup/restore with better UX and lower complexity.

## Goals

1. **Replace EmailJS completely** - Remove email-based backups
2. **Cloud-only backups** - Store backups in Supabase Storage only
3. **7-day retention** - Auto-cleanup old backups
4. **User privacy** - Hash email addresses for folder names
5. **Backup history UI** - Show list of backups with date picker

## Non-Goals

- ❌ Local JSON file downloads (removed)
- ❌ Email notifications (removed)
- ❌ Change primary data storage (still localStorage)
- ❌ Real-time sync across devices (future feature)

---

## Architecture

### System Flow

```
User triggers backup
    ↓
Export data from localStorage (existing exportAllData())
    ↓
Generate user ID from email hash (SHA-256)
    ↓
Upload JSON to Supabase Storage
    → Bucket: orderprep-backups
    → Path: {userId}/{YYYY-MM-DD}.json
    ↓
Auto-cleanup old backups (keep last 7)
    ↓
Update metadata in localStorage
    ↓
Show success message
```

### Storage Structure

```
Supabase Storage
└── Bucket: "orderprep-backups" (public read for owner, private write)
    ├── a3f5b2c8d1e4f6a7/  (User ID: hashed email)
    │   ├── 2025-12-24.json
    │   ├── 2025-12-23.json
    │   ├── 2025-12-22.json
    │   ├── 2025-12-21.json
    │   ├── 2025-12-20.json
    │   ├── 2025-12-19.json
    │   └── 2025-12-18.json  (7 backups max)
    └── b4c6d7e9f1a2b3c4/  (Another user)
        └── ...
```

### Data Storage Model

**Primary Storage (NO CHANGE):**
- localStorage = single source of truth
- All app data lives in browser storage
- Works 100% offline
- Fast, zero network calls during normal use

**Backup Storage (NEW):**
- Supabase Storage = backup vault only
- Used only for backup/restore operations
- No impact on app performance
- Optional (app works without it)

---

## Components

### 1. Supabase Client (`utils/supabaseClient.ts`)

**Purpose:** Initialize Supabase connection

**Implementation:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://norkcctrttwilagknnvj.supabase.co'
const supabaseAnonKey = 'eyJhbGci...' // From env var

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Environment Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

### 2. User ID Generator (`utils/userIdGenerator.ts`)

**Purpose:** Generate consistent, privacy-preserving user ID from email

**Algorithm:**
1. Normalize email (lowercase, trim)
2. Hash with SHA-256
3. Return first 16 characters of hex

**Properties:**
- Same email → same ID (deterministic)
- Different email → different ID (unique)
- Email not visible in storage path (private)
- No database required

**Implementation:**
```typescript
export async function getUserId(email: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(email.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex.substring(0, 16)
}
```

---

### 3. Backup System (`utils/backupSystem.ts`)

**Changes:**

**REMOVE:**
- `sendBackupToDeveloper()` - EmailJS integration
- `downloadBackupToDevice()` - Local file download
- EmailJS imports and configuration

**ADD:**
- `uploadBackupToSupabase(data, userId)` - Upload to Supabase Storage
- `listUserBackups(userId)` - Fetch backup history
- `restoreFromSupabase(userId, filename)` - Download and restore backup
- `cleanupOldBackups(userId)` - Delete backups beyond 7-day limit

**MODIFY:**
- `performDualBackup()` → `performBackup()` - Call Supabase instead of EmailJS
- `importBackupData()` → Works with Supabase response

**New Functions Detail:**

#### `uploadBackupToSupabase(data, userId)`
```typescript
1. Convert data to JSON string
2. Generate filename: YYYY-MM-DD.json
3. Upload to: orderprep-backups/{userId}/{filename}
4. Return: { success: boolean, size: number, path: string }
```

#### `listUserBackups(userId)`
```typescript
1. List files in: orderprep-backups/{userId}/
2. Parse filenames for dates
3. Sort by date (newest first)
4. Return: Array<{ filename, date, size, url }>
```

#### `restoreFromSupabase(userId, filename)`
```typescript
1. Download file from: orderprep-backups/{userId}/{filename}
2. Parse JSON
3. Validate backup structure
4. Restore to localStorage (existing importBackupData logic)
5. Return: { success: boolean }
```

#### `cleanupOldBackups(userId)`
```typescript
1. List all user backups
2. Sort by date
3. If count > 7:
   - Delete oldest backups
   - Keep only 7 most recent
4. Return: { deletedCount: number }
```

---

### 4. BackupSettings Component (`components/BackupSettings.tsx`)

**Changes:**

**REMOVE:**
- File input for restore
- "Download backup" messaging
- "Email sent" status
- "Location: Downloads folder" text

**ADD:**
- Backup history list UI
- "Create Backup Now" button
- Individual "Restore This" buttons per backup
- Loading states for cloud operations

**New UI Structure:**
```tsx
<BackupSettings>
  {/* Header */}
  <h2>Cloud Backups</h2>

  {/* Create Backup Button */}
  <button onClick={handleCreateBackup}>
    {isBackingUp ? 'Uploading...' : 'Create Backup Now'}
  </button>

  {/* Backup History */}
  <div className="backup-history">
    <h3>Your Backups (Last 7 Days)</h3>
    {isLoadingBackups ? (
      <Loader />
    ) : backups.length === 0 ? (
      <EmptyState />
    ) : (
      backups.map(backup => (
        <BackupCard
          date={backup.date}
          time={backup.time}
          size={backup.size}
          isLatest={backup.isLatest}
          onRestore={() => handleRestore(backup.filename)}
        />
      ))
    )}
  </div>

  {/* Privacy Notice */}
  <PrivacyNotice />
</BackupSettings>
```

**Loading States:**
- `isBackingUp` - "Uploading to cloud..."
- `isLoadingBackups` - "Loading your backups..."
- `isRestoring` - "Restoring data..."

---

## Error Handling

### 1. Network Failures
```typescript
try {
  await uploadBackup()
} catch (error) {
  if (error.message.includes('network')) {
    alert('Unable to connect. Check internet connection.')
  }
}
```

### 2. Upload Failures
```typescript
- Show: "Backup upload failed. Your data is safe locally."
- Action: Retry button
- Log: Full error to console for debugging
```

### 3. Restore Failures
```typescript
- Show: "Unable to restore this backup. Try another one."
- Action: Don't clear current localStorage (preserve data)
- Return to backup list
```

### 4. User Not Logged In
```typescript
if (!user?.email) {
  alert('Please log in to use cloud backups.')
  return
}
```

### 5. Corrupted Backup
```typescript
- Validate JSON structure before restore
- Check for required fields (version, exportDate)
- Reject invalid backups with clear error
```

### Graceful Degradation
- Supabase unavailable → App works normally from localStorage
- Failed backup → User can retry, data not lost
- Failed restore → Current data preserved

---

## Security & Privacy

### User ID Hashing
- Email addresses not visible in storage paths
- SHA-256 hash (16 char prefix) for privacy
- Deterministic (same email = same ID)

### Supabase Security
- Bucket: `orderprep-backups`
- Policy: Users can only access their own folder
- Anon key used (safe for client-side)

### Data Encryption
- HTTPS transport (automatic with Supabase)
- Data at rest encryption (Supabase default)
- No plaintext email addresses in storage

---

## Testing Plan

### Manual Testing Checklist

**Backup Creation:**
- ✅ Create backup → uploads to Supabase
- ✅ Verify file in Supabase dashboard
- ✅ Check filename format (YYYY-MM-DD.json)
- ✅ Validate JSON content
- ✅ Test offline → shows error

**Backup History:**
- ✅ Create 3 backups → all appear in list
- ✅ Verify order (newest first)
- ✅ Check sizes and timestamps
- ✅ Test empty state (no backups)

**Restore:**
- ✅ Create backup → modify data → restore
- ✅ Verify data reverted to backup state
- ✅ Test restore different backups
- ✅ Confirm restore confirmation dialog

**Auto-Cleanup:**
- ✅ Create 8 backups
- ✅ Verify oldest deleted
- ✅ Confirm only 7 remain
- ✅ Check Supabase dashboard

**User ID:**
- ✅ Same email → same ID
- ✅ Different email → different ID
- ✅ Case insensitive

**Multi-User:**
- ✅ User A backup → User B can't see
- ✅ Separate folders per user
- ✅ No data leakage

---

## Migration Plan

### Phase 1: Setup Supabase
1. ✅ Create Supabase project
2. ✅ Get credentials (URL + anon key)
3. ⏳ Create storage bucket: `orderprep-backups`
4. ⏳ Set bucket policies (user isolation)

### Phase 2: Install Dependencies
1. ⏳ Add `@supabase/supabase-js` to package.json
2. ⏳ Remove `@emailjs/browser` dependency
3. ⏳ Add environment variables

### Phase 3: Implement Core
1. ⏳ Create `utils/supabaseClient.ts`
2. ⏳ Create `utils/userIdGenerator.ts`
3. ⏳ Modify `utils/backupSystem.ts`

### Phase 4: Update UI
1. ⏳ Modify `components/BackupSettings.tsx`
2. ⏳ Add backup history UI
3. ⏳ Remove file input/download logic

### Phase 5: Testing
1. ⏳ Test all backup/restore scenarios
2. ⏳ Verify auto-cleanup (7 backup limit)
3. ⏳ Test error handling
4. ⏳ Validate multi-user isolation

### Phase 6: Cleanup
1. ⏳ Remove EmailJS code and config
2. ⏳ Update documentation
3. ⏳ Commit changes

---

## Success Criteria

- ✅ Backups upload to Supabase successfully
- ✅ Backup history displays correctly
- ✅ Restore works from any backup in history
- ✅ Auto-cleanup keeps only 7 backups
- ✅ User IDs generated consistently
- ✅ Multi-user data isolation
- ✅ Error handling works gracefully
- ✅ No EmailJS dependencies remain
- ✅ App performance unaffected
- ✅ All tests pass

---

## Future Enhancements

- Real-time sync across devices (use same user ID)
- Backup compression (gzip before upload)
- Backup encryption (client-side before upload)
- Scheduled backups (daily auto-backup)
- Backup notifications (success/failure)
- Export backup as CSV (in addition to JSON)

---

## Rollback Plan

If issues arise:
1. Keep EmailJS code in git history
2. Can revert commit to restore EmailJS system
3. Supabase backups remain accessible even after rollback
4. No data loss (localStorage unchanged)

---

## Appendix

### Supabase Project Details
- **URL:** https://norkcctrttwilagknnvj.supabase.co
- **Project Name:** orderprep-backups
- **Region:** Southeast Asia (Singapore)
- **Plan:** Free tier

### Dependencies
- Add: `@supabase/supabase-js` (^2.39.0)
- Remove: `@emailjs/browser` (^4.4.1)

### Environment Variables
```env
VITE_SUPABASE_URL=https://norkcctrttwilagknnvj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

**Design approved and ready for implementation!** 🚀
