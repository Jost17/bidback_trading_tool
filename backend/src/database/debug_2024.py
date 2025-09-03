#!/usr/bin/env python3
"""
Debug 2024 CSV file processing step by step
"""

import pandas as pd

filepath = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/source/csv/2024.csv"

print("=== Step 1: Raw CSV read ===")
df_raw = pd.read_csv(filepath, nrows=5)
print("Raw columns:", df_raw.columns.tolist())
print("Raw data:")
print(df_raw)

print(f"\n=== Check first data cell: '{df_raw.iloc[0, 0]}' ===")
print(f"Is it 'Date'? {str(df_raw.iloc[0, 0]) == 'Date'}")

print("\n=== Step 2: Skip header row ([0]) and re-read ===")
df_skip = pd.read_csv(filepath, skiprows=[0])
df_skip = df_skip.dropna(how='all')
print("After skipping row 0:")
print("Columns:", df_skip.columns.tolist())
print("First few rows:")
print(df_skip.head(3))

print(f"\n=== Check if first data row has 'Date': '{df_skip.iloc[0, 0]}' ===")
print(f"Is it 'Date'? {str(df_skip.iloc[0, 0]) == 'Date'}")

print("\n=== Step 3: Use first row as column headers ===")
if len(df_skip) > 0 and str(df_skip.iloc[0, 0]) == 'Date':
    print("Using first row as headers")
    new_columns = df_skip.iloc[0].tolist()
    print("New columns from first row:", new_columns)
    
    df_final = df_skip.iloc[1:]
    df_final.reset_index(drop=True, inplace=True)
    df_final.columns = [str(col).strip() for col in new_columns]
    
    print("Final columns:", df_final.columns.tolist())
    print("Final data sample:")
    print(df_final.head(3))
else:
    print("NOT using first row as headers")
    df_final = df_skip
    df_final.columns = df_final.columns.str.strip()
    print("Final columns:", df_final.columns.tolist())