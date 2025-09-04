const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const path = require('path');

async function importCSVFile(filePath) {
    try {
        console.log(`🔄 Processing: ${path.basename(filePath)}`);
        
        // CSV-Datei als ReadStream erstellen
        const csvStream = fs.createReadStream(filePath);
        
        // FormData erstellen
        const form = new FormData();
        form.append('csvFile', csvStream, {
            filename: path.basename(filePath),
            contentType: 'text/csv'
        });
        
        // API-Request mit axios
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
        if (response.data.summary.errors > 0) {
            console.log(`   ❌ Errors: ${response.data.summary.errors} records`);
        }
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

async function importAllFiles() {
    const sourceDir = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source';
    const files = fs.readdirSync(sourceDir)
        .filter(file => file.endsWith('.csv'))
        .sort(); // Chronological order
    
    console.log(`🚀 Starting import of ${files.length} CSV files...\n`);
    
    let totalImported = 0;
    let successCount = 0;
    
    for (const file of files) {
        const filePath = path.join(sourceDir, file);
        const result = await importCSVFile(filePath);
        
        if (result.success) {
            successCount++;
            totalImported += result.result.summary.imported || 0;
        }
        
        // Kurze Pause zwischen Importen
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n🎉 IMPORT COMPLETE!`);
    console.log(`📊 Files processed: ${successCount}/${files.length}`);
    console.log(`📈 Total records: ${totalImported}`);
    
    // Zeige finale Statistiken
    console.log(`\n📊 Checking database...`);
    try {
        const statsResponse = await axios.get('http://localhost:3001/api/market-data/stats/summary');
        console.log(`✅ Database contains ${statsResponse.data.totalRecords} records`);
        console.log(`📅 Date range: ${statsResponse.data.dateRange.earliest} to ${statsResponse.data.dateRange.latest}`);
    } catch (error) {
        console.log(`⚠️  Could not fetch database stats: ${error.message}`);
    }
}

// Start import
importAllFiles().catch(console.error);
