import { ParsedOrderResult, ParsedOrderItem, ParsedCustomerInfo, MenuItem } from '../types';
import { findFuzzyMatches, translateTagalog } from './fuzzyMatching';

/**
 * Extract quantity from text using multiple patterns
 */
export const extractQuantity = (text: string): number => {
  const patterns = [
    /(\d+)\s*x/i,           // "2x ribs"
    /x\s*(\d+)/i,           // "x2 ribs"
    /(\d+)\s*-/,            // "2- ribs"
    /-\s*(\d+)/,            // "- 2 ribs"
    /^(\d+)\s+/,            // "2 ribs" (start of line)
    /\s+(\d+)$/,            // "ribs 2" (end of line)
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }

  // Try written numbers (English and Tagalog)
  const writtenNumbers: Record<string, number> = {
    'one': 1, 'isa': 1,
    'two': 2, 'dalawa': 2,
    'three': 3, 'tatlo': 3,
    'four': 4, 'apat': 4,
    'five': 5, 'lima': 5,
    'six': 6, 'anim': 6,
    'seven': 7, 'pito': 7,
    'eight': 8, 'walo': 8,
    'nine': 9, 'siyam': 9,
    'ten': 10, 'sampu': 10
  };

  for (const [word, num] of Object.entries(writtenNumbers)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
      return num;
    }
  }

  return 1; // Default to 1 if no quantity found
};

/**
 * Extract customer information from text
 */
export const extractCustomerInfo = (text: string): ParsedCustomerInfo => {
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  const info: ParsedCustomerInfo = { confidence: 'low' };

  // Extract name (first line if short and no numbers)
  if (lines.length > 0 && lines[0].length < 40 && !/\d/.test(lines[0])) {
    const cleaned = lines[0].replace(/^(name|customer)[:\s-]*/i, '').trim();
    if (cleaned.length > 0 && cleaned.length < 30) {
      info.name = cleaned;
      info.confidence = 'medium';
    }
  }

  // Extract UAE phone number
  const phonePatterns = [
    /(\+?971|0?5[0-8])\s*\d{1,2}\s*\d{3}\s*\d{4}/g,
    /(\+?971|05)\d{8,9}/g,
  ];

  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Clean the phone number
      info.phone = match[0].replace(/\s/g, '');
      if (info.confidence !== 'high') info.confidence = 'medium';
      break;
    }
  }

  // Extract unit number
  const unitPatterns = [
    /\b(?:unit|apt|apartment|room)\s*#?\s*(\d+[A-Z]?)/i,
    /\b#\s*(\d{3,4})/,
    /\bunit\s*(\d{3,4})/i,
  ];

  for (const pattern of unitPatterns) {
    const match = text.match(pattern);
    if (match) {
      info.unitNumber = match[1];
      info.confidence = 'high';
      break;
    }
  }

  // Extract building
  const buildingPatterns = [
    /\b(?:building|bldg|tower)\s*([A-Z0-9]+)/i,
    /\b(tower\s*[A-Z])/i,
  ];

  for (const pattern of buildingPatterns) {
    const match = text.match(pattern);
    if (match) {
      info.building = match[1];
      info.confidence = 'high';
      break;
    }
  }

  // Extract floor
  const floorPatterns = [
    /\b(?:floor|flr|level|lvl)\s*(\d+)/i,
    /\b(\d{1,2})(?:st|nd|rd|th)\s*floor/i,
  ];

  for (const pattern of floorPatterns) {
    const match = text.match(pattern);
    if (match) {
      info.floor = match[1];
      break;
    }
  }

  return info;
};

/**
 * Parse WhatsApp order text
 */
export const parseWhatsAppOrder = (
  text: string,
  availableMenu: MenuItem[]
): ParsedOrderResult => {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const items: ParsedOrderItem[] = [];

  // Extract customer info first
  const customerInfo = extractCustomerInfo(text);

  // Parse each line for menu items
  lines.forEach((line, index) => {
    // Skip lines that look like customer info
    if (index === 0 && customerInfo.name && line.includes(customerInfo.name)) return;
    if (customerInfo.phone && line.includes(customerInfo.phone)) return;
    if (customerInfo.unitNumber && line.toLowerCase().includes('unit') && line.includes(customerInfo.unitNumber)) return;

    // Clean line and translate Tagalog
    const cleanedLine = translateTagalog(line.trim());

    // Extract quantity
    const quantity = extractQuantity(cleanedLine);

    // Remove quantity patterns to get cleaner search text
    let searchText = cleanedLine
      .replace(/\d+\s*x/gi, '')
      .replace(/x\s*\d+/gi, '')
      .replace(/\d+\s*-/g, '')
      .replace(/-\s*\d+/g, '')
      .replace(/^\d+\s+/, '')
      .replace(/\s+\d+$/, '')
      .trim();

    // If search text is too short, skip
    if (searchText.length < 2) return;

    // Find fuzzy matches (using default threshold of 50)
    const matchResults = findFuzzyMatches(searchText, availableMenu);

    if (matchResults.length > 0) {
      items.push({
        quantity,
        matchResults: matchResults.slice(0, 3), // Top 3 matches
        rawLine: line,
        confidence: matchResults[0].confidence,
        selectedMatch: matchResults[0] // Auto-select best match
      });
    } else {
      // No matches found, but looks like a menu item
      items.push({
        quantity,
        matchResults: [],
        rawLine: line,
        confidence: 'none'
      });
    }
  });

  return {
    items,
    customerInfo,
    rawText: text
  };
};
