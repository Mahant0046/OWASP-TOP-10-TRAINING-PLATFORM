"""
Configuration module for OWASP Training Platform
Handles environment variables and database configuration
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class"""
    
    # Flask Configuration
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-unsafe-secret-change-in-production')
    DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    PORT = int(os.getenv('FLASK_PORT', 8855))
    
    # PostgreSQL Database Configuration
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 5432))
    DB_NAME = os.getenv('DB_NAME', 'owasp_training')
    DB_USER = os.getenv('DB_USER', 'owasp_user')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'password')
    
    # Database URL for SQLAlchemy (if needed later)
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    
    # Application Settings
    APP_NAME = os.getenv('APP_NAME', 'OWASP Training Platform')
    ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@example.com')
    
    # Email Configuration
    SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
    SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'True').lower() == 'true'
    EMAIL_ENABLED = os.getenv('EMAIL_ENABLED', 'False').lower() == 'true'
    
    @classmethod
    def get_db_params(cls):
        """Get database connection parameters as a dictionary"""
        return {
            'host': cls.DB_HOST,
            'port': cls.DB_PORT,
            'database': cls.DB_NAME,
            'user': cls.DB_USER,
            'password': cls.DB_PASSWORD
        }

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY')  # Must be set in production

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DB_NAME = os.getenv('TEST_DB_NAME', 'owasp_training_test')

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
