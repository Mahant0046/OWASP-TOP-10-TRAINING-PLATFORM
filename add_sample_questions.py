#!/usr/bin/env python3
"""
Add sample assessment questions for A01 - Broken Access Control
"""

from database_postgresql import get_db_connection, get_dict_cursor
import json

def add_sample_questions():
    """Add sample assessment questions for A01"""
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Sample questions for A01 - Broken Access Control
        questions = [
            {
                'module_id': 'A01',
                'question_text': 'What is the primary cause of broken access control vulnerabilities?',
                'options': {
                    'a': 'Weak passwords',
                    'b': 'Insufficient validation of user permissions',
                    'c': 'SQL injection',
                    'd': 'Cross-site scripting'
                },
                'correct_answer': 'b',
                'points': 10,
                'difficulty': 'medium'
            },
            {
                'module_id': 'A01',
                'question_text': 'Which of the following is an example of broken access control?',
                'options': {
                    'a': 'IDOR (Insecure Direct Object Reference)',
                    'b': 'Buffer overflow',
                    'c': 'Memory leak',
                    'd': 'Denial of service'
                },
                'correct_answer': 'a',
                'points': 10,
                'difficulty': 'easy'
            },
            {
                'module_id': 'A01',
                'question_text': 'What is the best way to prevent broken access control?',
                'options': {
                    'a': 'Use HTTPS everywhere',
                    'b': 'Implement proper authorization checks',
                    'c': 'Use strong encryption',
                    'd': 'Regular security scans'
                },
                'correct_answer': 'b',
                'points': 10,
                'difficulty': 'medium'
            },
            {
                'module_id': 'A01',
                'question_text': 'In the context of web applications, what does IDOR stand for?',
                'options': {
                    'a': 'Internal Data Object Reference',
                    'b': 'Insecure Direct Object Reference',
                    'c': 'Invalid Database Operation Request',
                    'd': 'Integrated Data Output Response'
                },
                'correct_answer': 'b',
                'points': 10,
                'difficulty': 'easy'
            },
            {
                'module_id': 'A01',
                'question_text': 'Which HTTP status code should be returned when access is denied?',
                'options': {
                    'a': '401 Unauthorized',
                    'b': '403 Forbidden',
                    'c': '404 Not Found',
                    'd': '500 Internal Server Error'
                },
                'correct_answer': 'b',
                'points': 10,
                'difficulty': 'medium'
            }
        ]
        
        # Insert questions
        for i, q in enumerate(questions):
            print(f"Inserting question {i+1}: {q['question_text'][:50]}...")
            cursor.execute('''
                INSERT INTO assessment_questions 
                (module_id, question_text, options, correct_answer, points, is_active)
                VALUES (%s, %s, %s, %s, %s, TRUE)
            ''', (
                q['module_id'],
                q['question_text'],
                json.dumps(q['options']),
                q['correct_answer'],
                q['points']
            ))
            print(f"✓ Question {i+1} inserted successfully")
        
        conn.commit()
        print(f"✅ Added {len(questions)} sample questions for A01")
        
        # Verify questions were added
        cursor.execute('SELECT COUNT(*) as count FROM assessment_questions WHERE module_id = %s', ('A01',))
        count = cursor.fetchone()['count']
        print(f"✅ Total A01 questions in database: {count}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error adding sample questions: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    add_sample_questions()
