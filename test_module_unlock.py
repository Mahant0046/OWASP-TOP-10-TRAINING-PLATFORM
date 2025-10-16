#!/usr/bin/env python3
"""
Test module unlocking functionality
"""

from database_postgresql import is_module_completed, unlock_next_module, get_db_connection, get_dict_cursor
from gamification_system import gamification_system

def test_module_unlock(user_id=1, module_id='A01'):
    """Test if module unlocking works"""
    print(f"Testing module unlock for user {user_id}, module {module_id}")
    
    # Check current completion status
    is_completed = is_module_completed(user_id, module_id)
    print(f"Module {module_id} completed: {is_completed}")
    
    # Check activities for this user/module
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute('''
            SELECT activity_type, COUNT(*) as count
            FROM activity_completions 
            WHERE user_id = %s AND module_id = %s
            GROUP BY activity_type
        ''', (user_id, module_id))
        
        activities = cursor.fetchall()
        print(f"Activities completed for {module_id}:")
        for activity in activities:
            print(f"  - {activity['activity_type']}: {activity['count']}")
        
        total_activities = sum(activity['count'] for activity in activities)
        print(f"Total activities: {total_activities}")
        
        # If not enough activities, add some test activities
        if total_activities < 2:
            print(f"Adding test activities to reach unlock threshold...")
            
            # Add documentation activity
            result1 = gamification_system.complete_activity(
                user_id=user_id,
                module_id=module_id,
                activity_type='documentation',
                score=85,
                time_spent=300
            )
            print(f"Added documentation activity: {result1.get('success', False)}")
            
            # Add lab activity
            result2 = gamification_system.complete_activity(
                user_id=user_id,
                module_id=module_id,
                activity_type='lab',
                score=90,
                time_spent=600
            )
            print(f"Added lab activity: {result2.get('success', False)}")
        
        # Check completion status again
        is_completed_after = is_module_completed(user_id, module_id)
        print(f"Module {module_id} completed after activities: {is_completed_after}")
        
        # Try to unlock next module
        if is_completed_after:
            next_module = unlock_next_module(user_id, module_id)
            print(f"Next module unlocked: {next_module}")
        else:
            print("Module not completed yet, cannot unlock next module")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    test_module_unlock()
