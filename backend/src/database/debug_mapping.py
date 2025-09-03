#!/usr/bin/env python3
"""
Debug column mapping and data flow
"""

import pandas as pd
from csv_importer import MarketBreadthCSVImporter

# Debug the 2024 file specifically
filepath = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/source/csv/2024.csv"
importer = MarketBreadthCSVImporter("dummy", "")

print("=== Structure Analysis ===")
structure_info = importer.analyze_csv_structure(filepath)
print("Structure info:", structure_info)

print("\n=== CSV Loading and Processing ===")
format_type = structure_info['format_type']
skip_rows = structure_info['skip_rows']

if skip_rows:
    df = pd.read_csv(filepath, skiprows=skip_rows)
else:
    df = pd.read_csv(filepath)

df = df.dropna(how='all')
print("Before header handling:")
print("Columns:", df.columns.tolist())
print("First row data:", df.iloc[0].tolist() if len(df) > 0 else "No data")

# Handle special case where headers are in first data row
if len(df) > 0 and str(df.iloc[0, 0]) == 'Date':
    new_columns = df.iloc[0].tolist()
    df = df.iloc[1:]
    df.reset_index(drop=True, inplace=True)
    df.columns = [str(col).strip() for col in new_columns]
    print("After using first row as headers:")
    print("Columns:", df.columns.tolist())
else:
    df.columns = df.columns.str.strip()

print("First few data rows:")
print(df.head(3))

print("\n=== Column Mapping ===")
column_mapping = importer.column_mappings['standard'] if format_type == 'standard' else importer.column_mappings['early']
print("Available columns in CSV:", df.columns.tolist())
print("Column mapping for format", format_type)
for csv_col, db_field in column_mapping.items():
    if csv_col in df.columns:
        print(f"  MATCH: '{csv_col}' -> '{db_field}'")
    else:
        print(f"  NO MATCH: '{csv_col}' -> '{db_field}'")

print("\n=== Date Parsing Test ===")
if 'Date' in df.columns:
    print("Testing date parsing on Date column:")
    for i in range(min(5, len(df))):
        date_value = df['Date'].iloc[i]
        parsed_date = importer.parse_date(date_value)
        print(f"  '{date_value}' -> '{parsed_date}'")
elif len(df) > 0:
    print("Testing date parsing on first column:")
    for i in range(min(5, len(df))):
        date_value = df.iloc[i, 0]
        parsed_date = importer.parse_date(date_value)
        print(f"  '{date_value}' -> '{parsed_date}'")