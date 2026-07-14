export function baseLayout({ previewText, body }) {
  const appUrl = process.env.APP_URL || 'https://tnaprovider.com.au';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>TNA Provider</title>
  ${previewText ? `<meta name="description" content="${previewText}">` : ''}
  <!--[if !mso]><!-->
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-padding { padding: 20px 16px !important; }
      .email-button { display: block !important; width: 100% !important; text-align: center !important; }
      .email-logo { height: 36px !important; }
    }
  </style>
  <!--<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table class="email-container" role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:#1e3a5f;border-radius:8px 8px 0 0;padding:24px 32px;text-align:center;">
              <img class="email-logo" src="${appUrl}/favicon.svg" alt="TNA Provider" style="height:40px;width:auto;display:block;margin:0 auto;" />
              <h1 style="color:#ffffff;font-size:20px;margin:12px 0 0 0;font-weight:600;">TNA Provider</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="email-padding" style="background-color:#ffffff;padding:32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f4f4f5;border-radius:0 0 8px 8px;padding:24px 32px;text-align:center;border:1px solid #e4e4e7;border-top:none;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#71717a;">
                TNA Provider
              </p>
              <p style="margin:0;font-size:13px;color:#71717a;">
                <a href="${appUrl}" style="color:#1e3a5f;text-decoration:underline;">${appUrl}</a>
              </p>
              <p style="margin:8px 0 0 0;font-size:12px;color:#a1a1aa;">
                This is an automated message from TNA Provider. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
