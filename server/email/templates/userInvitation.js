import { baseLayout } from './baseLayout.js';

export function userInvitation({ name, email, inviteUrl, expiresAt }) {
  const subject = 'You\'re Invited to Join TNA Provider';
  const previewText = `${name}, you've been invited to join TNA Provider. Click the link to accept your invitation.`;

  const expiryDate = new Date(expiresAt);
  const expiryStr = expiryDate.toLocaleDateString('en-AU', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#18181b;line-height:1.5;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#18181b;line-height:1.5;">
      You have been invited to join <strong>TNA Provider</strong>. Please click the button below to accept your invitation and set up your account.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td class="email-button" style="background-color:#1e3a5f;border-radius:6px;text-align:center;">
          <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;font-size:16px;color:#ffffff;text-decoration:none;font-weight:600;">Accept Invitation</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px 0;font-size:14px;color:#71717a;line-height:1.5;">
      This invitation expires on <strong>${expiryStr}</strong>. If the button above does not work, copy and paste the following URL into your browser:
    </p>
    <p style="margin:0 0 16px 0;font-size:13px;color:#52525b;word-break:break-all;background-color:#f4f4f5;padding:12px;border-radius:4px;">${inviteUrl}</p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#71717a;line-height:1.5;">
      If you were not expecting this invitation, you can safely ignore this email.
    </p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#71717a;line-height:1.5;">
      Kind regards,<br>
      <strong>TNA Provider Team</strong>
    </p>
  `;

  const html = baseLayout({ previewText, body });

  const text = `Hi ${name},

You have been invited to join TNA Provider. Please click the link below to accept your invitation and set up your account.

Accept Invitation: ${inviteUrl}

This invitation expires on ${expiryStr}.

If you were not expecting this invitation, you can safely ignore this email.

Kind regards,
TNA Provider Team`;

  return { subject, html, text };
}
