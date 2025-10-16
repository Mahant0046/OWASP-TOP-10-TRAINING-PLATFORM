#!/usr/bin/env python3
"""
Dynamic Module Management System
Replaces hardcoded module logic with database-driven functionality
"""

from database_postgresql import get_all_learning_modules, is_module_completed

def get_module_order():
    """Get module order from database dynamically"""
    try:
        modules = get_all_learning_modules()
        if modules:
            # Sort by order_index, then by module_id as fallback
            sorted_modules = sorted(modules, key=lambda x: (x.get('order_index', 999), x.get('module_id', '')))
            return [m['module_id'] for m in sorted_modules]
    except Exception as e:
        print(f"Error getting module order from database: {e}")
    
    # Fallback to OWASP Top 10 order
    return ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10"]

def get_next_module_id_dynamic(current_module_id):
    """Get the next module ID in sequence from database"""
    try:
        module_order = get_module_order()
        current_index = module_order.index(current_module_id)
        if current_index < len(module_order) - 1:
            return module_order[current_index + 1]
        return None  # Last module
    except (ValueError, Exception) as e:
        print(f"Error getting next module ID: {e}")
        return None

def get_user_unlocked_modules(user_id):
    """Get dynamically calculated unlocked modules for a user"""
    try:
        module_order = get_module_order()
        unlocked_modules = [module_order[0]] if module_order else []  # First module always unlocked
        
        # Unlock next module for each completed one
        for i, module_id in enumerate(module_order[:-1]):  # Exclude last module
            if is_module_completed(user_id, module_id):
                next_module = module_order[i + 1]
                if next_module not in unlocked_modules:
                    unlocked_modules.append(next_module)
        
        return unlocked_modules
    except Exception as e:
        print(f"Error calculating unlocked modules: {e}")
        return ["A01"]  # Safe fallback

def get_user_completed_modules(user_id):
    """Get dynamically calculated completed modules for a user"""
    try:
        module_order = get_module_order()
        completed_modules = []
        
        for module_id in module_order:
            if is_module_completed(user_id, module_id):
                completed_modules.append(module_id)
        
        return completed_modules
    except Exception as e:
        print(f"Error calculating completed modules: {e}")
        return []

def unlock_next_module_dynamic(user_id, current_module_id):
    """Unlock the next module for the user using dynamic logic"""
    next_module_id = get_next_module_id_dynamic(current_module_id)
    
    if not next_module_id:
        return None  # No next module to unlock
    
    from database_postgresql import get_db_connection, get_dict_cursor
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Check if next module is already unlocked
        cursor.execute('''
            SELECT COUNT(*) as count FROM user_progress 
            WHERE user_id = %s AND module_id = %s
        ''', (user_id, next_module_id))
        
        if cursor.fetchone()['count'] > 0:
            return next_module_id  # Already unlocked
        
        # Unlock the next module by creating a progress entry with 0 XP
        cursor.execute('''
            INSERT INTO user_progress (user_id, module_id, xp_earned)
            VALUES (%s, %s, 0)
            ON CONFLICT (user_id, module_id) DO NOTHING
        ''', (user_id, next_module_id))
        
        conn.commit()
        return next_module_id
        
    except Exception as e:
        conn.rollback()
        print(f"Error unlocking next module: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def get_module_progress_summary(user_id):
    """Get a complete summary of user's module progress"""
    try:
        module_order = get_module_order()
        completed_modules = get_user_completed_modules(user_id)
        unlocked_modules = get_user_unlocked_modules(user_id)
        
        progress_summary = []
        for module_id in module_order:
            status = "locked"
            if module_id in completed_modules:
                status = "completed"
            elif module_id in unlocked_modules:
                status = "unlocked"
            
            progress_summary.append({
                "module_id": module_id,
                "status": status,
                "is_completed": module_id in completed_modules,
                "is_unlocked": module_id in unlocked_modules
            })
        
        return {
            "modules": progress_summary,
            "completed_count": len(completed_modules),
            "unlocked_count": len(unlocked_modules),
            "total_count": len(module_order)
        }
    except Exception as e:
        print(f"Error getting module progress summary: {e}")
        return {
            "modules": [],
            "completed_count": 0,
            "unlocked_count": 1,
            "total_count": 10
        }
