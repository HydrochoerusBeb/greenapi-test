export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    digits = `7${digits}`;
  }

  if (digits.length < 11 || digits.length > 15) {
    return '';
  }

  return digits;
}

export function samePhone(left: string, right: string): boolean {
  const a = left.replace(/\D/g, '');
  const b = right.replace(/\D/g, '');
  return a.length > 0 && a === b;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }

  return digits ? `+${digits}` : '';
}

export function suggestApiUrl(idInstance: string): string {
  const id = idInstance.replace(/\D/g, '');
  if (id.length < 4) return '';
  return `https://${id.slice(0, 4)}.api.green-api.com`;
}

export function parseApiUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return '';
    return url.origin;
  } catch {
    return '';
  }
}
