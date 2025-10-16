#!/usr/bin/env python3
"""
Reset All User Progress Script
This script resets all user progress, XP, levels, and achievements.
Use with caution - this action cannot be undone!
"""

import sys
from database_postgresql import reset_all_users_progress

def main():
    print("🔄 OWASP Training Platform - Reset All User Progress")
    print("=" * 60)
    print("⚠️  WARNING: This will reset ALL user progress including:")
    print("   • All XP points and levels")
    print("   • All completed modules and activities") 
    print("   • All achievements and streaks")
    print("   • All learning activity records")
    print("   • All animation interactions")
    print()
    print("❌ This action CANNOT be undone!")
    print()
    
    # Double confirmation
    confirm1 = input("Are you sure you want to reset ALL user progress? (type 'yes' to continue): ")
    if confirm1.lower() != 'yes':
        print("❌ Operation cancelled.")
        return
    
    confirm2 = input("This will permanently delete all user progress data. Type 'RESET ALL' to confirm: ")
    if confirm2 != 'RESET ALL':
        print("❌ Operation cancelled.")
        return
    
    print("\n🔄 Resetting all user progress...")
    
    try:
        reset_all_users_progress()
        print("\n✅ SUCCESS: All user progress has been reset!")
        print("📊 All users now have:")
        print("   • XP: 0")
        print("   • Level: 1") 
        print("   • Modules completed: 0")
        print("   • Achievements: 0")
        print("   • Streak: 0")
        print("\n🎯 Users can now start fresh with the learning flow system!")
        
    except Exception as e:
        print(f"\n❌ ERROR: Failed to reset user progress: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
