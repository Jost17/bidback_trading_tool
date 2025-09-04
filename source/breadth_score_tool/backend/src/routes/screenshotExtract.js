import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { asyncHandler, sendSuccess, ValidationError } from '../middleware/errorHandler.js';
import ocrService from '../services/ocrService.js';

const router = express.Router();

// Configure multer for screenshot uploads
const upload = multer({
  dest: join(dirname(fileURLToPath(import.meta.url)), '../../uploads/screenshots/'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * Extract text patterns from screenshot using simple pattern matching
 * This is a simplified version - in production you'd use OCR like Tesseract.js or OpenAI Vision API
 */
function extractMarketDataFromText(text) {
  const data = {};
  
  // Define patterns based on your example
  const patterns = {
    mm_4_bullish: /mm_4%_bullish.*?(\d+)/i,
    mm_4_bearish: /mm_4%_bearish.*?(\d+)/i,
    mm_25_up_quarter: /mm_25%up_quarter.*?(\d+)/i,
    mm_25_down_quarter: /mm_25%down_quarter.*?(\d+)/i,
    mm_25_up_month: /mm_25%up_month.*?(\d+)/i,
    mm_25_down_month: /mm_25%down_month.*?(\d+)/i,
    mm_50_up_month: /mm_50%up_month.*?(\d+)/i,
    mm_50_down_month: /mm_50%down_month.*?(\d+)/i,
    mm_up13_in34days: /mm_#up13%in34days.*?(\d+)/i,
    mm_down13_in34days: /mm_#down13%in34days.*?(\d+)/i,
    us_common_stocks: /US Common Stocks.*?(\d+)/i,
    sp500: /SP-500.*?([\d,]+\.?\d*)/i
  };

  // Alternative patterns for variations in text
  const alternativePatterns = {
    mm_4_bullish: [/4%.*?bullish.*?(\d+)/i, /bullish.*?4%.*?(\d+)/i],
    mm_4_bearish: [/4%.*?bearish.*?(\d+)/i, /bearish.*?4%.*?(\d+)/i],
    mm_25_up_quarter: [/25%.*?up.*?quarter.*?(\d+)/i, /quarter.*?25%.*?up.*?(\d+)/i],
    mm_25_down_quarter: [/25%.*?down.*?quarter.*?(\d+)/i, /quarter.*?25%.*?down.*?(\d+)/i],
    mm_25_up_month: [/25%.*?up.*?month.*?(\d+)/i, /month.*?25%.*?up.*?(\d+)/i],
    mm_25_down_month: [/25%.*?down.*?month.*?(\d+)/i, /month.*?25%.*?down.*?(\d+)/i],
    mm_50_up_month: [/50%.*?up.*?month.*?(\d+)/i, /month.*?50%.*?up.*?(\d+)/i],
    mm_50_down_month: [/50%.*?down.*?month.*?(\d+)/i, /month.*?50%.*?down.*?(\d+)/i],
    mm_up13_in34days: [/13%.*?34.*?days.*?(\d+)/i, /up.*?13%.*?34.*?(\d+)/i],
    mm_down13_in34days: [/down.*?13%.*?34.*?(\d+)/i, /13%.*?down.*?34.*?(\d+)/i],
    us_common_stocks: [/common.*?stocks.*?(\d+)/i, /stocks.*?(\d+)/i],
    sp500: [/s&p.*?500.*?([\d,]+\.?\d*)/i, /sp.*?500.*?([\d,]+\.?\d*)/i]
  };

  // Try main patterns first
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match && match[1]) {
      data[key] = parseFloat(match[1].replace(/,/g, ''));
    }
  }

  // Try alternative patterns for missing data
  for (const [key, patterns] of Object.entries(alternativePatterns)) {
    if (!data[key]) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          data[key] = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }
    }
  }

  return data;
}

/**
 * Process image with OCR and extract market data
 * @param {string} imagePath - Path to the uploaded image
 * @returns {Promise<Object>} - OCR result with extracted data
 */
async function performOCR(imagePath) {
  try {
    console.log(`🔄 Processing screenshot: ${imagePath}`);
    
    // Use the OCR service to process the screenshot
    const result = await ocrService.processScreenshot(imagePath);
    
    if (!result.success) {
      throw new Error(`OCR processing failed: ${result.error}`);
    }
    
    console.log(`✅ OCR completed. Extracted ${result.metadata.extractedFields} fields with ${result.metadata.confidence}% confidence`);
    
    return result;
  } catch (error) {
    console.error('❌ OCR processing error:', error);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

/**
 * Alternative implementation using OpenAI Vision API (commented out)
 */
async function performOpenAIVision(imagePath) {
  // Uncomment and configure if you have OpenAI API access
  /*
  try {
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the following market data values from this trading dashboard screenshot: mm_4%_bullish, mm_4%_bearish, mm_25%up_quarter, mm_25%down_quarter, mm_25%up_month, mm_25%down_month, mm_50%up_month, mm_50%down_month, mm_#up13%in34days, mm_#down13%in34days, US Common Stocks, SP-500. Return only the numbers in JSON format.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    throw new Error('OpenAI Vision API processing failed');
  }
  */
  return null;
}

// POST /api/screenshot-extract - Extract market data from screenshot
router.post('/', upload.single('screenshot'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No screenshot uploaded');
  }

  const imagePath = req.file.path;
  const fileType = req.body.fileType || 'market_monitor'; // Default to market_monitor
  
  try {
    // Perform OCR on the uploaded image
    const ocrResult = await performOCR(imagePath);
    
    if (!ocrResult.success || !ocrResult.data) {
      throw new Error('Failed to extract data from image');
    }

    const { data: marketData, metadata } = ocrResult;
    
    if (Object.keys(marketData).length === 0) {
      throw new ValidationError('No market data found in screenshot. Please ensure the image contains clear, readable market data.');
    }

    // Clean up uploaded file
    try {
      await fs.unlink(imagePath);
    } catch (error) {
      console.warn('Failed to delete uploaded file:', error);
    }

    // Send response with both data and metadata
    sendSuccess(res, {
      data: marketData,
      metadata: {
        confidence: metadata.confidence,
        extractedFields: metadata.extractedFields,
        totalFields: metadata.totalFields,
        processingTime: metadata.processingTime,
        fileType: fileType
      }
    }, `Market data extracted successfully from ${fileType} screenshot! Found ${metadata.extractedFields} fields with ${Math.round(metadata.confidence)}% confidence.`);
    
  } catch (error) {
    // Clean up uploaded file on error
    try {
      await fs.unlink(imagePath);
    } catch (cleanupError) {
      console.warn('Failed to delete uploaded file after error:', cleanupError);
    }
    
    throw error;
  }
}));

// GET /api/screenshot-extract/test - Test endpoint for development
router.get('/test', asyncHandler(async (req, res) => {
  const mockData = {
    mm_4_bullish: 70,
    mm_4_bearish: 26,
    mm_25_up_quarter: 1849,
    mm_25_down_quarter: 690,
    mm_25_up_month: 134,
    mm_25_down_month: 85,
    mm_50_up_month: 40,
    mm_50_down_month: 21,
    mm_up13_in34days: 1808,
    mm_down13_in34days: 1062,
    us_common_stocks: 6173,
    sp500: 6009.50
  };
  
  sendSuccess(res, mockData, 'Test data returned successfully');
}));

export default router;