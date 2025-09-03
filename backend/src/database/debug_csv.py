#!/usr/bin/env python3
"""
Debug CSV parsing issues
"""

import pandas as pd

# Debug the 2024 file structure
filepath = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/source/csv/2024.csv"

print("=== Raw CSV Structure ===")
df_raw = pd.read_csv(filepath, nrows=5)
print("Columns:", df_raw.columns.tolist())
print("First few rows:")
print(df_raw.head())

print("\n=== After detecting headers ===")
sample_df = pd.read_csv(filepath, nrows=3)
skip_rows = []

if 'Primary' in str(sample_df.columns[0]) or 'Primary' in str(sample_df.iloc[0].values):
    print("Found 'Primary' in headers, will skip header rows")
    skip_rows = [0]
    if len(sample_df) > 2 and sample_df.iloc[2].isna().all():
        skip_rows.append(2)

print(f"Skip rows: {skip_rows}")

df = pd.read_csv(filepath, skiprows=skip_rows)
df = df.dropna(how='all')

print("Columns after skipping:", df.columns.tolist())
print("First few rows:")
print(df.head(3))

# Check for header row
if len(df) > 0:
    print(f"First row, first column value: '{df.iloc[0, 0]}'")
    print(f"Is it 'Date'? {df.iloc[0, 0] == 'Date'}")
    
    # Check column mapping
    if 'Date' in df.columns:
        print(f"Date column exists with values: {df['Date'].iloc[:3].tolist()}")
    else:
        print("No 'Date' column found")

print("\n=== Check 2007 file ===")
filepath_2007 = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/source/csv/2007.csv"
df_2007 = pd.read_csv(filepath_2007, nrows=5)
print("2007 Columns:", df_2007.columns.tolist())
print("2007 First few rows:")
print(df_2007.head())