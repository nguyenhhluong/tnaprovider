import { baseLayout } from './baseLayout.js';

export function newQuoteAdmin({ referenceNumber, customerName, customerEmail, customerPhone, company, message, adminQuoteUrl }) {
  const subject = `New Quote Request – ${referenceNumber} from ${customerName}`;
  const previewText = `New quote request ${referenceNumber} received from ${customerName}.`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#18181b;line-height:1.5;">
      A new quote request has been submitted.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="padding:8px 12px;background-color:#f4f4f5;font-size:14px;color:#52525b;font-weight:600;border-bottom:1px solid #e4e4e7;">Reference</td>
        <td style="padding:8px 12px;font-size:14px;color:#18181b;border-bottom:1px solid #e4e4e7;">${referenceNumber}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background-color:#f4f4f5;font-size:14px;color:#52525b;font-weight:600;border-bottom:1px solid #e4e4e7;">Customer</td>
        <td style="padding:8px 12px;font-size:14px;color:#18181b;border-bottom:1px solid #e4e4e7;">${customerName}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background-color:#f4f4f5;font-size:14px;color:#52525b;font-weight:600;border-bottom:1px solid #e4e4e7;">Email</td>
        <td style="padding:8px 12px;font-size:14px;color:#18181b;border-bottom:1px solid #e4e4e7;"><a href="mailto:${customerEmail}" style="color:#1e3a5f;">${customerEmail}</a></td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background-color:#f4f4f5;font-size:14px;color:#52525b;font-weight:600;border-bottom:1px solid #e4e4e7;">Phone</td>
        <td style="padding:8px 12px;font-size:14px;color:#18181b;border-bottom:1px solid #e4e4e7;">${customerPhone}</td>
      </tr>
      ${company ? `<tr>
        <td style="padding:8px 12px;background-color:#f4f4f5;font-size:14px;color:#52525b;font-weight:600;border-bottom:1px solid #e4e4e7;">Company</td>
        <td style="padding:8px 12px;font-size:14px;color:#18181b;border-bottom:1px solid #e4e4e7;">${company}</td>
      </tr>` : ''}
      <tr>
        <td style="padding:8px 12px;background-color:#f4f4f5;font-size:14px;color:#52525b;font-weight:600;border-bottom:1px solid #e4e4e7;">Message</td>
        <td style="padding:8px 12px;font-size:14px;color:#18181b;border-bottom:1px solid #e4e4e7;">${message}</td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background-color:#1e3a5f;border-radius:6px;text-align:center;">
          <a href="${adminQuoteUrl}" style="display:inline-block;padding:12px 24px;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;">View in Admin Panel</a>
        </td>
      </tr>
    </table>
  `;

  const html = baseLayout({ previewText, body });

  const text = `New Quote Request – ${referenceNumber}

Reference: ${referenceNumber}
Customer: ${customerName}
Email: ${customerEmail}
Phone: ${customerPhone}
${company ? `Company: ${company}\n` : ''}Message: ${message}

View in Admin Panel: ${adminQuoteUrl}`;

  return { subject, html, text };
}
