import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Only CSV files are allowed' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Save file temporarily
    const uploadDir = path.join(process.cwd(), 'data', 'uploads');
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    
    await writeFile(filePath, buffer);
    
    // Run CSV migration script
    const migrationScript = path.join(process.cwd(), 'scripts', 'market-breadth-migration.js');
    const outputFile = path.join(process.cwd(), 'data', 'migration', `${timestamp}_output.json`);
    
    try {
      const { stdout, stderr } = await execPromise(
        `node ${migrationScript} "${filePath}" "${outputFile}"`
      );
      
      if (stderr) {
        console.error('Migration stderr:', stderr);
      }
      
      // Parse migration results
      const migrationLog = stdout.split('\n').filter(line => line.trim());
      const successMatch = migrationLog.find(line => line.includes('records processed'));
      const errorMatch = migrationLog.find(line => line.includes('Errors:'));
      
      return NextResponse.json({
        success: true,
        message: 'File uploaded and processed successfully',
        details: {
          fileName: file.name,
          size: file.size,
          processedRecords: successMatch || 'Processing complete',
          errors: errorMatch || 'No errors',
          log: migrationLog.slice(-10), // Last 10 log lines
        },
      });
    } catch (migrationError: any) {
      console.error('Migration error:', migrationError);
      return NextResponse.json({
        success: false,
        error: 'Failed to process CSV file',
        details: migrationError.message,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}