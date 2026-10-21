import { isValidMapsUrl, validateSocialValue } from '../lib/siteContact';

describe('isValidMapsUrl — host checks', () => {
  it('accepts every real Google Maps form', () => {
    expect(isValidMapsUrl('https://maps.google.com/?q=Lahore')).toBe(true);
    expect(isValidMapsUrl('https://www.google.com/maps/place/Lahore')).toBe(true);
    expect(isValidMapsUrl('https://www.google.com.pk/maps/@31.5,74.3,15z')).toBe(true);
    expect(isValidMapsUrl('https://maps.app.goo.gl/AbC123')).toBe(true);
    expect(isValidMapsUrl('https://goo.gl/maps/AbC123')).toBe(true);
    expect(isValidMapsUrl('maps.app.goo.gl/AbC123')).toBe(true);
  });

  it('rejects lookalike hosts the old prefix pattern let through', () => {
    expect(isValidMapsUrl('https://maps.google.com.evil.ru/?q=x')).toBe(false);
    expect(isValidMapsUrl('https://google.com.fake.net/maps')).toBe(false);
    expect(isValidMapsUrl('https://maps.google.com@evil.com/')).toBe(false);
    expect(isValidMapsUrl('https://www.google.com/search?q=maps')).toBe(false);
    expect(isValidMapsUrl('https://goo.gl/abc')).toBe(false);
  });

  it('requires https and no spaces or other schemes', () => {
    expect(isValidMapsUrl('http://maps.google.com/?q=Lahore')).toBe(false);
    expect(isValidMapsUrl('javascript:alert(1)//maps.google.com')).toBe(false);
    expect(isValidMapsUrl('https://maps.google.com/?q=Gulberg Lahore')).toBe(false);
  });
});

describe('validateSocialValue — host checks', () => {
  it('accepts profile links on the network itself', () => {
    expect(validateSocialValue('facebook', 'https://www.facebook.com/pakcriczone')).toBe('');
    expect(validateSocialValue('facebook', 'facebook.com/pakcriczone')).toBe('');
    expect(validateSocialValue('x', 'https://twitter.com/pakcriczone')).toBe('');
    expect(validateSocialValue('youtube', 'https://youtu.be/dQw4w9WgXcQ')).toBe('');
    expect(validateSocialValue('instagram', 'https://m.instagram.com/pakcriczone/')).toBe('');
  });

  it('rejects other domains that merely contain the network name', () => {
    expect(validateSocialValue('facebook', 'https://evil.com/facebook.com/page')).not.toBe('');
    expect(validateSocialValue('facebook', 'https://notfacebook.com/page')).not.toBe('');
    expect(validateSocialValue('instagram', 'https://instagram.com.evil.ru/x')).not.toBe('');
    expect(validateSocialValue('x', 'https://x.com@evil.com/')).not.toBe('');
  });

  it('needs a profile path, a real scheme and no spaces', () => {
    expect(validateSocialValue('facebook', 'https://facebook.com')).toMatch(/profile path/);
    expect(validateSocialValue('facebook', 'javascript:alert(1)')).toBe('Use an https link.');
    expect(validateSocialValue('facebook', 'facebook.com/pak criczone')).toMatch(/spaces/);
  });

  it('keeps WhatsApp numbers and Telegram handles', () => {
    expect(validateSocialValue('whatsapp', '+92 300 1234567')).toBe('');
    expect(validateSocialValue('telegram', '@pakcriczone')).toBe('');
  });
});
