import { BRAND, EMAIL_FONT, emailButton, renderEmail } from '../mailer/email-layout.js';

/** Editorial benefit row with a crisp green index marker (no pill/circle bloat). */
function benefit(index: string, title: string, detail: string): string {
  return `<tr>
  <td valign="top" style="width:32px;padding:12px 0;border-bottom:1px solid ${BRAND.border};font-family:${EMAIL_FONT};font-size:12px;font-weight:700;letter-spacing:0.5px;color:${BRAND.green};">${index}</td>
  <td valign="top" style="padding:12px 0 12px 8px;border-bottom:1px solid ${BRAND.border};font-family:${EMAIL_FONT};">
    <div style="font-size:14px;font-weight:700;color:${BRAND.ink};">${title}</div>
    <div style="margin-top:2px;font-size:13px;line-height:1.55;color:${BRAND.body};">${detail}</div>
  </td>
</tr>`;
}

/** Sent once, right after someone subscribes. */
export function buildNewsletterWelcomeEmail({
  appUrl,
  unsubscribeUrl,
}: {
  appUrl: string;
  unsubscribeUrl: string;
}): { html: string; text: string } {
  const html = renderEmail({
    appUrl,
    title: 'Welcome to the CriczApp newsletter',
    preheader: "You're subscribed — daily cricket digests, match-day previews and key results.",
    edition: 'Welcome',
    reason: 'You received this email because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-family:${EMAIL_FONT};font-size:22px;font-weight:700;letter-spacing:-0.3px;line-height:1.3;color:${BRAND.ink};">Welcome to CriczApp</h1>
      <p style="margin:0 0 20px;font-family:${EMAIL_FONT};font-size:14px;line-height:1.6;color:${BRAND.body};">Thanks for subscribing to the CriczApp newsletter. Here is what you will receive in your inbox:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BRAND.border};">
        ${benefit('01', 'Daily & Weekly Digests', 'Top cricket stories, match results, and upcoming fixtures curated cleanly.')}
        ${benefit('02', 'Match-Day Previews', 'Pakistan and PSL fixtures with head-to-head context and win probability breakdowns.')}
        ${benefit('03', 'PSL & Breaking Updates', 'Standings shifts, top performers, and verified breaking stories without inbox clutter.')}
      </table>
      ${emailButton(`${appUrl}/matches?tab=live`, 'Follow Live Scores')}
      <p style="margin:0;font-family:${EMAIL_FONT};font-size:12px;line-height:1.55;color:${BRAND.muted};text-align:center;">You can manage your preferences or unsubscribe at any time using the link below.</p>`,
  });

  const text = `Welcome to the CriczApp newsletter.

Here is what you will receive:
- Daily & Weekly Digests: top cricket stories, match results, and upcoming fixtures.
- Match-Day Previews: Pakistan and PSL fixtures with head-to-head records and win predictions.
- PSL & Breaking Updates: standings shifts, top performers, and verified breaking stories.

Follow live scores: ${appUrl}/matches?tab=live

Unsubscribe at any time: ${unsubscribeUrl}

CriczApp — Every run. Every ball. Live.`;

  return { html, text };
}
