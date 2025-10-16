#!/usr/bin/env python3
"""
Test the dynamic module management system
"""

from module_manager import (
    get_module_order, get_user_unlocked_modules, get_user_completed_modules,
    get_next_module_id_dynamic, unlock_next_module_dynamic, get_module_progress_summary
)

def test_dynamic_modules(user_id=1):
    """Test the dynamic module system"""
    print("🧪 Testing Dynamic Module Management System")
    print("=" * 50)
    
    # Test module order
    print("1. Module Order:")
    module_order = get_module_order()
    print(f"   {module_order}")
    
    # Test user progress
    print(f"\n2. User {user_id} Progress:")
    completed = get_user_completed_modules(user_id)
    unlocked = get_user_unlocked_modules(user_id)
    print(f"   Completed: {completed}")
    print(f"   Unlocked: {unlocked}")
    
    # Test next module logic
    print(f"\n3. Next Module Logic:")
    for module_id in module_order[:3]:  # Test first 3 modules
        next_module = get_next_module_id_dynamic(module_id)
        print(f"   {module_id} -> {next_module}")
    
    # Test comprehensive progress summary
    print(f"\n4. Progress Summary:")
    summary = get_module_progress_summary(user_id)
    print(f"   Total modules: {summary['total_count']}")
    print(f"   Completed: {summary['completed_count']}")
    print(f"   Unlocked: {summary['unlocked_count']}")
    
    print(f"\n   Module Status:")
    for module in summary['modules'][:5]:  # Show first 5
        print(f"   - {module['module_id']}: {module['status']}")
    
    # Test unlocking next module
    print(f"\n5. Testing Module Unlock:")
    if completed:
        last_completed = completed[-1]
        next_module = unlock_next_module_dynamic(user_id, last_completed)
        print(f"   Attempting to unlock next after {last_completed}: {next_module}")
    else:
        print("   No completed modules to test unlock")
    
    print("\n✅ Dynamic module system test completed!")

if __name__ == "__main__":
    test_dynamic_modules()
