import { BRAND, emailButton, renderEmail } from '../mailer/email-layout.js';

/** One "what you'll get" row: an icon tile, a title and a line of detail. */
function benefit(icon: string, title: string, detail: string): string {
  return `<tr>
  <td valign="top" style="width:44px;padding:0 0 16px;">
    <div style="width:36px;height:36px;line-height:36px;text-align:center;border-radius:10px;background:#EEF3FF;font-size:18px;">${icon}</div>
  </td>
  <td valign="top" style="padding:0 0 16px 12px;font-family:Segoe UI,Arial,sans-serif;">
    <div style="font-size:15px;font-weight:700;color:${BRAND.ink};">${title}</div>
    <div style="font-size:14px;line-height:1.55;color:${BRAND.body};">${detail}</div>
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
    title: 'Welcome to the PakCricZone newsletter',
    preheader: "You're in! Weekly cricket digests, match-day previews and the big results.",
    reason: 'You received this email because you subscribed to the PakCricZone newsletter.',
    unsubscribeUrl,
    bodyHtml: `
      <h1 style="margin:0 0 6px;font-size:24px;line-height:1.3;color:${BRAND.ink};">You're in! 🏏</h1>
      <p style="margin:0 0 24px;">Thanks for subscribing to the PakCricZone newsletter. Here's what you can expect in your inbox:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${benefit('📰', 'Weekly digest', 'The top stories, last week\'s results and the week ahead, every Monday.')}
        ${benefit('🗓️', 'Match-day previews', 'Pakistan and PSL fixtures with head-to-head records and win predictions.')}
        ${benefit('⚡', 'Big results', 'The results and news that matter, never more than one a day.')}
      </table>
      ${emailButton(`${appUrl}/matches?tab=live`, 'Follow live scores')}
      <p style="margin:0;font-size:13px;line-height:1.55;color:${BRAND.muted};text-align:center;">Changed your mind? You can unsubscribe at any time with the link at the bottom of every email.</p>`,
  });

  const text = `You're in! Welcome to the PakCricZone newsletter.

Here's what to expect:
- Weekly digest: top stories, last week's results and the week ahead, every Monday.
- Match-day previews: Pakistan and PSL fixtures with head-to-head records and win predictions.
- Big results: the results and news that matter, never more than one a day.

Follow live scores: ${appUrl}/matches?tab=live

Unsubscribe at any time: ${unsubscribeUrl}

PakCricZone — Every run. Every ball. Live.`;

  return { html, text };
}
