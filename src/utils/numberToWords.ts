/**
 * Utility to convert numbers into South Asian (Taka / Lakh / Crore) words
 * e.g., 55000 -> "Fifty-Five Thousand Taka Only"
 * e.g., 125000 -> "One Lakh Twenty-Five Thousand Taka Only"
 */

const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertLessThanThousand(n: number): string {
  if (n === 0) return '';

  let str = '';

  if (n >= 100) {
    str += singleDigits[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }

  if (n >= 20) {
    str += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + singleDigits[n % 10] : '') + ' ';
  } else if (n >= 10) {
    str += teens[n - 10] + ' ';
  } else if (n > 0) {
    str += singleDigits[n] + ' ';
  }

  return str;
}

export function numberToWordsBDT(amount: number): string {
  if (!amount || amount === 0) return 'Zero Taka Only';

  const rounded = Math.floor(Math.abs(amount));
  const paisa = Math.round((Math.abs(amount) - rounded) * 100);

  let num = rounded;
  let result = '';

  // Crores (1,00,00,000)
  if (num >= 10000000) {
    const crore = Math.floor(num / 10000000);
    result += convertLessThanThousand(crore) + 'Crore ';
    num %= 10000000;
  }

  // Lakhs (1,00,000)
  if (num >= 100000) {
    const lakh = Math.floor(num / 100000);
    result += convertLessThanThousand(lakh) + 'Lakh ';
    num %= 100000;
  }

  // Thousands (1,000)
  if (num >= 1000) {
    const thousand = Math.floor(num / 1000);
    result += convertLessThanThousand(thousand) + 'Thousand ';
    num %= 1000;
  }

  // Hundreds & remaining
  if (num > 0) {
    result += convertLessThanThousand(num);
  }

  result = result.trim() + ' Taka';

  if (paisa > 0) {
    result += ' and ' + convertLessThanThousand(paisa).trim() + ' Paisa';
  }

  return result + ' Only';
}
