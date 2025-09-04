import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs/promises';

/**
 * OCR Service for extracting text from trading dashboard screenshots
 * Uses Tesseract.js for OCR and Sharp for image preprocessing
 */

class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Tesseract worker with optimized configuration for trading data
   */
  async initializeWorker() {
    if (this.isInitialized) return;

    try {
      this.worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          // Optional: Log OCR progress
          if (process.env.NODE_ENV === 'development') {
            console.log(`OCR Progress: ${m.status} - ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      // Configure OCR for better number and text recognition
      await this.worker.setParameters({
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_char_whitelist: '0123456789.,%-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ',
        preserve_interword_spaces: '1'
      });

      this.isInitialized = true;
      console.log('✅ OCR Worker initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OCR worker:', error);
      throw new Error('OCR initialization failed');
    }
  }

  /**
   * Preprocess image for better OCR results
   * @param {string} imagePath - Path to the input image
   * @returns {Promise<Buffer>} - Processed image buffer
   */
  async preprocessImage(imagePath) {
    try {
      const processedImage = await sharp(imagePath)
        // Resize to optimal size for OCR (if too large)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true
        })
        // Enhance contrast and sharpness
        .normalize()
        .sharpen()
        // Convert to grayscale for better text recognition
        .grayscale()
        // Enhance contrast
        .linear(1.2, -(128 * 1.2) + 128)
        // Output as PNG for best quality
        .png()
        .toBuffer();

      return processedImage;
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      // Fall back to original image
      return await fs.readFile(imagePath);
    }
  }

  /**
   * Extract text from image using OCR
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<string>} - Extracted text
   */
  async extractTextFromImage(imagePath) {
    try {
      // Initialize worker if not already done
      await this.initializeWorker();

      // Preprocess image for better OCR results
      const processedImageBuffer = await this.preprocessImage(imagePath);

      // Perform OCR
      const result = await this.worker.recognize(processedImageBuffer);
      
      console.log(`OCR Confidence: ${result.data.confidence}%`);
      
      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words: result.data.words
      };
    } catch (error) {
      console.error('OCR text extraction failed:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Extract market data from OCR text using improved pattern matching
   * @param {string} text - OCR extracted text
   * @param {number} confidence - OCR confidence level
   * @returns {Object} - Extracted market data
   */
  extractMarketDataFromText(text, confidence = 0) {
    const data = {};
    const minConfidence = 60; // Minimum confidence threshold
    
    if (confidence < minConfidence) {
      console.warn(`Low OCR confidence: ${confidence}%. Results may be inaccurate.`);
    }

    // Enhanced patterns with multiple variations to handle OCR inaccuracies
    const patterns = {
      // 4% patterns
      mm_4_bullish: [
        /mm[_\s]*4%[_\s]*bullish[:\s]*(\d+)/i,
        /4%[_\s]*bullish[:\s]*(\d+)/i,
        /bullish[_\s]*4%[:\s]*(\d+)/i,
        /mm[_\s]*4[%\s]*up[:\s]*(\d+)/i
      ],
      mm_4_bearish: [
        /mm[_\s]*4%[_\s]*bearish[:\s]*(\d+)/i,
        /4%[_\s]*bearish[:\s]*(\d+)/i,
        /bearish[_\s]*4%[:\s]*(\d+)/i,
        /mm[_\s]*4[%\s]*down[:\s]*(\d+)/i
      ],
      
      // 25% patterns - including "in a quarter" variants
      mm_25_up_quarter: [
        /mm[_\s]*25%[_\s]*up[_\s]*quarter[:\s]*(\d+)/i,
        /25%[_\s]*up[_\s]*quarter[:\s]*(\d+)/i,
        /quarter[_\s]*25%[_\s]*up[:\s]*(\d+)/i,
        /25%[_\s]*quarter[_\s]*up[:\s]*(\d+)/i,
        /25%[_\s]*up[_\s]*in[_\s]*a?[_\s]*quarter[:\s]*(\d+)/i,
        /25%[_\s]*upinaquarter[:\s]*(\d+)/i
      ],
      mm_25_down_quarter: [
        /mm[_\s]*25%[_\s]*down[_\s]*quarter[:\s]*(\d+)/i,
        /25%[_\s]*down[_\s]*quarter[:\s]*(\d+)/i,
        /quarter[_\s]*25%[_\s]*down[:\s]*(\d+)/i,
        /25%[_\s]*down[_\s]*in[_\s]*a?[_\s]*quarter[:\s]*(\d+)/i,
        /25%[_\s]*downinaquarter[:\s]*(\d+)/i
      ],
      
      // Monthly patterns
      mm_25_up_month: [
        /mm[_\s]*25%[_\s]*up[_\s]*month[:\s]*(\d+)/i,
        /25%[_\s]*up[_\s]*month[:\s]*(\d+)/i,
        /month[_\s]*25%[_\s]*up[:\s]*(\d+)/i
      ],
      mm_25_down_month: [
        /mm[_\s]*25%[_\s]*down[_\s]*month[:\s]*(\d+)/i,
        /25%[_\s]*down[_\s]*month[:\s]*(\d+)/i
      ],
      
      // 50% monthly patterns
      mm_50_up_month: [
        /mm[_\s]*50%[_\s]*up[_\s]*month[:\s]*(\d+)/i,
        /50%[_\s]*up[_\s]*month[:\s]*(\d+)/i
      ],
      mm_50_down_month: [
        /mm[_\s]*50%[_\s]*down[_\s]*month[:\s]*(\d+)/i,
        /50%[_\s]*down[_\s]*month[:\s]*(\d+)/i
      ],
      
      // 34 days patterns
      mm_up13_in34days: [
        /mm[_\s]*#?[_\s]*up[_\s]*13%[_\s]*in[_\s]*34[_\s]*days[:\s]*(\d+)/i,
        /up[_\s]*13%[_\s]*34[_\s]*days[:\s]*(\d+)/i,
        /13%[_\s]*up[_\s]*34[_\s]*days[:\s]*(\d+)/i
      ],
      mm_down13_in34days: [
        /mm[_\s]*#?[_\s]*down[_\s]*13%[_\s]*in[_\s]*34[_\s]*days[:\s]*(\d+)/i,
        /down[_\s]*13%[_\s]*34[_\s]*days[:\s]*(\d+)/i,
        /13%[_\s]*down[_\s]*34[_\s]*days[:\s]*(\d+)/i
      ],
      
      // Stock universe patterns
      us_common_stocks: [
        /US[_\s]*Common[_\s]*Stocks[:\s]*([\d,]+)/i,
        /Common[_\s]*Stocks[:\s]*([\d,]+)/i,
        /US[_\s]*Stocks[:\s]*([\d,]+)/i
      ],
      
      // S&P 500 patterns
      sp500: [
        /SP[_\s]*-?[_\s]*500[:\s]*([\d,]+\.?\d*)/i,
        /S&P[_\s]*500[:\s]*([\d,]+\.?\d*)/i,
        /S&P[_\s]*-?[_\s]*500[:\s]*([\d,]+\.?\d*)/i
      ],
      
      // T2108 patterns
      t2108: [
        /T[_\s]*2108[:\s]*([\d,]+\.?\d*)/i,
        /T-2108[:\s]*([\d,]+\.?\d*)/i,
        /T2108[:\s]*([\d,]+\.?\d*)/i
      ],
      
      // Sector patterns
      basic_materials_sector: [
        /Basic[_\s]*Material[_\s]*Sector[:\s]*(\d+)/i,
        /Basic[_\s]*Materials[:\s]*(\d+)/i,
        /Materials[_\s]*Sector[:\s]*(\d+)/i
      ],
      consumer_cyclical_sector: [
        /Consumer[_\s]*Cyclical[_\s]*Sector[:\s]*(\d+)/i,
        /Cyclical[_\s]*Sector[:\s]*(\d+)/i,
        /Consumer[_\s]*Cyclical[:\s]*(\d+)/i
      ],
      financial_services_sector: [
        /Financial[_\s]*Services[_\s]*Sector[:\s]*(\d+)/i,
        /Financial[_\s]*Sector[:\s]*(\d+)/i,
        /Financials[_\s]*Sector[:\s]*(\d+)/i
      ],
      real_estate_sector: [
        /Real[_\s]*Estate[_\s]*Sector[:\s]*(\d+)/i,
        /Real[_\s]*Estate[:\s]*(\d+)/i,
        /Estate[_\s]*Sector[:\s]*(\d+)/i
      ],
      consumer_defensive_sector: [
        /Consumer[_\s]*Defensive[_\s]*Sector[:\s]*(\d+)/i,
        /Defensive[_\s]*Sector[:\s]*(\d+)/i,
        /Consumer[_\s]*Defensive[:\s]*(\d+)/i
      ],
      healthcare_sector: [
        /Healthcare[_\s]*Sector[:\s]*(\d+)/i,
        /Health[_\s]*Care[_\s]*Sector[:\s]*(\d+)/i,
        /Healthcare[:\s]*(\d+)/i
      ],
      utilities_sector: [
        /Utilities[_\s]*Sector[:\s]*(\d+)/i,
        /Utility[_\s]*Sector[:\s]*(\d+)/i,
        /Utilities[:\s]*(\d+)/i
      ],
      communication_services_sector: [
        /Communication[_\s]*Services[_\s]*Sector[:\s]*(\d+)/i,
        /Communications[_\s]*Sector[:\s]*(\d+)/i,
        /Communication[_\s]*Sector[:\s]*(\d+)/i
      ],
      energy_sector: [
        /Energy[_\s]*Sector[:\s]*(\d+)/i,
        /Energy[:\s]*(\d+)/i
      ],
      industrials_sector: [
        /Industrials[_\s]*Sector[:\s]*(\d+)/i,
        /Industrial[_\s]*Sector[:\s]*(\d+)/i,
        /Industrials[:\s]*(\d+)/i
      ],
      technology_sector: [
        /Technology[_\s]*Sector[:\s]*(\d+)/i,
        /Tech[_\s]*Sector[:\s]*(\d+)/i,
        /Technology[:\s]*(\d+)/i
      ]
    };

    // Extract data using all patterns
    for (const [key, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const value = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(value) && value >= 0) {
            data[key] = value;
            console.log(`✅ Extracted ${key}: ${value}`);
            break; // Move to next field once found
          }
        }
      }
    }

    // Log extraction results
    const extractedFields = Object.keys(data).length;
    console.log(`📊 Extracted ${extractedFields} market data fields from OCR`);
    
    return {
      data,
      confidence,
      extractedFields,
      totalFields: Object.keys(patterns).length
    };
  }

  /**
   * Process screenshot and extract market data
   * @param {string} imagePath - Path to the screenshot
   * @returns {Promise<Object>} - Extracted market data with metadata
   */
  async processScreenshot(imagePath) {
    try {
      console.log('🔄 Starting OCR processing...');
      const startTime = Date.now();

      // Extract text using OCR
      const ocrResult = await this.extractTextFromImage(imagePath);
      
      // Extract market data from text
      const marketData = this.extractMarketDataFromText(ocrResult.text, ocrResult.confidence);
      
      const processingTime = Date.now() - startTime;
      console.log(`⏱️ OCR processing completed in ${processingTime}ms`);

      return {
        success: true,
        data: marketData.data,
        metadata: {
          confidence: ocrResult.confidence,
          extractedFields: marketData.extractedFields,
          totalFields: marketData.totalFields,
          processingTime,
          extractedText: process.env.NODE_ENV === 'development' ? ocrResult.text : undefined
        }
      };
    } catch (error) {
      console.error('❌ OCR processing failed:', error);
      return {
        success: false,
        error: error.message,
        data: {}
      };
    }
  }

  /**
   * Cleanup worker resources
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('🛑 OCR Worker terminated');
    }
  }
}

// Create singleton instance
const ocrService = new OCRService();

export default ocrService;