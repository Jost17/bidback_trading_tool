const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const path = require('path');

async function testSingleFile(filename) {
    try {
        console.log(`🔄 Testing: ${filename}`);
        
        const filePath = path.join('/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source', filename);
        const csvStream = fs.createReadStream(filePath);
        
        const form = new FormData();
        form.append('csvFile', csvStream, {
            filename: filename,
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
        if (response.data.summary.errors > 0) {
            console.log(`   ❌ Errors: ${response.data.summary.errors} records`);
        }
        console.log(`   📊 Format detected: ${response.data.summary.format}`);
        
        if (response.data.errorDetails && response.data.errorDetails.length > 0) {
            console.log(`   Error samples: ${response.data.errorDetails.slice(0, 3).join(', ')}`);
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

// Test einer problematischen Datei
testSingleFile('Stockbee Market Monitor 2025 - 2011.csv').then(() => {
    console.log('\nTest abgeschlossen!');
}).catch(console.error);
