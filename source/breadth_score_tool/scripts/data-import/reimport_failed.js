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

async function importFailedFiles() {
    // Die problematischen Dateien, die vorher fehlgeschlagen sind
    const failedFiles = [
        'Stockbee Market Monitor 2025 - 2011.csv',
        'Stockbee Market Monitor 2025 - 2014.csv', 
        'Stockbee Market Monitor 2025 - 2015.csv',
        'Stockbee Market Monitor 2025 - Copy of 2008 reformatted.csv'
    ];
    
    console.log(`🚀 Re-importing ${failedFiles.length} previously failed files...\n`);
    
    let totalImported = 0;
    let successCount = 0;
    
    for (const file of failedFiles) {
        const filePath = path.join('/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source', file);
        const result = await importCSVFile(filePath);
        
        if (result.success) {
            successCount++;
            totalImported += result.result.summary.imported || 0;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n🎉 RE-IMPORT COMPLETE!`);
    console.log(`📊 Files processed: ${successCount}/${failedFiles.length}`);
    console.log(`📈 Total new records: ${totalImported}`);
    
    // Finale Statistiken abrufen
    try {
        const statsResponse = await axios.get('http://localhost:3001/api/market-data/stats/summary');
        console.log(`\n📊 DATABASE STATUS:`);
        console.log(`✅ Total records now: ${statsResponse.data.total_records}`);
        console.log(`📅 Date range: ${statsResponse.data.earliest_date} to ${statsResponse.data.latest_date}`);
        console.log(`🧮 Breadth scores: ${statsResponse.data.total_records - statsResponse.data.missing_scores} calculated`);
    } catch (error) {
        console.log(`⚠️  Could not fetch final stats: ${error.message}`);
    }
}

importFailedFiles().catch(console.error);
