import { BRAND, EMAIL_FONT, emailButton, renderEmail } from '../mailer/email-layout.js';

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
    preheader: "You're subscribed to CriczApp updates — match previews, digests and PSL coverage.",
    reason: 'You received this email because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl,
    bodyHtml: `
      <h1 style="margin:0 0 10px;font-family:${EMAIL_FONT};font-size:21px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${BRAND.ink};">You're subscribed</h1>
      <p style="margin:0 0 16px;font-family:${EMAIL_FONT};font-size:15px;line-height:1.6;color:${BRAND.body};">Thanks for signing up for the CriczApp newsletter. We keep things concise and focused on the cricket that matters:</p>
      <ul style="margin:0 0 8px;padding-left:18px;font-family:${EMAIL_FONT};font-size:14px;line-height:1.7;color:${BRAND.body};">
        <li style="margin-bottom:6px;"><strong style="color:${BRAND.ink};">Daily &amp; weekly digests</strong> — top stories, recent results, and upcoming fixtures.</li>
        <li style="margin-bottom:6px;"><strong style="color:${BRAND.ink};">Match previews</strong> — Pakistan and PSL matches with head-to-head context and win probabilities.</li>
        <li><strong style="color:${BRAND.ink};">PSL &amp; breaking updates</strong> — standings, top performers, and major verified stories.</li>
      </ul>
      ${emailButton(`${appUrl}/matches?tab=live`, 'Follow live scores')}
      <p style="margin:0;font-family:${EMAIL_FONT};font-size:13px;line-height:1.55;color:${BRAND.muted};">You can update what you receive or unsubscribe at any time from the bottom of any email.</p>`,
  });

  const text = `You're subscribed to the CriczApp newsletter.

Thanks for signing up. Here is what we send:
- Daily & weekly digests: top stories, recent results, and upcoming fixtures.
- Match previews: Pakistan and PSL matches with head-to-head records and win probabilities.
- PSL & breaking updates: standings, top performers, and major verified stories.

Follow live scores: ${appUrl}/matches?tab=live

Unsubscribe at any time: ${unsubscribeUrl}

CriczApp — Every run. Every ball. Live.`;

  return { html, text };
}
