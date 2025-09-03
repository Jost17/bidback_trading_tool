-- Attach backend database
ATTACH DATABASE '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/backend/src/database/trading.db' AS backend;

-- Insert migrated data
INSERT OR REPLACE INTO market_breadth (
  date, timestamp, advancing_issues, declining_issues, new_highs, new_lows,
  up_volume, down_volume, breadth_score, trend_strength, market_phase,
  data_source, notes
)
SELECT 
  date,
  date || 'T16:00:00.000Z' as timestamp,
  COALESCE(stocks_up_4pct_daily, 0) as advancing_issues,
  COALESCE(stocks_down_4pct_daily, 0) as declining_issues,
  ROUND(COALESCE(stocks_up_25pct_quarterly, 0) / 10.0) as new_highs,
  ROUND(COALESCE(stocks_down_25pct_quarterly, 0) / 10.0) as new_lows,
  COALESCE(stocks_up_25pct_monthly, 0) as up_volume,
  COALESCE(stocks_down_25pct_monthly, 0) as down_volume,
  CASE 
    WHEN (COALESCE(stocks_up_4pct_daily, 0) + COALESCE(stocks_down_4pct_daily, 0)) > 0 
    THEN (CAST(COALESCE(stocks_up_4pct_daily, 0) AS REAL) / (COALESCE(stocks_up_4pct_daily, 0) + COALESCE(stocks_down_4pct_daily, 0))) * 100
    ELSE 50
  END as breadth_score,
  CASE 
    WHEN (COALESCE(stocks_up_4pct_daily, 0) + COALESCE(stocks_down_4pct_daily, 0)) > 0 
    THEN ABS((CAST(COALESCE(stocks_up_4pct_daily, 0) AS REAL) / (COALESCE(stocks_up_4pct_daily, 0) + COALESCE(stocks_down_4pct_daily, 0))) * 100 - 50) / 50 * 100
    ELSE 0
  END as trend_strength,
  CASE 
    WHEN (COALESCE(stocks_up_4pct_daily, 0) + COALESCE(stocks_down_4pct_daily, 0)) > 0 THEN
      CASE 
        WHEN (CAST(COALESCE(stocks_up_4pct_daily, 0) AS REAL) / (COALESCE(stocks_up_4pct_daily, 0) + COALESCE(stocks_down_4pct_daily, 0))) * 100 > 70 THEN 'Strong Bull'
        WHEN (CAST(COALESCE(stocks_up_4pct_daily, 0) AS REAL) / (COALESCE(stocks_up_4pct_daily, 0) + COALESCE(stocks_down_4pct_daily, 0))) * 100 > 60 THEN 'Bull'
        WHEN (CAST(COALESCE(stocks_up_4pct_daily, 0) AS REAL) / (COALESCE(stocks_up_4pct_daily, 0) + COALESCE(stocks_down_4pct_daily, 0))) * 100 < 30 THEN 'Strong Bear'
        WHEN (CAST(COALESCE(stocks_up_4pct_daily, 0) AS REAL) / (COALESCE(stocks_up_4pct_daily, 0) + COALESCE(stocks_down_4pct_daily, 0))) * 100 < 40 THEN 'Bear'
        ELSE 'Neutral'
      END
    ELSE 'Neutral'
  END as market_phase,
  'imported' as data_source,
  'T2108: ' || COALESCE(t2108, 'N/A') || ', SP: ' || COALESCE(sp_reference, 'N/A') as notes
FROM backend.market_breadth_daily
ORDER BY date;

-- Detach backend database
DETACH DATABASE backend;

-- Show results
SELECT COUNT(*) as total_records FROM market_breadth;
SELECT MIN(date) as min_date, MAX(date) as max_date FROM market_breadth;
SELECT date, advancing_issues, declining_issues, breadth_score, market_phase FROM market_breadth ORDER BY date DESC LIMIT 5;