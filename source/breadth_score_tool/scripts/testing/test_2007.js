const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const path = require('path');

async function test2007() {
    try {
        console.log(`🔄 Testing 2007 format...`);
        
        const filePath = path.join('/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source', 'Stockbee Market Monitor 2025 - Copy of 2007 reformatted.csv');
        const csvStream = fs.createReadStream(filePath);
        
        const form = new FormData();
        form.append('csvFile', csvStream, {
            filename: 'Stockbee Market Monitor 2025 - Copy of 2007 reformatted.csv',
            contentType: 'text/csv'
        });
        
        const response = await axios.post('http://localhost:3001/api/csv-import/process', form, {
            headers: {
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 30000
        });
        
        console.log(`✅ SUCCESS: ${response.data.summary.imported} records imported`);
        if (response.data.summary.skipped > 0) {
            console.log(`   ⚠️  Skipped: ${response.data.summary.skipped} records`);
        }
        console.log(`   📊 Format detected: ${response.data.summary.format}`);
        
        if (response.data.errorDetails && response.data.errorDetails.length > 0) {
            console.log(`   Error samples: ${response.data.errorDetails.slice(0, 3).join(', ')}`);
        }
        
        // Finale Statistiken
        const statsResponse = await axios.get('http://localhost:3001/api/market-data/stats/summary');
        console.log(`\n📊 UPDATED DATABASE STATUS:`);
        console.log(`✅ Total records: ${statsResponse.data.total_records}`);
        console.log(`📅 Date range: ${statsResponse.data.earliest_date} to ${statsResponse.data.latest_date}`);
        
        if (statsResponse.data.missing_scores > 0) {
            console.log(`\n🔄 Calculating Breadth Scores for new data...`);
            const scoreResponse = await axios.post('http://localhost:3001/api/breadth-score/calculate');
            console.log(`✅ Calculated ${scoreResponse.data.summary.processed} new Breadth Scores!`);
            
            // Updated stats after score calculation
            const finalStats = await axios.get('http://localhost:3001/api/market-data/stats/summary');
            console.log(`\n🎯 FINAL STATS:`);
            console.log(`✅ Total records: ${finalStats.data.total_records}`);
            console.log(`🧮 All Breadth Scores: ${finalStats.data.total_records - finalStats.data.missing_scores} calculated`);
        }
        
        return response.data;
        
    } catch (error) {
        if (error.response) {
            console.log(`❌ API ERROR: ${error.response.data.error || error.response.statusText}`);
        } else {
            console.log(`❌ EXCEPTION: ${error.message}`);
        }
        return null;
    }
}

test2007().then(() => {
    console.log('\n🎉 2007 Test completed!');
}).catch(console.error);
