import { baseLayout } from './baseLayout.js';

export function quoteRequestConfirmation({ customerName, referenceNumber }) {
  const subject = 'Quote Request Received – TNA Provider';
  const previewText = `Hi ${customerName}, we've received your quote request (${referenceNumber}).`;
  const body = `
    <p style="margin:0 0 16px 0;font-size:16px;color:#18181b;line-height:1.5;">Hi ${customerName},</p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#18181b;line-height:1.5;">
      Thank you for reaching out to TNA Provider. We have received your quote request and our team will review it shortly.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;border-radius:6px;padding:16px;margin-bottom:16px;width:100%;">
      <tr>
        <td style="font-size:14px;color:#52525b;padding-bottom:4px;">Reference Number</td>
      </tr>
      <tr>
        <td style="font-size:18px;color:#1e3a5f;font-weight:600;">${referenceNumber}</td>
      </tr>
    </table>
    <p style="margin:0 0 16px 0;font-size:16px;color:#18181b;line-height:1.5;">
      What happens next?
    </p>
    <ul style="margin:0 0 16px 0;padding-left:20px;font-size:16px;color:#18181b;line-height:1.5;">
      <li>Our team will review your project requirements</li>
      <li>We will prepare a detailed quote</li>
      <li>A TNA Provider representative will contact you to discuss next steps</li>
    </ul>
    <p style="margin:0 0 16px 0;font-size:16px;color:#18181b;line-height:1.5;">
      If you have any urgent enquiries, please contact us at <a href="mailto:info@tnaprovider.com.au" style="color:#1e3a5f;">info@tnaprovider.com.au</a>.
    </p>
    <p style="margin:0;font-size:16px;color:#18181b;line-height:1.5;">
      Kind regards,<br>
      <strong>TNA Provider Team</strong>
    </p>
  `;

  const html = baseLayout({ previewText, body });

  const text = `Hi ${customerName},

Thank you for reaching out to TNA Provider. We have received your quote request and our team will review it shortly.

Reference Number: ${referenceNumber}

What happens next?
- Our team will review your project requirements
- We will prepare a detailed quote
- A TNA Provider representative will contact you to discuss next steps

If you have any urgent enquiries, please contact us at info@tnaprovider.com.au.

Kind regards,
TNA Provider Team`;

  return { subject, html, text };
}
