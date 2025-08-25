const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const path = require('path');

async function importCSVFile(filePath) {
    try {
        console.log(`🔄 Processing: ${path.basename(filePath)}`);
        
        const csvStream = fs.createReadStream(filePath);
        const form = new FormData();
        form.append('csvFile', csvStream, {
            filename: path.basename(filePath),
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
        console.log(`   📊 Format: ${response.data.summary.format}`);
        
        return { success: true, result: response.data };
        
    } catch (error) {
        if (error.response) {
            console.log(`❌ API ERROR: ${error.response.data.error || error.response.statusText}`);
        } else {
            console.log(`❌ EXCEPTION: ${error.message}`);
        }
        return { success: false, error: error.message };
    }
}

async function importNewFiles() {
    // Die neuen Dateien
    const newFiles = [
        'Stockbee Market Monitor 2025 - 2009.csv',
        'Stockbee Market Monitor 2025 - 2012.csv',
        'Stockbee Market Monitor 2025 - 2013.csv'  // Re-import für komplette Daten
    ];
    
    console.log(`🚀 Importing ${newFiles.length} new files...\n`);
    
    let totalImported = 0;
    let successCount = 0;
    
    for (const file of newFiles) {
        const filePath = path.join('/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source', file);
        const result = await importCSVFile(filePath);
        
        if (result.success) {
            successCount++;
            totalImported += result.result.summary.imported || 0;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n🎉 NEW FILES IMPORT COMPLETE!`);
    console.log(`📊 Files processed: ${successCount}/${newFiles.length}`);
    console.log(`📈 Total new records: ${totalImported}`);
    
    // Finale Statistiken abrufen
    try {
        const statsResponse = await axios.get('http://localhost:3001/api/market-data/stats/summary');
        console.log(`\n📊 UPDATED DATABASE STATUS:`);
        console.log(`✅ Total records now: ${statsResponse.data.total_records}`);
        console.log(`📅 Date range: ${statsResponse.data.earliest_date} to ${statsResponse.data.latest_date}`);
        console.log(`🧮 Breadth scores calculated: ${statsResponse.data.total_records - statsResponse.data.missing_scores}`);
        console.log(`⚠️  Missing scores: ${statsResponse.data.missing_scores}`);
        
        if (statsResponse.data.missing_scores > 0) {
            console.log(`\n🔄 Calculating missing Breadth Scores...`);
            const scoreResponse = await axios.post('http://localhost:3001/api/breadth-score/calculate');
            console.log(`✅ Calculated ${scoreResponse.data.summary.processed} new Breadth Scores!`);
        }
        
    } catch (error) {
        console.log(`⚠️  Could not fetch final stats: ${error.message}`);
    }
}

importNewFiles().catch(console.error);
