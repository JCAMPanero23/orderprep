import { MenuItem, FuzzyMatchResult } from '../types';

/**
 * Calculate Levenshtein distance between two strings
 * (Simple implementation - no external dependencies)
 */
export const levenshteinDistance = (str1: string, str2: string): number => {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
};

/**
 * Calculate similarity score (0-100) based on Levenshtein distance
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(str1, str2);
  return Math.round(((maxLen - distance) / maxLen) * 100);
};

/**
 * Common Tagalog food-related words mapping to English
 */
export const TAGALOG_MAPPINGS: Record<string, string> = {
  'baboy': 'pork',
  'manok': 'chicken',
  'kanin': 'rice',
  'karne': 'meat',
  'lutuin': 'cooked',
  'pritong': 'fried',
  'prito': 'fried',
  'tsokolate': 'chocolate',
  'mani': 'peanuts',
  'matamis': 'sweet',
  'asim': 'sour',
  'maanghang': 'spicy',
  'mainit': 'hot',
  'malamig': 'cold',
  // Numbers in Tagalog
  'isa': 'one',
  'dalawa': 'two',
  'tatlo': 'three',
  'apat': 'four',
  'lima': 'five',
  'anim': 'six',
  'pito': 'seven',
  'walo': 'eight',
  'siyam': 'nine',
  'sampu': 'ten',
  // Common menu item words
  'liempo': 'belly',
  'costillas': 'ribs',
  'saging': 'banana',
  'itlog': 'egg',
  'pagkain': 'food',
  'ulam': 'dish',
  'dessert': 'dessert',
  'panghimagas': 'dessert',
};

/**
 * Translate common Tagalog words to English for better matching
 */
export const translateTagalog = (text: string): string => {
  let translated = text.toLowerCase();
  Object.entries(TAGALOG_MAPPINGS).forEach(([tagalog, english]) => {
    const regex = new RegExp(`\\b${tagalog}\\b`, 'gi');
    translated = translated.replace(regex, english);
  });
  return translated;
};

/**
 * Find fuzzy matches for a search query against menu items
 */
export const findFuzzyMatches = (
  query: string,
  menuItems: MenuItem[],
  threshold: number = 50 // Minimum similarity score (lowered from 60)
): FuzzyMatchResult[] => {
  const results: FuzzyMatchResult[] = [];
  const normalizedQuery = query.toLowerCase().trim();

  // If query is too short, don't bother matching
  if (normalizedQuery.length < 2) {
    return results;
  }

  menuItems.forEach(item => {
    let bestScore = 0;
    let bestMatch: FuzzyMatchResult | null = null;

    // Match against full name
    const fullNameScore = calculateSimilarity(normalizedQuery, item.name.toLowerCase());
    if (fullNameScore > bestScore) {
      bestScore = fullNameScore;
      bestMatch = {
        menuItem: item,
        confidence: fullNameScore >= 85 ? 'high' : fullNameScore >= 70 ? 'medium' : 'low',
        matchedOn: 'name',
        matchedText: item.name,
        score: fullNameScore
      };
    }

    // Match against individual words in name
    const nameWords = item.name.toLowerCase().split(/\s+/);
    nameWords.forEach(word => {
      if (word.length < 2) return;
      const wordScore = calculateSimilarity(normalizedQuery, word);
      if (wordScore > bestScore) {
        bestScore = wordScore;
        bestMatch = {
          menuItem: item,
          confidence: wordScore >= 85 ? 'high' : wordScore >= 70 ? 'medium' : 'low',
          matchedOn: 'name',
          matchedText: word,
          score: wordScore
        };
      }
    });

    // Match against description words
    if (item.description) {
      const descWords = item.description.toLowerCase().split(/\s+/);
      descWords.forEach(word => {
        if (word.length < 2) return;
        const descScore = calculateSimilarity(normalizedQuery, word);
        if (descScore > bestScore) {
          bestScore = descScore;
          bestMatch = {
            menuItem: item,
            confidence: descScore >= 85 ? 'high' : descScore >= 70 ? 'medium' : 'low',
            matchedOn: 'description',
            matchedText: word,
            score: descScore
          };
        }
      });
    }

    // Match against tags
    if (item.tags && item.tags.length > 0) {
      item.tags.forEach(tag => {
        const tagScore = calculateSimilarity(normalizedQuery, tag.toLowerCase());
        if (tagScore > bestScore) {
          bestScore = tagScore;
          bestMatch = {
            menuItem: item,
            confidence: tagScore >= 85 ? 'high' : tagScore >= 70 ? 'medium' : 'low',
            matchedOn: 'tag',
            matchedText: tag,
            score: tagScore
          };
        }
      });
    }

    // If we found a match above threshold, add it to results
    if (bestMatch && bestScore >= threshold) {
      results.push(bestMatch);
    }
  });

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
};
