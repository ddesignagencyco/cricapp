/**
 * Shared branded shell for every CriczApp email (auth, welcome, newsletters).
 *
 * Uses table-based HTML with inline styles and solid-colour fallbacks so emails
 * render cleanly in Gmail, Outlook, Apple Mail and mobile clients.
 *
 * Brand palette matches CriczApp:
 * - Header: Brand Navy (#06152F) with a 3px CriczApp Green (#16B800) accent bar
 * - Primary actions & links: Turf Emerald (#0D7A2C, dark #005C26)
 * - Surface: Crisp White (#FFFFFF) on Cool Slate (#F4F6F9)
 * - Geometry: Subtle architectural corners (4px–6px) and clean sans typography
 */

export const EMAIL_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";
export const EMAIL_MONO =
  "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Courier New',monospace";

export const BRAND = {
  name: 'CriczApp',
  navy: '#06152F',
  navySoft: '#0F2547',
  green: '#0D7A2C',
  greenDark: '#005C26',
  accent: '#16B800',
  softBg: '#F0F7F2',
  // Aliases kept so existing callers stay compatible with the brand refresh.
  blue: '#0D7A2C',
  blueDark: '#005C26',
  ink: '#06152F',
  body: '#334155',
  muted: '#64748B',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
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

/** Primary CTA button, rendered as a table so Outlook preserves padding and corners. */
export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:26px auto;">
  <tr><td align="center" bgcolor="${BRAND.green}" style="background:${BRAND.green};border-radius:6px;">
    <a href="${href}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:${EMAIL_FONT};font-size:14px;font-weight:600;letter-spacing:0.2px;color:#FFFFFF;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}

/** Structured editorial call-out box (security notes, expiry reminders). */
export function emailNote(html: string, tone: 'info' | 'warning' = 'info'): string {
  const bg = tone === 'warning' ? '#FFFBEB' : '#F8FAFC';
  const bar = tone === 'warning' ? '#D97706' : BRAND.green;
  const ink = tone === 'warning' ? '#78350F' : BRAND.body;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;">
  <tr><td style="background:${bg};border:1px solid ${BRAND.border};border-left:3px solid ${bar};border-radius:4px;padding:12px 16px;font-family:${EMAIL_FONT};font-size:13px;line-height:1.55;color:${ink};">${html}</td></tr>
</table>`;
}

/** One-time verification or reset code in a crisp monospace block. */
export function emailCode(code: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:14px auto 8px;">
  <tr><td align="center" style="font-family:${EMAIL_FONT};font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${BRAND.muted};padding-bottom:8px;">${escapeHtml(label)}</td></tr>
  <tr><td align="center" bgcolor="#F8FAFC" style="background:#F8FAFC;border:1px solid ${BRAND.borderStrong};border-radius:6px;padding:14px 28px;font-family:${EMAIL_MONO};font-size:28px;font-weight:700;letter-spacing:8px;color:${BRAND.ink};">${escapeHtml(code)}</td></tr>
</table>`;
}

/** Fallback link under a CTA button for restricted mail clients. */
export function emailLinkFallback(href: string): string {
  return `<p style="margin:20px 0 0;padding-top:16px;border-top:1px solid ${BRAND.border};font-family:${EMAIL_FONT};font-size:12px;line-height:1.55;color:${BRAND.muted};">Button not working? Copy and paste this link into your browser:<br><a href="${href}" style="color:${BRAND.green};word-break:break-all;text-decoration:underline;">${escapeHtml(href)}</a></p>`;
}

export function renderEmail(input: EmailLayoutInput): string {
  const { title, preheader, bodyHtml, reason, unsubscribeUrl, preferencesUrl } = input;
  const appUrl = input.appUrl.replace(/\/$/, '');
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(appUrl);
  const logoUrl = `${isLocal ? 'https://criczapp.com' : appUrl}/brand/logo-dark.png`;
  const year = new Date().getFullYear();
  const link = (path: string, label: string) =>
    `<a href="${appUrl}${path}" style="color:${BRAND.body};text-decoration:none;font-weight:600;">${label}</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.page};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border:1px solid ${BRAND.border};border-radius:6px;overflow:hidden;background:#FFFFFF;">

      <!-- Top Brand Accent Bar -->
      <tr><td bgcolor="${BRAND.accent}" style="background:${BRAND.accent};height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- Sleek Brand Navy Header -->
      <tr><td bgcolor="${BRAND.navy}" style="background:${BRAND.navy};padding:20px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle" style="font-family:${EMAIL_FONT};">
            <a href="${appUrl}" target="_blank" style="display:inline-block;text-decoration:none;">
              <img src="${escapeHtml(logoUrl)}" alt="${BRAND.name}" height="36" style="display:block;height:36px;width:auto;max-width:170px;border:0;outline:none;text-decoration:none;font-family:${EMAIL_FONT};font-size:20px;font-weight:800;color:#FFFFFF;" />
            </a>
          </td>
          ${input.edition ? `<td valign="middle" align="right" style="font-family:${EMAIL_FONT};font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#CBD5E1;">${escapeHtml(input.edition)}</td>` : ''}
        </tr></table>
      </td></tr>

      <!-- Body Card -->
      <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;padding:32px 28px 28px;font-family:${EMAIL_FONT};color:${BRAND.body};font-size:14px;line-height:1.65;">
        ${bodyHtml}
      </td></tr>

      <!-- Navigation Bar -->
      <tr><td bgcolor="#F8FAFC" style="background:#F8FAFC;border-top:1px solid ${BRAND.border};padding:16px 28px;text-align:center;font-family:${EMAIL_FONT};font-size:12px;letter-spacing:0.2px;">
        ${link('/matches?tab=live', 'Live Scores')}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${link('/news', 'News')}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${link('/psl', 'PSL')}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${link('/predictions', 'Predictions')}
      </td></tr>

    </table>

    <!-- Legal / Unsubscribe Footer -->
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
      <tr><td style="padding:18px 20px 0;text-align:center;font-family:${EMAIL_FONT};font-size:12px;line-height:1.6;color:${BRAND.muted};">
        ${escapeHtml(reason)}
        ${unsubscribeUrl ? `<br><a href="${unsubscribeUrl}" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a>` : ''}${preferencesUrl ? `&nbsp;&middot;&nbsp;<a href="${preferencesUrl}" style="color:${BRAND.muted};text-decoration:underline;">Manage preferences</a>` : ''}
        <br>&copy; ${year} ${BRAND.name}. All rights reserved.
      </td></tr>
    </table>

  </td></tr>
</table>
</body>
</html>`;
}
