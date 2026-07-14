import { baseLayout } from './baseLayout.js';

export function passwordReset({ name, resetUrl, expiresAt }) {
  const subject = 'Reset Your TNA Provider Password';
  const previewText = `Hi ${name}, click here to reset your TNA Provider password.`;

  const expiryDate = new Date(expiresAt);
  const expiryStr = expiryDate.toLocaleDateString('en-AU', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#18181b;line-height:1.5;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#18181b;line-height:1.5;">
      We received a request to reset your TNA Provider account password. Click the button below to set a new password.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td class="email-button" style="background-color:#1e3a5f;border-radius:6px;text-align:center;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;font-size:16px;color:#ffffff;text-decoration:none;font-weight:600;">Reset Password</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px 0;font-size:14px;color:#71717a;line-height:1.5;">
      This reset link expires on <strong>${expiryStr}</strong>. If the button above does not work, copy and paste the following URL into your browser:
    </p>
    <p style="margin:0 0 16px 0;font-size:13px;color:#52525b;word-break:break-all;background-color:#f4f4f5;padding:12px;border-radius:4px;">${resetUrl}</p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#71717a;line-height:1.5;">
      If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#71717a;line-height:1.5;">
      Kind regards,<br>
      <strong>TNA Provider Team</strong>
    </p>
  `;

  const html = baseLayout({ previewText, body });

  const text = `Hi ${name},

We received a request to reset your TNA Provider account password. Click the link below to set a new password.

Reset Password: ${resetUrl}

This reset link expires on ${expiryStr}.

If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.

Kind regards,
TNA Provider Team`;

  return { subject, html, text };
}
