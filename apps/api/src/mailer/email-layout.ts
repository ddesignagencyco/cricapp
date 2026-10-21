/**
 * The one branded shell every PakCricZone email renders inside.
 *
 * Email clients are not browsers: Outlook ignores CSS gradients and most of
 * `<style>`, Gmail strips classes, and many clients block images until asked. So this
 * is table-based HTML with inline styles and solid-colour fallbacks, the logo has alt
 * text, and every email also gets a plain-text part.
 *
 * Colours match the site: brand blue #3B68FC (hover #2A4FE0), ink #0F172A.
 */

export const BRAND = {
  name: 'PakCricZone',
  blue: '#3B68FC',
  blueDark: '#2A4FE0',
  ink: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  border: '#E2E8F0',
  page: '#F1F5FB',
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

/** A full-width primary button, rendered as a table so Outlook keeps the padding. */
export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto;">
  <tr><td align="center" bgcolor="${BRAND.blue}" style="border-radius:10px;background:${BRAND.blue};background-image:linear-gradient(135deg,${BRAND.blue},${BRAND.blueDark});">
    <a href="${href}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:Segoe UI,Arial,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}

/** A soft call-out box (security notes, expiry notes). */
export function emailNote(html: string, tone: 'info' | 'warning' = 'info'): string {
  const bg = tone === 'warning' ? '#FFF7E6' : '#EEF3FF';
  const bar = tone === 'warning' ? '#F59E0B' : BRAND.blue;
  const ink = tone === 'warning' ? '#7A4A00' : '#1E3A8A';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr><td style="background:${bg};border-left:4px solid ${bar};border-radius:0 8px 8px 0;padding:14px 16px;font-family:Segoe UI,Arial,sans-serif;font-size:13px;line-height:1.55;color:${ink};">${html}</td></tr>
</table>`;
}

/** The fallback link under a button, for clients that block buttons. */
export function emailLinkFallback(href: string): string {
  return `<p style="margin:0;font-family:Segoe UI,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted};">Button not working? Copy this link into your browser:<br><a href="${href}" style="color:${BRAND.blue};word-break:break-all;">${escapeHtml(href)}</a></p>`;
}

export function renderEmail(input: EmailLayoutInput): string {
  const { appUrl, title, preheader, bodyHtml, reason, unsubscribeUrl, preferencesUrl } = input;
  const year = new Date().getFullYear();
  const link = (path: string, label: string) =>
    `<a href="${appUrl}${path}" style="color:${BRAND.muted};text-decoration:none;font-weight:600;">${label}</a>`;

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
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

      <!-- Header -->
      <tr><td bgcolor="${BRAND.blue}" style="background:${BRAND.blue};background-image:linear-gradient(135deg,${BRAND.blue},${BRAND.blueDark});border-radius:16px 16px 0 0;padding:22px 28px;">
        <!-- Name only for now; the logo image is added once the site has a public URL. -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle" style="font-family:Segoe UI,Arial,sans-serif;">
            <div style="font-size:22px;font-weight:800;letter-spacing:0.4px;color:#FFFFFF;">🏏 ${BRAND.name}</div>
            <div style="font-size:12px;color:#DCE5FF;margin-top:3px;">Every run. Every ball. Live.</div>
          </td>
          ${input.edition ? `<td valign="middle" align="right" style="font-family:Segoe UI,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#DCE5FF;">${escapeHtml(input.edition)}</td>` : ''}
        </tr></table>
      </td></tr>

      <!-- Card -->
      <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;padding:36px 32px 32px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};font-family:Segoe UI,Arial,sans-serif;color:${BRAND.body};font-size:15px;line-height:1.65;">
        ${bodyHtml}
      </td></tr>

      <!-- Footer -->
      <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid ${BRAND.border};border-top:0;border-radius:0 0 16px 16px;padding:0 32px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border-top:1px solid ${BRAND.border};padding-top:20px;text-align:center;font-family:Segoe UI,Arial,sans-serif;font-size:13px;">
            ${link('/matches?tab=live', 'Live scores')}&nbsp;&nbsp;·&nbsp;&nbsp;${link('/news', 'News')}&nbsp;&nbsp;·&nbsp;&nbsp;${link('/psl', 'PSL')}&nbsp;&nbsp;·&nbsp;&nbsp;${link('/predictions', 'Predictions')}
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:20px 24px 0;text-align:center;font-family:Segoe UI,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};">
        ${escapeHtml(reason)}
        ${unsubscribeUrl ? `<br><a href="${unsubscribeUrl}" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a>` : ''}${preferencesUrl ? `&nbsp;·&nbsp;<a href="${preferencesUrl}" style="color:${BRAND.muted};text-decoration:underline;">Email preferences</a>` : ''}
        <br>© ${year} ${BRAND.name}. All rights reserved.
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
