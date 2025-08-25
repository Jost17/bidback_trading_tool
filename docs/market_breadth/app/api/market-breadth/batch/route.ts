import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { MarketBreadthData } from '@/lib/types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, dataSource = 'csv_upload' } = body;

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data provided or data is not an array',
      }, { status: 400 });
    }

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process each record
      for (let i = 0; i < data.length; i++) {
        const record: MarketBreadthData = data[i];
        
        try {
          const query = `
            INSERT INTO market_breadth_daily (
              date,
              stocks_up_4pct_daily,
              stocks_down_4pct_daily,
              stocks_up_25pct_quarterly,
              stocks_down_25pct_quarterly,
              stocks_up_20pct_custom,
              stocks_down_20pct_custom,
              ratio_5day,
              ratio_10day,
              stocks_up_25pct_monthly,
              stocks_down_25pct_monthly,
              stocks_up_50pct_monthly,
              stocks_down_50pct_monthly,
              stocks_up_13pct_34days,
              stocks_down_13pct_34days,
              stocks_up_20dollar_custom,
              stocks_down_20dollar_custom,
              t2108,
              worden_common_stocks,
              sp_reference,
              data_source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            ON CONFLICT (date) DO UPDATE SET
              stocks_up_4pct_daily = EXCLUDED.stocks_up_4pct_daily,
              stocks_down_4pct_daily = EXCLUDED.stocks_down_4pct_daily,
              stocks_up_25pct_quarterly = EXCLUDED.stocks_up_25pct_quarterly,
              stocks_down_25pct_quarterly = EXCLUDED.stocks_down_25pct_quarterly,
              stocks_up_20pct_custom = EXCLUDED.stocks_up_20pct_custom,
              stocks_down_20pct_custom = EXCLUDED.stocks_down_20pct_custom,
              ratio_5day = EXCLUDED.ratio_5day,
              ratio_10day = EXCLUDED.ratio_10day,
              stocks_up_25pct_monthly = EXCLUDED.stocks_up_25pct_monthly,
              stocks_down_25pct_monthly = EXCLUDED.stocks_down_25pct_monthly,
              stocks_up_50pct_monthly = EXCLUDED.stocks_up_50pct_monthly,
              stocks_down_50pct_monthly = EXCLUDED.stocks_down_50pct_monthly,
              stocks_up_13pct_34days = EXCLUDED.stocks_up_13pct_34days,
              stocks_down_13pct_34days = EXCLUDED.stocks_down_13pct_34days,
              stocks_up_20dollar_custom = EXCLUDED.stocks_up_20dollar_custom,
              stocks_down_20dollar_custom = EXCLUDED.stocks_down_20dollar_custom,
              t2108 = EXCLUDED.t2108,
              worden_common_stocks = EXCLUDED.worden_common_stocks,
              sp_reference = EXCLUDED.sp_reference,
              data_source = EXCLUDED.data_source,
              updated_at = CURRENT_TIMESTAMP;
          `;

          const values = [
            record.date,
            record.stocksUp4PctDaily || null,
            record.stocksDown4PctDaily || null,
            record.stocksUp25PctQuarterly || null,
            record.stocksDown25PctQuarterly || null,
            record.stocksUp20PctCustom || null,
            record.stocksDown20PctCustom || null,
            record.ratio5Day || null,
            record.ratio10Day || null,
            record.stocksUp25PctMonthly || null,
            record.stocksDown25PctMonthly || null,
            record.stocksUp50PctMonthly || null,
            record.stocksDown50PctMonthly || null,
            record.stocksUp13Pct34Days || null,
            record.stocksDown13Pct34Days || null,
            record.stocksUp20DollarCustom || null,
            record.stocksDown20DollarCustom || null,
            record.t2108 || null,
            record.wordenCommonStocks || null,
            record.spReference || null,
            dataSource,
          ];

          await client.query(query, values);
          successCount++;
        } catch (recordError: any) {
          errorCount++;
          errors.push(`Row ${i + 1} (${record.date}): ${recordError.message}`);
          
          // If too many errors, abort the transaction
          if (errorCount > 10) {
            throw new Error(`Too many errors (${errorCount}). Aborting batch insert.`);
          }
        }
      }

      // Calculate ratios after all data is inserted
      await calculateRatios(client);

      // Log the import
      await client.query(`
        INSERT INTO data_import_log (
          filename,
          import_type,
          records_processed,
          records_imported,
          records_failed,
          status,
          completed_at,
          error_log
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        `batch_${new Date().toISOString()}`,
        'csv',
        data.length,
        successCount,
        errorCount,
        errorCount === 0 ? 'completed' : 'completed_with_errors',
        new Date(),
        errors.length > 0 ? errors.join('\n') : null
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Successfully processed ${successCount} records`,
        details: {
          total: data.length,
          success: successCount,
          errors: errorCount,
          errorDetails: errors.slice(0, 5), // First 5 errors only
        },
      });

    } catch (transactionError: any) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Batch insert error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process batch data',
      details: error.message,
    }, { status: 500 });
  }
}

// Helper function to calculate 5-day and 10-day ratios
async function calculateRatios(client: any) {
  try {
    // Calculate 5-day ratios
    await client.query(`
      UPDATE market_breadth_daily 
      SET ratio_5day = (
        SELECT 
          CASE 
            WHEN SUM(stocks_down_4pct_daily) = 0 THEN 999.9999
            ELSE ROUND(SUM(stocks_up_4pct_daily)::numeric / NULLIF(SUM(stocks_down_4pct_daily), 0), 4)
          END
        FROM market_breadth_daily inner_mbd
        WHERE inner_mbd.date <= market_breadth_daily.date
          AND inner_mbd.date >= market_breadth_daily.date - INTERVAL '4 days'
          AND inner_mbd.stocks_up_4pct_daily IS NOT NULL
          AND inner_mbd.stocks_down_4pct_daily IS NOT NULL
      )
      WHERE ratio_5day IS NULL 
        AND stocks_up_4pct_daily IS NOT NULL 
        AND stocks_down_4pct_daily IS NOT NULL;
    `);

    // Calculate 10-day ratios
    await client.query(`
      UPDATE market_breadth_daily 
      SET ratio_10day = (
        SELECT 
          CASE 
            WHEN SUM(stocks_down_4pct_daily) = 0 THEN 999.9999
            ELSE ROUND(SUM(stocks_up_4pct_daily)::numeric / NULLIF(SUM(stocks_down_4pct_daily), 0), 4)
          END
        FROM market_breadth_daily inner_mbd
        WHERE inner_mbd.date <= market_breadth_daily.date
          AND inner_mbd.date >= market_breadth_daily.date - INTERVAL '9 days'
          AND inner_mbd.stocks_up_4pct_daily IS NOT NULL
          AND inner_mbd.stocks_down_4pct_daily IS NOT NULL
      )
      WHERE ratio_10day IS NULL 
        AND stocks_up_4pct_daily IS NOT NULL 
        AND stocks_down_4pct_daily IS NOT NULL;
    `);

  } catch (ratioError) {
    console.error('Error calculating ratios:', ratioError);
    // Don't throw error as this is non-critical
  }
}