export const SOCIAL_PLATFORMS = [
  { id: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/pakcriczone' },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/pakcriczone' },
  { id: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/pakcriczone' },
  { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@pakcriczone' },
  { id: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@pakcriczone' },
  { id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/pakcriczone' },
  { id: 'threads', label: 'Threads', placeholder: 'https://threads.net/@pakcriczone' },
  { id: 'telegram', label: 'Telegram', placeholder: 'https://t.me/pakcriczone' },
  { id: 'whatsapp', label: 'WhatsApp', placeholder: '+923001234567' },
  { id: 'discord', label: 'Discord', placeholder: 'https://discord.gg/invite' },
  { id: 'snapchat', label: 'Snapchat', placeholder: 'https://snapchat.com/add/pakcriczone' },
  { id: 'reddit', label: 'Reddit', placeholder: 'https://reddit.com/r/pakcriczone' },
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]['id'];

export function socialLabel(id: string): string {
  return SOCIAL_PLATFORMS.find((item) => item.id === id)?.label || id;
}

export function socialHref(platform: string, value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('mailto:')) return raw;
  const digits = raw.replace(/[^\d]/g, '');
  if (platform === 'whatsapp' && digits) return `https://wa.me/${digits}`;
  if (platform === 'telegram') return `https://t.me/${raw.replace(/^@/, '')}`;
  return raw.startsWith('http') ? raw : `https://${raw}`;
}

export function phoneHref(value: string): string {
  const digits = value.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

export function whatsappHref(value: string): string {
  return socialHref('whatsapp', value);
}
