/**
 * Tarih Değerlerini Standart Formata (YYYY-MM-DD) Dönüştürme ve Formatlama Yardımcıları
 */

export function normalizeDateForInput(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Sayısal Excel tarihi veya Unix timestamp
  if (typeof val === 'number') {
    if (val > 100000000000) {
      // ms timestamp
      const dt = new Date(val);
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } else if (val > 20000 && val < 60000) {
      // Excel serial date
      const utcDays = Math.floor(val - 25569);
      const utcValue = utcDays * 86400;
      const dt = new Date(utcValue * 1000);
      if (!isNaN(dt.getTime())) {
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dt.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }

  const s = String(val).trim();
  if (!s || s === 'null' || s === 'undefined' || s === 'Invalid Date') return '';

  // Doğrudan YYYY-MM-DD kontrolü
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // ISO timestamp (YYYY-MM-DDTHH:mm:ss...)
  if (s.includes('T')) {
    const part = s.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
  }

  // Noktalı format: DD.MM.YYYY veya D.M.YYYY
  const dotParts = s.split('.');
  if (dotParts.length === 3) {
    const d = dotParts[0].trim().padStart(2, '0');
    const m = dotParts[1].trim().padStart(2, '0');
    let y = dotParts[2].trim();
    if (y.length === 2) y = `20${y}`;
    if (y.length === 4) return `${y}-${m}-${d}`;
  }

  // Eğik çizgili format: DD/MM/YYYY veya YYYY/MM/DD
  const slashParts = s.split('/');
  if (slashParts.length === 3) {
    if (slashParts[0].trim().length === 4) {
      const y = slashParts[0].trim();
      const m = slashParts[1].trim().padStart(2, '0');
      const d = slashParts[2].trim().padStart(2, '0');
      return `${y}-${m}-${d}`;
    } else {
      const d = slashParts[0].trim().padStart(2, '0');
      const m = slashParts[1].trim().padStart(2, '0');
      let y = slashParts[2].trim();
      if (y.length === 2) y = `20${y}`;
      if (y.length === 4) return `${y}-${m}-${d}`;
    }
  }

  // Tireli ters format: DD-MM-YYYY veya tek haneli ay/gün YYYY-M-D
  const dashParts = s.split('-');
  if (dashParts.length === 3) {
    if (dashParts[0].trim().length <= 2) {
      const d = dashParts[0].trim().padStart(2, '0');
      const m = dashParts[1].trim().padStart(2, '0');
      let y = dashParts[2].trim();
      if (y.length === 2) y = `20${y}`;
      if (y.length === 4) return `${y}-${m}-${d}`;
    } else if (dashParts[0].trim().length === 4) {
      const y = dashParts[0].trim();
      const m = dashParts[1].trim().padStart(2, '0');
      const d = dashParts[2].trim().padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Fallback: Date.parse
  try {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch {}

  return '';
}

export function formatDisplayDate(val: any): string {
  const norm = normalizeDateForInput(val);
  if (!norm) return '-';
  const parts = norm.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return norm;
}
