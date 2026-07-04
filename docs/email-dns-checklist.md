# Email DNS Checklist — TNA Provider

## Required DNS Records

### A Record
```
mail.tnaprovider.com.au   A   139.180.175.60
```
- Cloudflare proxy must be **OFF** (DNS only, grey cloud)
- Email ports do not work through Cloudflare proxy

### MX Record
```
tnaprovider.com.au   MX   10   mail.tnaprovider.com.au
```

### SPF Record (TXT)
```
tnaprovider.com.au   TXT   "v=spf1 mx a ip4:139.180.175.60 ~all"
```

### DKIM Record (TXT)
Generate DKIM key in Stalwart admin, then add:
```
default._domainkey.tnaprovider.com.au   TXT   "v=DKIM1; k=rsa; p=<PUBLIC_KEY>"
```

### DMARC Record (TXT)
```
_dmarc.tnaprovider.com.au   TXT   "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@tnaprovider.com.au; pct=100"
```
- Note: `dmarc-reports@tnaprovider.com.au` must exist before enabling `rua` reports, or use a separate mailbox that already accepts mail.

### PTR/rDNS Record
- Request from VPS provider
- Must resolve: `<VPS_IP>` -> `mail.tnaprovider.com.au`

### Optional Records

#### CAA Record
```
tnaprovider.com.au   CAA   0   issue   "letsencrypt.org"
```

#### MTA-STS (TXT)
```
_mta-sts.tnaprovider.com.au   TXT   "v=STSv1; id=20260101;"
```
Plus HTTPS endpoint at `mta-sts.tnaprovider.com.au/.well-known/mta-sts.txt`

#### TLS-RPT (TXT)
```
_smtp._tls.tnaprovider.com.au   TXT   "v=TLSRPTv1; rua=mailto:tls-reports@tnaprovider.com.au"
```

## Cloudflare Rules
- `mail.tnaprovider.com.au` must be DNS-only (grey cloud)
- Email ports (25, 587, 993, 465) do not work through Cloudflare proxy
- If using Cloudflare, add appropriate page rules to bypass proxy for mail subdomain

## Firewall Rules (VPS)
Allow inbound:
- Port 25 (SMTP) - from any
- Port 587 (Submission) - from any
- Port 993 (IMAPS) - from any
- Port 465 (SMTPS) - optional, from any

Port 443 is handled by Caddy (already open for the website). Do not open a separate 443 rule for Stalwart.

Allow outbound:
- Port 25 (SMTP) - to any (must not be blocked by VPS provider)

## Verification Commands
```bash
# Check A record
dig mail.tnaprovider.com.au A +short

# Check MX record
dig tnaprovider.com.au MX +short

# Check SPF
dig tnaprovider.com.au TXT +short

# Check DKIM
dig default._domainkey.tnaprovider.com.au TXT +short

# Check DMARC
dig _dmarc.tnaprovider.com.au TXT +short

# Check PTR
dig -x 139.180.175.60 +short

# Test SMTP connection
nc -v mail.tnaprovider.com.au 25

# Test IMAP connection
nc -v mail.tnaprovider.com.au 993

# Mail delivery test
swaks --to test@tnaprovider.com.au --from your@gmail.com --server mail.tnaprovider.com.au
```
