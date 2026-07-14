import { baseLayout } from './baseLayout.js';

export function quoteStatusChanged({ customerName, referenceNumber, oldStatus, newStatus, quoteUrl }) {
  const subject = `Quote ${referenceNumber} Status Updated – TNA Provider`;
  const previewText = `Your quote ${referenceNumber} status has changed to ${newStatus}.`;

  const statusLabels = {
    draft: 'Draft',
    in_review: 'In Review',
    approved: 'Approved',
    sent: 'Sent',
    accepted: 'Accepted',
    rejected: 'Rejected',
    expired: 'Expired',
    converted: 'Converted',
  };

  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#18181b;line-height:1.5;">Hi ${customerName},</p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#18181b;line-height:1.5;">
      The status of your quote <strong>${referenceNumber}</strong> has been updated.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="padding:8px 12px;background-color:#f4f4f5;font-size:14px;color:#52525b;font-weight:600;border-bottom:1px solid #e4e4e7;">Reference</td>
        <td style="padding:8px 12px;font-size:14px;color:#18181b;border-bottom:1px solid #e4e4e7;">${referenceNumber}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background-color:#f4f4f5;font-size:14px;color:#52525b;font-weight:600;border-bottom:1px solid #e4e4e7;">Previous Status</td>
        <td style="padding:8px 12px;font-size:14px;color:#18181b;border-bottom:1px solid #e4e4e7;">${statusLabels[oldStatus] || oldStatus}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background-color:#f4f4f5;font-size:14px;color:#52525b;font-weight:600;border-bottom:1px solid #e4e4e7;">New Status</td>
        <td style="padding:8px 12px;font-size:14px;color:#18181b;border-bottom:1px solid #e4e4e7;"><strong>${statusLabels[newStatus] || newStatus}</strong></td>
      </tr>
    </table>
    ${quoteUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td class="email-button" style="background-color:#1e3a5f;border-radius:6px;text-align:center;">
          <a href="${quoteUrl}" style="display:inline-block;padding:12px 24px;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;">View Quote</a>
        </td>
      </tr>
    </table>` : ''}
    <p style="margin:0 0 16px 0;font-size:16px;color:#18181b;line-height:1.5;">
      If you have any questions, please contact us at <a href="mailto:info@tnaprovider.com.au" style="color:#1e3a5f;">info@tnaprovider.com.au</a>.
    </p>
    <p style="margin:0;font-size:16px;color:#18181b;line-height:1.5;">
      Kind regards,<br>
      <strong>TNA Provider Team</strong>
    </p>
  `;

  const html = baseLayout({ previewText, body });

  const text = `Hi ${customerName},

The status of your quote ${referenceNumber} has been updated.

Reference: ${referenceNumber}
Previous Status: ${statusLabels[oldStatus] || oldStatus}
New Status: ${statusLabels[newStatus] || newStatus}

${quoteUrl ? `View Quote: ${quoteUrl}` : ''}

If you have any questions, please contact us at info@tnaprovider.com.au.

Kind regards,
TNA Provider Team`;

  return { subject, html, text };
}
