// Test script for dynamic module API endpoints
// Run this in browser console after logging in

console.log("🧪 Testing Dynamic Module API Endpoints");

// Test 1: Get module progress
async function testModuleProgress() {
    console.log("\n1. Testing /api/module-progress");
    try {
        const response = await fetch('/api/module-progress');
        const data = await response.json();
        console.log("✅ Module Progress:", data);
        return data;
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// Test 2: Get debug user progress
async function testDebugProgress() {
    console.log("\n2. Testing /api/debug/user-progress");
    try {
        const response = await fetch('/api/debug/user-progress');
        const data = await response.json();
        console.log("✅ Debug Progress:", data);
        return data;
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// Test 3: Unlock next module
async function testUnlockModule(moduleId = 'A01') {
    console.log(`\n3. Testing /api/debug/unlock-module for ${moduleId}`);
    try {
        const response = await fetch('/api/debug/unlock-module', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ module_id: moduleId })
        });
        const data = await response.json();
        console.log("✅ Unlock Result:", data);
        return data;
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// Test 4: Check assessment questions
async function testAssessmentQuestions(moduleId = 'A01') {
    console.log(`\n4. Testing /api/assessments/${moduleId}/questions`);
    try {
        const response = await fetch(`/api/assessments/${moduleId}/questions`);
        const data = await response.json();
        console.log("✅ Assessment Questions:", data);
        return data;
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// Test 5: Start assessment
async function testStartAssessment(moduleId = 'A01') {
    console.log(`\n5. Testing /api/assessments/${moduleId}/start`);
    try {
        const response = await fetch(`/api/assessments/${moduleId}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        console.log("✅ Start Assessment:", data);
        return data;
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// Run all tests
async function runAllTests() {
    console.log("🚀 Running all API tests...");
    
    await testModuleProgress();
    await testDebugProgress();
    await testUnlockModule('A01');
    await testAssessmentQuestions('A01');
    await testStartAssessment('A01');
    
    console.log("\n✅ All tests completed!");
}

// Auto-run tests
runAllTests();
