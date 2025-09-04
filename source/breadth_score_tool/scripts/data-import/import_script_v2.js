const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const path = require('path');

async function importCSVFile(filePath) {
    try {
        console.log(`🔄 Processing: ${path.basename(filePath)}`);
        
        // CSV-Datei lesen
        const csvContent = fs.readFileSync(filePath, 'utf8');
        
        // FormData erstellen
        const form = new FormData();
        form.append('file', csvContent, {
            filename: path.basename(filePath),
            contentType: 'text/csv'
        });
        
        // API-Request mit axios
        const response = await axios.post('http://localhost:3001/api/csv-import/process', form, {
            headers: {
                ...form.getHeaders()
            }
        });
        
        console.log(`✅ SUCCESS: ${response.data.summary.processed} records imported`);
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
            totalImported += result.result.summary.processed || 0;
        }
        
        // Kurze Pause zwischen Importen
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n🎉 IMPORT COMPLETE!`);
    console.log(`📊 Files processed: ${successCount}/${files.length}`);
    console.log(`📈 Total records: ${totalImported}`);
}

// Start import
importAllFiles().catch(console.error);
