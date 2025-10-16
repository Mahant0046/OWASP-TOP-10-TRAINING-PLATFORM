#!/usr/bin/env python3
"""
Test script for email functionality
Run this to test if email sending is working properly
"""

import os
import sys
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

from config import Config
from auth_security import EmailService

def test_email_config():
    """Test email configuration"""
    print("🔧 Testing Email Configuration")
    print("=" * 50)
    print(f"EMAIL_ENABLED: {Config.EMAIL_ENABLED}")
    print(f"SMTP_SERVER: {Config.SMTP_SERVER}")
    print(f"SMTP_PORT: {Config.SMTP_PORT}")
    print(f"SMTP_USERNAME: {Config.SMTP_USERNAME}")
    print(f"SMTP_PASSWORD: {'*' * len(Config.SMTP_PASSWORD) if Config.SMTP_PASSWORD else 'NOT SET'}")
    print(f"SMTP_USE_TLS: {Config.SMTP_USE_TLS}")
    print()
    
    if not Config.EMAIL_ENABLED:
        print("❌ Email is disabled. Set EMAIL_ENABLED=True in .env to enable real emails.")
        return False
    
    if not Config.SMTP_USERNAME:
        print("❌ SMTP_USERNAME not configured in .env")
        return False
    
    if not Config.SMTP_PASSWORD:
        print("❌ SMTP_PASSWORD not configured in .env")
        return False
    
    print("✅ Email configuration looks good!")
    return True

def test_email_sending():
    """Test sending password reset and welcome emails"""
    print("\n📧 Testing Email Sending")
    print("=" * 50)
    
    # Test email (you can change this to your email)
    test_email = Config.SMTP_USERNAME  # Send to yourself for testing
    test_username = "TestUser"
    test_token = "test_token_12345"
    
    print(f"Sending test emails to: {test_email}")
    
    try:
        # Test password reset email
        print("\n🔐 Testing Password Reset Email...")
        reset_result = EmailService.send_password_reset_email(test_email, test_username, test_token)
        
        # Test welcome email
        print("\n🎉 Testing Welcome Email...")
        welcome_result = EmailService.send_welcome_email(test_email, test_username)
        
        if reset_result and welcome_result:
            print("✅ All email tests completed successfully!")
            return True
        else:
            print("❌ Some email tests failed!")
            return False
    except Exception as e:
        print(f"❌ Email test error: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 OWASP Training Platform - Email Test")
    print("=" * 60)
    
    # Test configuration
    config_ok = test_email_config()
    
    # Test email sending
    email_ok = test_email_sending()
    
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    print(f"Configuration: {'✅ PASS' if config_ok else '❌ FAIL'}")
    print(f"Email Sending: {'✅ PASS' if email_ok else '❌ FAIL'}")
    
    if config_ok and email_ok:
        print("\n🎉 All tests passed! Email functionality is working.")
    else:
        print("\n⚠️  Some tests failed. Check the configuration above.")
        
    print("\n💡 Instructions:")
    print("1. Make sure you have a Gmail App Password set up")
    print("2. Update SMTP_PASSWORD in .env with your App Password")
    print("3. Set EMAIL_ENABLED=True in .env")
    print("4. Run this test again to verify")
    print("\n📧 Email Types Tested:")
    print("• Password Reset Email - Sent when users request password reset")
    print("• Welcome Email - Sent automatically after successful registration")

if __name__ == "__main__":
    main()
