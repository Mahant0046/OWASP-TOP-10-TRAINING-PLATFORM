#!/usr/bin/env python3
"""
Database Migration Runner
Runs all pending migrations for the OWASP Training Platform
"""

import os
import sys
import psycopg2
from database_postgresql import get_db_connection

def run_migration_file(filepath):
    """Run a single migration file"""
    print(f"Running migration: {os.path.basename(filepath)}")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Execute the migration
        cursor.execute(sql_content)
        conn.commit()
        
        print(f"✅ Successfully executed: {os.path.basename(filepath)}")
        return True
        
    except Exception as e:
        print(f"❌ Error executing {os.path.basename(filepath)}: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def get_migration_files():
    """Get all migration files in order"""
    migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    
    if not os.path.exists(migrations_dir):
        print(f"❌ Migrations directory not found: {migrations_dir}")
        return []
    
    # Get all .sql files and sort them
    migration_files = []
    for filename in os.listdir(migrations_dir):
        if filename.endswith('.sql'):
            filepath = os.path.join(migrations_dir, filename)
            migration_files.append(filepath)
    
    # Sort by filename (assumes numbered naming like 001_, 002_, etc.)
    migration_files.sort()
    return migration_files

def check_migration_table():
    """Create migrations tracking table if it doesn't exist"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"❌ Error creating migrations table: {e}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def is_migration_executed(filename):
    """Check if a migration has already been executed"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT COUNT(*) FROM schema_migrations WHERE filename = %s',
            (filename,)
        )
        
        count = cursor.fetchone()[0]
        return count > 0
        
    except Exception as e:
        print(f"❌ Error checking migration status: {e}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def mark_migration_executed(filename):
    """Mark a migration as executed"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'INSERT INTO schema_migrations (filename) VALUES (%s)',
            (filename,)
        )
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"❌ Error marking migration as executed: {e}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def main():
    """Main migration runner"""
    print("🚀 Starting database migrations...")
    print("=" * 50)
    
    # Check/create migrations table
    if not check_migration_table():
        print("❌ Failed to create migrations tracking table")
        sys.exit(1)
    
    # Get all migration files
    migration_files = get_migration_files()
    
    if not migration_files:
        print("ℹ️  No migration files found")
        return
    
    executed_count = 0
    skipped_count = 0
    
    # Run each migration
    for filepath in migration_files:
        filename = os.path.basename(filepath)
        
        # Check if already executed
        if is_migration_executed(filename):
            print(f"⏭️  Skipping (already executed): {filename}")
            skipped_count += 1
            continue
        
        # Run the migration
        if run_migration_file(filepath):
            mark_migration_executed(filename)
            executed_count += 1
        else:
            print(f"❌ Migration failed: {filename}")
            print("🛑 Stopping migration process")
            sys.exit(1)
    
    print("=" * 50)
    print(f"✅ Migration process completed!")
    print(f"📊 Executed: {executed_count}, Skipped: {skipped_count}")
    
    if executed_count > 0:
        print("🎉 New database tables and data have been created!")
        print("📋 Available features:")
        print("   - Documentation management")
        print("   - Assessment system")
        print("   - Progress tracking")
        print("   - Statistics and analytics")

if __name__ == "__main__":
    main()
