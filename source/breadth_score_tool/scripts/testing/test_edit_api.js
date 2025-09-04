#!/usr/bin/env node

// Test script für die API-Edit-Funktionalität
async function testEditAPI() {
  console.log('🧪 Testing API Edit Functionality...\n');

  try {
    // 1. Fetch a test record
    console.log('1. Fetching test record...');
    const getResponse = await fetch('http://localhost:3001/api/market-data?limit=1');
    const getData = await getResponse.json();
    
    if (!getData.data || getData.data.length === 0) {
      throw new Error('No test data available');
    }
    
    const testRecord = getData.data[0];
    console.log('✅ Found test record:', testRecord.id, 'Date:', testRecord.date);
    
    // 2. Test updating a field
    console.log('\n2. Testing PUT request...');
    const updateData = {
      ...testRecord,
      stocks_up_4pct: (testRecord.stocks_up_4pct || 0) + 1  // Increment by 1
    };
    
    const putResponse = await fetch(`http://localhost:3001/api/market-data/${testRecord.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!putResponse.ok) {
      const errorData = await putResponse.json();
      console.error('❌ PUT failed:', errorData);
      return;
    }
    
    const putResult = await putResponse.json();
    console.log('✅ PUT successful!');
    console.log('   Old value:', testRecord.stocks_up_4pct);
    console.log('   New value:', putResult.data.stocks_up_4pct);
    
    // 3. Verify the change
    console.log('\n3. Verifying change...');
    const verifyResponse = await fetch(`http://localhost:3001/api/market-data/${testRecord.id}`);
    const verifyData = await verifyResponse.json();
    
    if (verifyData.stocks_up_4pct === putResult.data.stocks_up_4pct) {
      console.log('✅ Change verified successfully!');
    } else {
      console.log('❌ Verification failed');
    }
    
    // 4. Restore original value
    console.log('\n4. Restoring original value...');
    const restoreData = {
      ...testRecord
    };
    
    const restoreResponse = await fetch(`http://localhost:3001/api/market-data/${testRecord.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(restoreData),
    });
    
    if (restoreResponse.ok) {
      console.log('✅ Original value restored');
    }
    
    console.log('\n🎉 API Edit Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test if this is the main module
if (typeof window === 'undefined') {
  testEditAPI();
}
