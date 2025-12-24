// User ID generation from email hash
// Provides privacy-preserving, deterministic user IDs for Supabase storage paths

/**
 * Generate consistent user ID from email address
 * - Same email always produces same ID (deterministic)
 * - Different emails produce different IDs (unique)
 * - Email not visible in storage path (privacy)
 * - Uses SHA-256 hash, returns first 16 characters
 *
 * @param email - User's email address
 * @returns 16-character hex string user ID
 */
export async function getUserId(email: string): Promise<string> {
  // Normalize email (lowercase, trim whitespace)
  const normalizedEmail = email.toLowerCase().trim();

  // Encode email to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedEmail);

  // Hash with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert hash to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  // Return first 16 characters (sufficient uniqueness)
  return hashHex.substring(0, 16);
}

/**
 * Get user ID for currently logged-in user
 * @returns User ID or null if not logged in
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    if (!user?.email) return null;

    return await getUserId(user.email);
  } catch (error) {
    console.error('❌ Failed to get current user ID:', error);
    return null;
  }
}
