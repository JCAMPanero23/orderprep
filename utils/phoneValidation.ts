/**
 * Validates if a phone number is in UAE format
 * UAE mobile numbers: 050, 052, 054, 055, 056, 058
 * Can be in formats: +971XXXXXXXXX, 971XXXXXXXXX, 05XXXXXXXX
 */
export const isUAEPhoneNumber = (phone: string): boolean => {
  if (!phone || phone === 'N/A') return false;

  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Check various UAE formats
  const uaePatterns = [
    /^\+971(50|52|54|55|56|58)\d{7}$/,  // +971XXXXXXXXX
    /^971(50|52|54|55|56|58)\d{7}$/,    // 971XXXXXXXXX
    /^(050|052|054|055|056|058)\d{7}$/,  // 05XXXXXXXX
    /^(50|52|54|55|56|58)\d{7}$/,        // 5XXXXXXXX
  ];

  return uaePatterns.some(pattern => pattern.test(cleaned));
};

/**
 * Shows a warning for non-UAE phone numbers and returns true if user wants to proceed
 */
export const confirmNonUAEPhone = (phone: string): boolean => {
  if (isUAEPhoneNumber(phone)) {
    return true; // Valid UAE number, proceed
  }

  // Show warning for non-UAE number
  return window.confirm(
    `⚠️ Warning: "${phone}" doesn't appear to be a UAE mobile number.\n\n` +
    `UAE numbers should start with:\n` +
    `• +971 50/52/54/55/56/58\n` +
    `• 05X XXXX XXXX\n\n` +
    `Click OK to proceed anyway, or Cancel to fix the number.`
  );
};
