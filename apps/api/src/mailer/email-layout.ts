/**
 * Shared branded shell for every CriczApp email (auth, welcome, newsletters).
 *
 * Matches the CriczApp Daylight design system:
 * - Fonts: Inter (sans) and JetBrains Mono (scores, overs, verification codes)
 * - Header: Clean white surface with the official CriczApp logo and a hairline divider
 * - Palette: #F4F6F9 canvas, #FFFFFF sheet, #06152F ink, #334155 body, #0F8231 brand green
 * - Layout: Plain editorial hierarchy — no heavy top banners, tinted callout boxes, or gimmicks
 */

export const EMAIL_FONT =
  "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const EMAIL_MONO =
  "'JetBrains Mono',ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace";

export const BRAND = {
  name: 'CriczApp',
  navy: '#06152F',
  green: '#0F8231',
  greenDark: '#0B6926',
  accent: '#0D7A2C',
  softBg: '#F4F6F9',
  // Legacy aliases kept for backwards compatibility with callers.
  blue: '#0F8231',
  blueDark: '#0B6926',
  ink: '#06152F',
  body: '#334155',
  muted: '#64748B',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  tableHeader: '#EEF2F7',
  page: '#F4F6F9',
};

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!,
  );
}

export type EmailLayoutInput = {
  appUrl: string;
  /** <title> and the subject line readers see. */
  title: string;
  /** Inbox preview text shown after the subject. Keep it under ~90 characters. */
  preheader: string;
  /** Inner HTML for the white card (already escaped where it holds user data). */
  bodyHtml: string;
  /** Why the reader got this email, shown in the footer. */
  reason: string;
  /** Unsubscribe link for marketing mail (newsletters). Omit for account emails. */
  unsubscribeUrl?: string;
  /** Manage-preferences link shown beside unsubscribe in newsletters. */
  preferencesUrl?: string;
  /** Small label at the top right of the header, e.g. "Daily digest · 21 Oct". */
  edition?: string;
};

/** Primary action button matching CriczApp's `.btn-brand` treatment. */
export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr><td align="center" bgcolor="${BRAND.green}" style="background:${BRAND.green};border-radius:6px;">
    <a href="${href}" target="_blank" style="display:inline-block;padding:11px 22px;font-family:${EMAIL_FONT};font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}

/** Quiet inline note (expiry reminder or security notice). */
export function emailNote(html: string, tone: 'info' | 'warning' = 'info'): string {
  const color = tone === 'warning' ? '#92400E' : BRAND.muted;
  const bg = tone === 'warning' ? '#FFFBEB' : '#F8FAFC';
  const border = tone === 'warning' ? '#FDE68A' : BRAND.border;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">
  <tr><td style="background:${bg};border:1px solid ${border};border-radius:6px;padding:12px 14px;font-family:${EMAIL_FONT};font-size:13px;line-height:1.55;color:${color};">${html}</td></tr>
</table>`;
}

/** One-time verification or password reset code in JetBrains Mono. */
export function emailCode(code: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;">
  <tr><td bgcolor="#F8FAFC" style="background:#F8FAFC;border:1px solid ${BRAND.border};border-radius:6px;padding:16px 20px;">
    <div style="font-family:${EMAIL_FONT};font-size:12px;font-weight:500;color:${BRAND.muted};margin-bottom:6px;">${escapeHtml(label)}</div>
    <div style="font-family:${EMAIL_MONO};font-size:26px;font-weight:700;letter-spacing:6px;color:${BRAND.ink};">${escapeHtml(code)}</div>
  </td></tr>
</table>`;
}

/** Fallback link under a CTA button for mail clients that block buttons. */
export function emailLinkFallback(href: string): string {
  return `<p style="margin:20px 0 0;padding-top:16px;border-top:1px solid ${BRAND.border};font-family:${EMAIL_FONT};font-size:12px;line-height:1.55;color:${BRAND.muted};">If the button does not work, copy this link into your browser:<br><a href="${href}" style="color:${BRAND.green};word-break:break-all;text-decoration:underline;">${escapeHtml(href)}</a></p>`;
}

export function renderEmail(input: EmailLayoutInput): string {
  const { title, preheader, bodyHtml, reason, unsubscribeUrl, preferencesUrl } = input;
  const appUrl = input.appUrl.replace(/\/$/, '');
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(appUrl);
  const logoUrl = `${isLocal ? 'https://criczapp.com' : appUrl}/brand/logo-light.png`;
  const year = new Date().getFullYear();
  const link = (path: string, label: string) =>
    `<a href="${appUrl}${path}" style="color:${BRAND.body};text-decoration:none;font-weight:500;">${label}</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
  body, table, td, p, a, h1, h2, h3 {
    font-family: ${EMAIL_FONT};
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};-webkit-text-size-adjust:100%;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.page};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid ${BRAND.border};border-radius:8px;overflow:hidden;">

      <!-- Header matching CriczApp light navbar -->
      <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;padding:18px 28px;border-bottom:1px solid ${BRAND.border};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle" style="font-family:${EMAIL_FONT};">
            <a href="${appUrl}" target="_blank" style="display:inline-block;text-decoration:none;">
              <img src="${escapeHtml(logoUrl)}" alt="${BRAND.name}" height="34" style="display:block;height:34px;width:auto;max-width:160px;border:0;outline:none;text-decoration:none;font-family:${EMAIL_FONT};font-size:19px;font-weight:700;color:${BRAND.ink};" />
            </a>
          </td>
          ${input.edition ? `<td valign="middle" align="right" style="font-family:${EMAIL_FONT};font-size:12px;font-weight:500;color:${BRAND.muted};">${escapeHtml(input.edition)}</td>` : ''}
        </tr></table>
      </td></tr>

      <!-- Main Body -->
      <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;padding:28px;font-family:${EMAIL_FONT};color:${BRAND.body};font-size:15px;line-height:1.6;">
        ${bodyHtml}
      </td></tr>

      <!-- Footer Links -->
      <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;padding:16px 28px;border-top:1px solid ${BRAND.border};font-family:${EMAIL_FONT};font-size:13px;color:${BRAND.muted};">
        ${link('/matches?tab=live', 'Live scores')}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${link('/news', 'News')}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${link('/psl', 'PSL')}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${link('/predictions', 'Predictions')}
      </td></tr>

    </table>

    <!-- Fine Print -->
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
      <tr><td style="padding:16px 8px 0;font-family:${EMAIL_FONT};font-size:12px;line-height:1.6;color:${BRAND.muted};">
        ${escapeHtml(reason)}
        ${unsubscribeUrl ? `<br><a href="${unsubscribeUrl}" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a>` : ''}${preferencesUrl ? `&nbsp;&middot;&nbsp;<a href="${preferencesUrl}" style="color:${BRAND.muted};text-decoration:underline;">Email preferences</a>` : ''}
        &nbsp;&middot;&nbsp;&copy; ${year} ${BRAND.name}
      </td></tr>
    </table>

  </td></tr>
</table>
</body>
</html>`;
}
