import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit') || '30';
    
    let query = `
      SELECT 
        id,
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
        data_source,
        created_at,
        updated_at
      FROM market_breadth_daily
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (startDate) {
      conditions.push(`date >= $${params.length + 1}`);
      params.push(startDate);
    }
    
    if (endDate) {
      conditions.push(`date <= $${params.length + 1}`);
      params.push(endDate);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY date DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Market breadth API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market breadth data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const query = `
      INSERT INTO market_breadth_daily (
        date,
        stocks_up_4pct_daily,
        stocks_down_4pct_daily,
        stocks_up_25pct_quarterly,
        stocks_down_25pct_quarterly,
        stocks_up_20pct_custom,
        stocks_down_20pct_custom,
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (date) DO UPDATE SET
        stocks_up_4pct_daily = EXCLUDED.stocks_up_4pct_daily,
        stocks_down_4pct_daily = EXCLUDED.stocks_down_4pct_daily,
        stocks_up_25pct_quarterly = EXCLUDED.stocks_up_25pct_quarterly,
        stocks_down_25pct_quarterly = EXCLUDED.stocks_down_25pct_quarterly,
        stocks_up_20pct_custom = EXCLUDED.stocks_up_20pct_custom,
        stocks_down_20pct_custom = EXCLUDED.stocks_down_20pct_custom,
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
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    
    const values = [
      body.date,
      body.stocksUp4PctDaily,
      body.stocksDown4PctDaily,
      body.stocksUp25PctQuarterly,
      body.stocksDown25PctQuarterly,
      body.stocksUp20PctCustom,
      body.stocksDown20PctCustom,
      body.stocksUp25PctMonthly,
      body.stocksDown25PctMonthly,
      body.stocksUp50PctMonthly,
      body.stocksDown50PctMonthly,
      body.stocksUp13Pct34Days,
      body.stocksDown13Pct34Days,
      body.stocksUp20DollarCustom,
      body.stocksDown20DollarCustom,
      body.t2108,
      body.wordenCommonStocks,
      body.spReference,
      body.dataSource || 'manual',
    ];
    
    const result = await pool.query(query, values);
    
    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Market breadth POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save market breadth data' },
      { status: 500 }
    );
  }
}