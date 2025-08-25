const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function analyzeDataByYear() {
    const dbPath = path.join(__dirname, 'backend', 'data', 'market_monitor.db');
    
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            const query = `
                SELECT 
                    strftime('%Y', date) as year,
                    COUNT(*) as count,
                    MIN(date) as earliest,
                    MAX(date) as latest
                FROM market_data 
                WHERE date IS NOT NULL
                GROUP BY strftime('%Y', date)
                ORDER BY year
            `;
            
            db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log('📊 Datensätze pro Jahr:');
                console.log('========================');
                
                let totalActual = 0;
                let totalExpected = 0;
                
                rows.forEach(row => {
                    const expected = row.year === '2025' ? 140 : 250;
                    totalActual += row.count;
                    totalExpected += expected;
                    
                    console.log(`${row.year}: ${row.count} records (${row.earliest} bis ${row.latest}) - erwartet: ~${expected}`);
                });
                
                console.log('========================');
                console.log(`Gesamt tatsächlich: ${totalActual}`);
                console.log(`Gesamt erwartet: ~${totalExpected}`);
                console.log(`Differenz: ${totalExpected - totalActual}`);
                
                // Zusätzliche Analyse
                console.log('\n🔍 Detailanalyse:');
                
                const totalQuery = 'SELECT COUNT(*) as total FROM market_data';
                db.get(totalQuery, [], (err, result) => {
                    if (err) {
                        console.error('Fehler bei Gesamtzählung:', err);
                    } else {
                        console.log(`Gesamtanzahl in DB: ${result.total}`);
                    }
                    
                    db.close();
                    resolve(rows);
                });
            });
        });
    });
}

analyzeDataByYear().catch(console.error);
