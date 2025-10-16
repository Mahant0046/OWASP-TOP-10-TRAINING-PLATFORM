# 📧 Email Setup Guide for OWASP Training Platform

This guide will help you set up real email functionality for password reset emails using Gmail.

## 🚀 Quick Setup

### Step 1: Enable 2-Factor Authentication on Gmail
1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification**
3. Follow the steps to enable 2FA (required for App Passwords)

### Step 2: Generate Gmail App Password
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **App passwords**
3. Select **Mail** and **Other (Custom name)**
4. Enter "OWASP Training Platform" as the name
5. Click **Generate**
6. **Copy the 16-character password** (you'll need this)

### Step 3: Update Your .env File
Replace the email settings in your `.env` file:

```env
# Email Configuration (for password reset emails)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=gudisagarmahantesh720@gmail.com
SMTP_PASSWORD=your_16_character_app_password_here
SMTP_USE_TLS=True
EMAIL_ENABLED=True
```

**Important**: Replace `your_16_character_app_password_here` with the App Password from Step 2.

### Step 4: Test Email Functionality
Run the test script to verify everything works:

```bash
python test_email.py
```

## 🔧 Configuration Options

### Email Settings in .env

| Setting | Description | Example |
|---------|-------------|---------|
| `SMTP_SERVER` | Gmail SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (587 for TLS) | `587` |
| `SMTP_USERNAME` | Your Gmail address | `your.email@gmail.com` |
| `SMTP_PASSWORD` | Gmail App Password (16 chars) | `abcd efgh ijkl mnop` |
| `SMTP_USE_TLS` | Enable TLS encryption | `True` |
| `EMAIL_ENABLED` | Enable/disable real emails | `True` |

### Fallback Behavior

The system is designed with smart fallback:

- ✅ **Email Enabled + Valid Config**: Sends real emails
- ⚠️ **Email Enabled + Invalid Config**: Falls back to console logging
- 📝 **Email Disabled**: Always uses console logging
- 🔄 **SMTP Error**: Automatically falls back to console logging

## 🧪 Testing

### Manual Testing
1. Start your application: `python app.py`
2. Go to the forgot password page
3. Enter an email address
4. Check your Gmail inbox for the reset email

### Automated Testing
Run the test script:
```bash
python test_email.py
```

This will:
- ✅ Verify configuration
- 📧 Send a test email
- 📊 Report results

## 🔒 Security Features

### Built-in Security
- **TLS Encryption**: All emails sent over secure connection
- **App Passwords**: No need to store your main Gmail password
- **Token Expiry**: Reset links expire in 24 hours
- **Single Use**: Tokens can only be used once
- **IP Tracking**: All requests are logged with IP addresses

### Production Recommendations
- Use environment variables for sensitive data
- Enable email rate limiting
- Monitor failed email attempts
- Use dedicated email service (SendGrid, AWS SES) for high volume

## 🛠️ Troubleshooting

### Common Issues

#### "Authentication failed"
- ✅ Make sure 2FA is enabled on your Google account
- ✅ Use App Password, not your regular Gmail password
- ✅ Check SMTP_USERNAME matches your Gmail address

#### "Connection refused"
- ✅ Check SMTP_SERVER and SMTP_PORT settings
- ✅ Ensure internet connection is working
- ✅ Check firewall settings

#### "Email not received"
- ✅ Check spam/junk folder
- ✅ Verify email address is correct
- ✅ Check Gmail quota limits

### Debug Mode
Set `EMAIL_ENABLED=False` to disable real emails and use console logging for debugging.

## 📞 Support

If you encounter issues:
1. Run `python test_email.py` for diagnostics
2. Check the console output for error messages
3. Verify your Gmail App Password is correct
4. Ensure 2FA is enabled on your Google account

## 🎯 Alternative Email Providers

### Using Other SMTP Providers

#### Outlook/Hotmail
```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your.email@outlook.com
SMTP_PASSWORD=your_password
```

#### Yahoo Mail
```env
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USERNAME=your.email@yahoo.com
SMTP_PASSWORD=your_app_password
```

#### Custom SMTP Server
```env
SMTP_SERVER=mail.yourdomain.com
SMTP_PORT=587
SMTP_USERNAME=noreply@yourdomain.com
SMTP_PASSWORD=your_password
```

---

**✨ That's it! Your OWASP Training Platform now supports real email functionality while maintaining full backward compatibility.**
