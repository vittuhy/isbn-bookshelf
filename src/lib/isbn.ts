/**
 * Normalize ISBN to ISBN-13 format
 */
export function normalizeISBN(isbn: string): string {
  // Remove all non-digit characters
  const cleaned = isbn.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    // Convert ISBN-10 to ISBN-13
    return '978' + cleaned.slice(0, 9) + calculateISBN13CheckDigit('978' + cleaned.slice(0, 9));
  } else if (cleaned.length === 13) {
    return cleaned;
  }
  
  throw new Error('Invalid ISBN format');
}

function calculateISBN13CheckDigit(isbn: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn[i]);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

/**
 * Convert ISBN-13 to ISBN-10
 */
export function isbn13To10(isbn13: string): string {
  if (isbn13.length !== 13 || !isbn13.startsWith('978')) {
    return '';
  }
  
  const isbn10 = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn10[i]) * (10 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 11;
  const checkChar = checkDigit === 10 ? 'X' : checkDigit.toString();
  return isbn10 + checkChar;
}

