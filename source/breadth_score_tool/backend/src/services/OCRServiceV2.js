/**
 * Enhanced OCR Service
 * Refactored with better pattern organization, error handling, and performance
 */

import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs/promises';
import { getPatternsByType, PatternValidator, CONFIDENCE_SCORING } from '../config/ocrPatterns.js';
import { OCR_CONFIG, SCREENSHOT_TYPES } from '../config/constants.js';
import { OCRError } from '../middleware/errorHandlerV2.js';

/**
 * Enhanced OCR Service with better architecture
 */
export class OCRServiceV2 {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.processingQueue = new Map();
  }

  /**
   * Initialize Tesseract worker with optimized configuration
   */
  async initializeWorker() {
    if (this.isInitialized) return;

    try {
      this.worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`OCR Progress: ${m.status} - ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      // Configure OCR for optimal number and text recognition
      await this.worker.setParameters({
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_char_whitelist: '0123456789.,%-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ',
        preserve_interword_spaces: '1',
        // Improve number recognition
        classify_enable_learning: '0',
        classify_enable_adaptive_matcher: '0'
      });

      this.isInitialized = true;
      console.log('✅ Enhanced OCR Worker initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OCR worker:', error);
      throw new OCRError('OCR initialization failed', { originalError: error.message });
    }
  }

  /**
   * Enhanced image preprocessing with multiple optimization steps
   */
  async preprocessImage(imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      console.log(`📷 Processing image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

      // Multi-step preprocessing for optimal OCR
      const processedImage = await sharp(imageBuffer)
        // Resize if too large
        .resize(
          OCR_CONFIG.IMAGE_PREPROCESSING.MAX_WIDTH,
          OCR_CONFIG.IMAGE_PREPROCESSING.MAX_HEIGHT,
          {
            fit: 'inside',
            withoutEnlargement: true
          }
        )
        // Convert to grayscale for better text recognition
        .grayscale()
        // Enhance contrast
        .normalize()
        // Sharpen for better edge definition
        .sharpen()
        // Apply threshold for better text/background separation
        .threshold(128)
        // Final sharpening
        .sharpen()
        // Convert to PNG for best quality
        .png({ quality: OCR_CONFIG.IMAGE_PREPROCESSING.QUALITY })
        .toBuffer();

      console.log('🔧 Image preprocessing completed');
      return processedImage;
    } catch (error) {
      console.error('❌ Image preprocessing failed:', error);
      // Fall back to original image
      return await fs.readFile(imagePath);
    }
  }

  /**
   * Extract text from image with retry logic
   */
  async extractTextFromImage(imagePath, retryCount = 0) {
    try {
      await this.initializeWorker();

      const processedImageBuffer = await this.preprocessImage(imagePath);
      
      console.log('🔄 Starting OCR text extraction...');
      const result = await this.worker.recognize(processedImageBuffer);
      
      console.log(`📊 OCR Confidence: ${result.data.confidence}%`);
      
      // Retry with different preprocessing if confidence is too low
      if (result.data.confidence < OCR_CONFIG.MIN_CONFIDENCE && retryCount < OCR_CONFIG.MAX_RETRY_ATTEMPTS) {
        console.log(`⚠️ Low confidence (${result.data.confidence}%), retrying with enhanced preprocessing...`);
        return await this.extractTextWithAlternativePreprocessing(imagePath, retryCount + 1);
      }

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words: result.data.words,
        lines: result.data.lines
      };
    } catch (error) {
      console.error('❌ OCR text extraction failed:', error);
      
      // Retry if not at max attempts
      if (retryCount < OCR_CONFIG.MAX_RETRY_ATTEMPTS) {
        console.log(`🔄 Retrying OCR (attempt ${retryCount + 1}/${OCR_CONFIG.MAX_RETRY_ATTEMPTS})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return await this.extractTextFromImage(imagePath, retryCount + 1);
      }
      
      throw new OCRError('OCR processing failed after retries', { 
        attempts: retryCount + 1,
        originalError: error.message 
      });
    }
  }

  /**
   * Alternative preprocessing for difficult images
   */
  async extractTextWithAlternativePreprocessing(imagePath, retryCount) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      
      // More aggressive preprocessing
      const processedImage = await sharp(imageBuffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .grayscale()
        // More aggressive contrast enhancement
        .linear(1.5, -(128 * 1.5) + 128)
        // Gaussian blur to reduce noise
        .blur(0.5)
        // Strong sharpening
        .sharpen(2, 1, 2)
        .png({ quality: 95 })
        .toBuffer();

      const result = await this.worker.recognize(processedImage);
      
      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words: result.data.words,
        lines: result.data.lines
      };
    } catch (error) {
      throw new OCRError('Alternative preprocessing failed', { 
        retryCount,
        originalError: error.message 
      });
    }
  }

  /**
   * Enhanced market data extraction with pattern validation
   */
  extractMarketDataFromText(text, confidence = 0, screenshotType = SCREENSHOT_TYPES.MARKET_MONITOR) {
    const startTime = Date.now();
    const extractedData = {};
    const extractionLog = [];
    
    if (confidence < OCR_CONFIG.MIN_CONFIDENCE) {
      console.warn(`⚠️ Low OCR confidence: ${confidence}%. Results may be inaccurate.`);
    }

    // Get patterns for the specified screenshot type
    const patterns = getPatternsByType(screenshotType);
    
    console.log(`🔍 Extracting data for ${screenshotType} with ${Object.keys(patterns).length} pattern groups`);

    // Process each field pattern group
    Object.entries(patterns).forEach(([fieldName, patternArray]) => {
      const extractionResult = this._extractFieldValue(
        fieldName, 
        patternArray, 
        text, 
        screenshotType
      );
      
      if (extractionResult.success) {
        extractedData[fieldName] = extractionResult.value;
        extractionLog.push({
          field: fieldName,
          value: extractionResult.value,
          confidence: extractionResult.confidence,
          pattern: extractionResult.pattern
        });
        console.log(`✅ Extracted ${fieldName}: ${extractionResult.value} (confidence: ${extractionResult.confidence})`);
      }
    });

    const processingTime = Date.now() - startTime;
    const extractedFields = Object.keys(extractedData).length;
    const totalFields = Object.keys(patterns).length;

    console.log(`📊 Extraction completed: ${extractedFields}/${totalFields} fields in ${processingTime}ms`);

    return {
      data: extractedData,
      metadata: {
        confidence,
        extractedFields,
        totalFields,
        processingTime,
        screenshotType,
        extractionLog: process.env.NODE_ENV === 'development' ? extractionLog : undefined
      }
    };
  }

  /**
   * Extract value for a specific field using pattern matching
   * @private
   */
  _extractFieldValue(fieldName, patterns, text, screenshotType) {
    // Try each pattern in order of specificity
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = text.match(pattern);
      
      if (match && match[1]) {
        const rawValue = PatternValidator.cleanValue(match[1]);
        const numericValue = parseFloat(rawValue);
        
        // Validate the extracted value
        if (PatternValidator.validateValue(fieldName, numericValue)) {
          // Calculate confidence based on pattern specificity
          const confidence = this._calculatePatternConfidence(i, patterns.length, match[0]);
          
          return {
            success: true,
            value: numericValue,
            confidence: confidence,
            pattern: pattern.source,
            matchedText: match[0]
          };
        } else {
          console.warn(`⚠️ Invalid value for ${fieldName}: ${numericValue}`);
        }
      }
    }
    
    return { success: false };
  }

  /**
   * Calculate confidence score based on pattern specificity and match quality
   * @private
   */
  _calculatePatternConfidence(patternIndex, totalPatterns, matchedText) {
    // Higher confidence for earlier (more specific) patterns
    const patternSpecificity = (totalPatterns - patternIndex) / totalPatterns;
    
    // Boost confidence for longer matches (more context)
    const lengthBonus = Math.min(matchedText.length / 20, 0.2);
    
    // Boost confidence for exact number matches
    const numberBonus = /^\d+$/.test(matchedText.match(/\d+/)?.[0] || '') ? 0.1 : 0;
    
    return Math.min(
      CONFIDENCE_SCORING.EXACT_MATCH,
      patternSpecificity + lengthBonus + numberBonus
    );
  }

  /**
   * Process screenshot with enhanced error handling and logging
   */
  async processScreenshot(imagePath, screenshotType = SCREENSHOT_TYPES.MARKET_MONITOR) {
    const processingId = Math.random().toString(36).substring(2, 15);
    
    try {
      console.log(`🚀 Starting OCR processing (ID: ${processingId})`);
      const startTime = Date.now();

      // Add to processing queue for monitoring
      this.processingQueue.set(processingId, {
        startTime,
        imagePath,
        screenshotType,
        status: 'processing'
      });

      // Extract text using OCR
      const ocrResult = await this.extractTextFromImage(imagePath);
      
      // Extract market data from text
      const marketData = this.extractMarketDataFromText(
        ocrResult.text, 
        ocrResult.confidence, 
        screenshotType
      );
      
      const totalProcessingTime = Date.now() - startTime;
      
      // Update queue status
      this.processingQueue.set(processingId, {
        ...this.processingQueue.get(processingId),
        status: 'completed',
        processingTime: totalProcessingTime
      });

      console.log(`⏱️ Total OCR processing completed in ${totalProcessingTime}ms (ID: ${processingId})`);

      const result = {
        success: true,
        data: marketData.data,
        metadata: {
          ...marketData.metadata,
          ocrConfidence: ocrResult.confidence,
          totalProcessingTime,
          processingId,
          extractedText: process.env.NODE_ENV === 'development' ? ocrResult.text : undefined
        }
      };

      // Clean up processing queue entry after delay
      setTimeout(() => this.processingQueue.delete(processingId), 60000);

      return result;
    } catch (error) {
      console.error(`❌ OCR processing failed (ID: ${processingId}):`, error);
      
      // Update queue status
      if (this.processingQueue.has(processingId)) {
        this.processingQueue.set(processingId, {
          ...this.processingQueue.get(processingId),
          status: 'failed',
          error: error.message
        });
      }

      return {
        success: false,
        error: error.message,
        metadata: {
          processingId,
          screenshotType
        }
      };
    }
  }

  /**
   * Get processing queue status (for monitoring)
   */
  getProcessingStatus() {
    return Array.from(this.processingQueue.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }

  /**
   * Cleanup worker resources
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.processingQueue.clear();
      console.log('🛑 Enhanced OCR Worker terminated');
    }
  }
}

// Create and export singleton instance
const ocrServiceV2 = new OCRServiceV2();
export default ocrServiceV2;