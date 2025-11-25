#!/usr/bin/env python3
"""
Script to extract and display Excel sheets from VietinBank competency files
"""
import pandas as pd
import os

# File paths
competency_dir = "/Users/ha/projects/viettinbank-ai-interviewer/requirement_analysis/competency"
output_dir = "/Users/ha/projects/viettinbank-ai-interviewer/requirement_analysis/competency/sheets"

# Create output directory if not exists
os.makedirs(output_dir, exist_ok=True)

# Excel files to process
excel_files = [
    "Bài Giải Note LM 241125.xlsx",
    "Danh sách năng lực Vietinbank - Nhi working.xlsx"
]

for excel_file in excel_files:
    file_path = os.path.join(competency_dir, excel_file)
    print(f"\n{'='*80}")
    print(f"Processing: {excel_file}")
    print(f"{'='*80}")

    try:
        # Read all sheets
        xlsx = pd.ExcelFile(file_path)
        sheet_names = xlsx.sheet_names
        print(f"Found {len(sheet_names)} sheets: {sheet_names}")

        for sheet_name in sheet_names:
            print(f"\n--- Sheet: {sheet_name} ---")
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            print(f"Shape: {df.shape}")
            print(f"Columns: {list(df.columns)}")

            # Save to CSV
            safe_filename = f"{excel_file.replace('.xlsx', '')}_{sheet_name.replace(' ', '_').replace('/', '_')}.csv"
            output_path = os.path.join(output_dir, safe_filename)
            df.to_csv(output_path, index=False, encoding='utf-8-sig')
            print(f"Saved to: {output_path}")

            # Print first few rows
            print("\nFirst 10 rows:")
            print(df.head(10).to_string())
            print("\n")

    except Exception as e:
        print(f"Error processing {excel_file}: {e}")

print("\nDone! All sheets extracted to:", output_dir)
