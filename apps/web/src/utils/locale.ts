const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function isRtlLanguage(language?: string | null): boolean {
  const value = (language || '').trim().toLowerCase();
  return value === 'ur' || value === 'urdu';
}

export function looksLikeUrdu(text?: string | null): boolean {
  return !!text && ARABIC_SCRIPT.test(text);
}

export function newsLocale(
  language?: string | null,
  sampleText?: string | null,
): { dir: 'rtl' | 'ltr'; lang: 'ur' | 'en' } {
  const sample = String(sampleText || '').replace(/<[^>]+>/g, ' ').trim();
  if (sample) {
    return looksLikeUrdu(sample)
      ? { dir: 'rtl', lang: 'ur' }
      : { dir: 'ltr', lang: 'en' };
  }
  return isRtlLanguage(language) ? { dir: 'rtl', lang: 'ur' } : { dir: 'ltr', lang: 'en' };
}
