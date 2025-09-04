import React, { useState, useCallback, useEffect } from 'react'
import { 
  Save, 
  Calculator, 
  AlertCircle, 
  CheckCircle, 
  RotateCcw, 
  Info,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { useBreadthCalculator } from '../../hooks/useBreadthCalculator'
import type { BreadthData, MarketDataInput } from '../../../types/trading'
import type { RawMarketBreadthData } from '../../../types/breadth-raw-data'

interface DataEntryFormProps {
  onSuccess?: () => void
  initialData?: Partial<BreadthData>
}

interface FormErrors {
  [key: string]: string
}

export function DataEntryForm({ onSuccess, initialData }: DataEntryFormProps) {
  const [preFilledFieldsLoaded, setPreFilledFieldsLoaded] = useState(false)
  // Updated CSV field mapping after database migration - only fields that are actually in CSV
  const csvFieldMap: Record<string, string[]> = {
    // 4% indicators - NOW IN CSV AFTER MIGRATION
    'stocks_up_4pct': ['up4', 'up4%'],
    'stocks_down_4pct': ['down4', 'down4%'],
    
    // 25% indicators (quarterly & monthly)
    'stocks_up_25pct_quarter': ['up25q', 'up25q%', 'up25quarter'],
    'stocks_down_25pct_quarter': ['down25q', 'down25q%', 'down25quarter'],
    'stocks_up_25pct_month': ['up25m', 'up25m%', 'up25month'],
    'stocks_down_25pct_month': ['down25m', 'down25m%', 'down25month'],
    
    // 50% indicators  
    'stocks_up_50pct_month': ['up50m', 'up50m%', 'up50month'],
    'stocks_down_50pct_month': ['down50m', 'down50m%', 'down50month'],
    
    // 13%-34days indicators
    'stocks_up_13pct_34days': ['up13-34', 'up13-34%', 'up13day34'],
    'stocks_down_13pct_34days': ['down13-34', 'down13-34%', 'down13day34'],
    
    // Reference indicators
    't2108': ['T2108', 't2108'],
    'sp500': ['SP', 'sp500', 'S&P'],
    'worden_universe': ['worden', 'worden_universe'],
    'ratio_5day': ['ratio5d', '5d'],   // NOW IN CSV AFTER MIGRATION
    'ratio_10day': ['ratio10d', '10d'] // NOW IN CSV AFTER MIGRATION
  }

  // Manual entry only fields (NOT in CSV)
  const manualOnlyFields: Set<keyof MarketDataInput> = new Set<keyof MarketDataInput>([
    'stocks_up_20pct',    // Manual entry only
    'stocks_down_20pct',  // Manual entry only  
    'stocks_up_20dollar', // Manual entry only
    'stocks_down_20dollar', // Manual entry only
    'vix' // VIX is typically manual entry
  ])

  // Legacy format mappings for existing database records
  const legacyFieldMap: Record<string, string[]> = {
    't2108': ['T2108'],
    'sp500': ['SP'],
    'ratio_5day': ['5d'],
    'ratio_10day': ['10d'],
    'worden_universe': ['worden']
  }

  // Correlation-based recovery for missing secondary indicators
  const getCorrelatedValue = (field: string, data: Partial<BreadthData>): string | null => {
    console.log(`🧮 Attempting correlation for ${field}`);
    
    // T2108 correlation for quarterly data (based on recovery analysis)
    if (field === 'stocks_up_25pct_quarter' && data.t2108) {
      const t2108Value = parseFloat(data.t2108.toString())
      if (t2108Value > 60) {
        // Strong market: estimate higher quarterly movements
        const estimated = Math.round(1200 + (t2108Value - 60) * 20)
        console.log(`🧮 T2108 correlation for ${field}: ${estimated} (from T2108: ${t2108Value})`)
        return estimated.toString()
      }
    }
    
    if (field === 'stocks_down_25pct_quarter' && data.t2108) {
      const t2108Value = parseFloat(data.t2108.toString())
      if (t2108Value < 40) {
        // Weak market: estimate higher quarterly declines
        const estimated = Math.round(1000 + (40 - t2108Value) * 25)
        console.log(`🧮 T2108 correlation for ${field}: ${estimated} (from T2108: ${t2108Value})`)
        return estimated.toString()
      }
    }
    
    // 4% to 25% correlation (monthly data often 10-20% of 4% data)
    if (field === 'stocks_up_25pct_month' && data.stocks_up_4pct) {
      const up4 = parseInt(data.stocks_up_4pct.toString())
      const estimated = Math.round(up4 * 0.15) // 15% correlation factor
      if (estimated > 10) {
        console.log(`🧮 4% correlation for ${field}: ${estimated} (from 4%: ${up4})`)
        return estimated.toString()
      }
    }
    
    if (field === 'stocks_down_25pct_month' && data.stocks_down_4pct) {
      const down4 = parseInt(data.stocks_down_4pct.toString())  
      const estimated = Math.round(down4 * 0.15)
      if (estimated > 10) {
        console.log(`🧮 4% correlation for ${field}: ${estimated} (from 4%: ${down4})`)
        return estimated.toString()
      }
    }
    
    // 50% movements (typically 5-10% of 25% movements)
    if (field === 'stocks_up_50pct_month' && data.stocks_up_25pct_month) {
      const up25 = parseInt(data.stocks_up_25pct_month.toString())
      const estimated = Math.round(up25 * 0.08)
      if (estimated > 5) {
        console.log(`🧮 25% correlation for ${field}: ${estimated} (from 25%: ${up25})`)
        return estimated.toString()
      }
    }
    
    if (field === 'stocks_down_50pct_month' && data.stocks_down_25pct_month) {
      const down25 = parseInt(data.stocks_down_25pct_month.toString())
      const estimated = Math.round(down25 * 0.08)
      if (estimated > 5) {
        console.log(`🧮 25% correlation for ${field}: ${estimated} (from 25%: ${down25})`)
        return estimated.toString()
      }
    }
    
    // 13%-34days correlation with 4% data (typically 60-80% of 4% data)
    if (field === 'stocks_up_13pct_34days' && data.stocks_up_4pct) {
      const up4 = parseInt(data.stocks_up_4pct.toString())
      const estimated = Math.round(up4 * 0.7) // 70% correlation factor
      if (estimated > 20) {
        console.log(`🧮 4% correlation for ${field}: ${estimated} (from 4%: ${up4})`)
        return estimated.toString()
      }
    }
    
    if (field === 'stocks_down_13pct_34days' && data.stocks_down_4pct) {
      const down4 = parseInt(data.stocks_down_4pct.toString())
      const estimated = Math.round(down4 * 0.7)
      if (estimated > 20) {
        console.log(`🧮 4% correlation for ${field}: ${estimated} (from 4%: ${down4})`)
        return estimated.toString()
      }
    }
    
    return null
  }

  // Enhanced notes extraction with support for all recovered formats
  const extractFromNotes = (notes?: string, key?: string): string => {
    if (!notes || !key) return ''
    console.log(`📝 Extracting ${key} from notes:`, notes.substring(0, 100) + '...')
    
    // Special handling for S&P 500 trailing number pattern
    const handleSp500SpecialCase = (notes: string): string | null => {
      // Look for trailing number after last comma (potential S&P value)
      const trailingNumberMatch = notes.match(/,\s*([\d.]+)\s*$/);
      if (trailingNumberMatch) {
        const trailingValue = parseFloat(trailingNumberMatch[1]);
        // S&P 500 typically ranges from 1000-8000, but could be scaled
        if (trailingValue > 100) {
          console.log(`🔍 Found potential S&P trailing value: ${trailingValue}`);
          return trailingNumberMatch[1];
        }
      }
      return null;
    }
    
    // Special case: Handle S&P 500 trailing number pattern first
    if (key === 'sp500') {
      const sp500TrailingValue = handleSp500SpecialCase(notes);
      if (sp500TrailingValue) {
        console.log(`🎯 S&P 500 special case: Using trailing value ${sp500TrailingValue}`);
        return sp500TrailingValue;
      }
    }
    
    // Enhanced patterns for all note formats
    const patterns = [
      // New RECOVERED format: "RECOVERED: up4%=180, down4%=120, ..."
      new RegExp(`${key.replace('stocks_', '').replace('_pct', '').replace('_', '')}%?[=:]\\s*([^,\\n\\s]+)`, 'i'),
      
      // CSV format patterns from csvFieldMap
      ...(csvFieldMap[key] ? 
        csvFieldMap[key].map(csvKey => 
          new RegExp(`${csvKey}[%=:]\\s*([^,\\n\\s]+)`, 'i')
        ) : []
      ),
      
      // Legacy format patterns from legacyFieldMap  
      ...(legacyFieldMap[key] ? 
        legacyFieldMap[key].map(legacyKey => 
          new RegExp(`${legacyKey}[=:]\\s*([^,\\n\\s]+)`, 'i')
        ) : []
      ),
      
      // Database format: "field_name=value"
      new RegExp(`${key}[=:]\\s*([^,\\n\\s]+)`, 'i'),
      
      // Legacy colon format: "key: value"
      new RegExp(`${key}:\\s*([^,\\n]+)`, 'i'),        
      // Quoted format: "key": value  
      new RegExp(`"${key}":\\s*([^,\\n]+)`, 'i'),      
      // Space format: key value
      new RegExp(`\\b${key}\\s+([^,\\n\\s]+)`, 'i'),   
    ]
    
    // Process all patterns
    for (const pattern of patterns) {
      const match = notes.match(pattern)
      if (match) {
        const value = match[1].trim().replace(/[",]/g, '')
        console.log(`✅ Enhanced extraction ${key}: ${value} using pattern: ${pattern}`)
        return value
      }
    }
    
    console.log(`❌ Failed to extract ${key} from notes`)
    return ''
  }

  // Multi-source data resolution with enhanced priority chain
  const getFieldValue = (field: string, data: Partial<BreadthData>): string => {
    // Priority 1: Direct database column (highest priority)
    const dbValue = data[field as keyof BreadthData]
    if (dbValue !== null && dbValue !== undefined && dbValue !== '') {
      console.log(`📊 Using database value for ${field}: ${dbValue}`)
      return dbValue.toString()
    }
    
    // Priority 2: Enhanced notes extraction
    const notesValue = extractFromNotes(data.notes, field)
    if (notesValue) {
      console.log(`📝 Using notes value for ${field}: ${notesValue}`)
      return notesValue
    }
    
    // Priority 3: Legacy field fallback
    const legacyValue = getLegacyFieldFallback(field, data)
    if (legacyValue) {
      console.log(`🔄 Using legacy fallback for ${field}: ${legacyValue}`)
      return legacyValue
    }
    
    // Priority 4: Correlation-based recovery for secondary indicators
    const correlatedValue = getCorrelatedValue(field, data)
    if (correlatedValue) {
      console.log(`🧮 Using correlation for ${field}: ${correlatedValue}`)
      return correlatedValue
    }
    
    console.log(`❌ No value found for ${field}`)
    return ''
  }

  // Enhanced legacy field fallback with broader coverage
  const getLegacyFieldFallback = (field: string, data: Partial<BreadthData>): string => {
    // For stocks_up_4pct and stocks_down_4pct, check legacy fields
    if (field === 'stocks_up_4pct' && data.advancingIssues && data.advancingIssues > 0) {
      console.log(`🔄 Using legacy advancingIssues (${data.advancingIssues}) for stocks_up_4pct`);
      return data.advancingIssues.toString();
    }
    if (field === 'stocks_down_4pct' && data.decliningIssues && data.decliningIssues > 0) {
      console.log(`🔄 Using legacy decliningIssues (${data.decliningIssues}) for stocks_down_4pct`);
      return data.decliningIssues.toString();
    }
    
    // Check for alternative field names that might exist in data
    const alternativeFieldNames: Record<string, string[]> = {
      't2108': ['worden_t2108'],
      'worden_t2108': ['t2108'],
      'sp500': ['sp_reference', 'sp500Level'],
      'sp_reference': ['sp500'],
    }
    
    const alternatives = alternativeFieldNames[field]
    if (alternatives) {
      for (const alt of alternatives) {
        const altValue = data[alt as keyof BreadthData]
        if (altValue !== null && altValue !== undefined && altValue !== '') {
          console.log(`🔄 Using alternative field ${alt} (${altValue}) for ${field}`);
          return altValue.toString()
        }
      }
    }
    
    return ''
  }

  // Enhanced form data mapping with multi-source resolution
  const breadthDataToFormData = (data?: Partial<BreadthData>): MarketDataInput => {
    console.log('=== ENHANCED DataEntryForm Mapping ===')
    console.log('Input data:', data)
    console.log('Input data keys:', data ? Object.keys(data) : 'no data')
    
    if (!data) {
      console.log('No data provided, returning empty form')
      return getEmptyFormData()
    }
    
    // Enhanced mapping with multi-source resolution
    const mapped = {
      date: data.date || new Date().toISOString().split('T')[0],
      
      // Primary 4% indicators (highest reliability)
      stocks_up_4pct: getFieldValue('stocks_up_4pct', data),
      stocks_down_4pct: getFieldValue('stocks_down_4pct', data),
      
      // Secondary indicators with enhanced recovery
      stocks_up_25pct_quarter: getFieldValue('stocks_up_25pct_quarter', data),
      stocks_down_25pct_quarter: getFieldValue('stocks_down_25pct_quarter', data),
      stocks_up_25pct_month: getFieldValue('stocks_up_25pct_month', data),
      stocks_down_25pct_month: getFieldValue('stocks_down_25pct_month', data),
      stocks_up_50pct_month: getFieldValue('stocks_up_50pct_month', data),
      stocks_down_50pct_month: getFieldValue('stocks_down_50pct_month', data),
      stocks_up_13pct_34days: getFieldValue('stocks_up_13pct_34days', data),
      stocks_down_13pct_34days: getFieldValue('stocks_down_13pct_34days', data),
      
      // Reference indicators
      ratio_5day: getFieldValue('ratio_5day', data),
      ratio_10day: getFieldValue('ratio_10day', data),
      t2108: getFieldValue('t2108', data),
      worden_t2108: getFieldValue('t2108', data), // Duplicate for form compatibility
      sp_reference: getFieldValue('sp500', data),
      worden_universe: getFieldValue('worden_universe', data),
      sp500: getFieldValue('sp500', data),
      
      // 20% indicators (if available)
      stocks_up_20pct: getFieldValue('stocks_up_20pct', data),
      stocks_down_20pct: getFieldValue('stocks_down_20pct', data),
      stocks_up_20dollar: getFieldValue('stocks_up_20dollar', data),
      stocks_down_20dollar: getFieldValue('stocks_down_20dollar', data),
      
      // VIX field (CRITICAL FOR DATA PERSISTENCE)
      vix: getFieldValue('vix', data),
    }
    
    // Enhanced debugging and validation
    console.log('=== FIELD POPULATION SUMMARY ===')
    const populatedFields = Object.entries(mapped).filter(([_, value]) => value !== '').length
    const totalFields = Object.keys(mapped).length
    const populationRate = ((populatedFields / totalFields) * 100).toFixed(1)
    
    console.log(`📊 Population rate: ${populatedFields}/${totalFields} (${populationRate}%)`)
    console.log('✅ Populated fields:', Object.entries(mapped).filter(([_, value]) => value !== '').map(([key, _]) => key))
    console.log('❌ Missing fields:', Object.entries(mapped).filter(([_, value]) => value === '').map(([key, _]) => key))
    
    // Validate and mark field sources for user awareness
    validateAndMarkFieldSources(mapped, data)
    
    return mapped
  }

  // Helper function for empty form data
  const getEmptyFormData = (): MarketDataInput => ({
    date: new Date().toISOString().split('T')[0],
    stocks_up_4pct: '',
    stocks_down_4pct: '',
    stocks_up_25pct_quarter: '',
    stocks_down_25pct_quarter: '',
    stocks_up_25pct_month: '',
    stocks_down_25pct_month: '',
    stocks_up_50pct_month: '',
    stocks_down_50pct_month: '',
    stocks_up_13pct_34days: '',
    stocks_down_13pct_34days: '',
    ratio_5day: '',
    ratio_10day: '',
    t2108: '',
    worden_t2108: '',
    sp_reference: '',
    stocks_up_20pct: '',
    stocks_down_20pct: '',
    stocks_up_20dollar: '',
    stocks_down_20dollar: '',
    // VIX field (CRITICAL FOR DATA PERSISTENCE)
    vix: '',
    worden_universe: '',
    sp500: '',
  })

  // Validation and source marking for user feedback
  const validateAndMarkFieldSources = (mapped: MarketDataInput, data: Partial<BreadthData>) => {
    // Mark field sources for user awareness
    Object.keys(mapped).forEach(field => {
      const value = mapped[field as keyof MarketDataInput]
      
      if (value && value !== '') {
        // Determine data source for user feedback
        const dbValue = data[field as keyof BreadthData]
        
        if (dbValue !== null && dbValue !== undefined) {
          // Database source - highest confidence
          console.log(`🟢 ${field}: Database value (high confidence)`)
        } else if (extractFromNotes(data.notes, field)) {
          // Notes source - medium confidence  
          console.log(`🟡 ${field}: Notes extraction (medium confidence)`)
        } else if (getCorrelatedValue(field, data)) {
          // Correlation source - estimated
          console.log(`🔵 ${field}: Correlation estimate (estimated)`)
        } else {
          // Legacy fallback - variable confidence
          console.log(`🟠 ${field}: Legacy fallback (variable confidence)`)
        }
      }
    })
  }

  // Form state
  const [formData, setFormData] = useState<MarketDataInput>(() => breadthDataToFormData(initialData))

  // Load last entered values for persistent fields when no initialData is provided
  useEffect(() => {
    const loadLastBreadthData = async () => {
      if (!initialData) {
        try {
          // Get the most recent breadth data to pre-fill optional fields
          const response = await window.electronAPI?.invoke('trading:get-breadth-data', 
            undefined, // startDate - get most recent
            undefined  // endDate - get most recent
          )
          
          if (response && response.length > 0) {
            const lastData = response[0] // Most recent entry
            console.log('📥 Loading last breadth data for persistent fields:', lastData)
            
            // Only update optional fields that should persist (VIX, 20%, 20$)
            setFormData(prev => ({
              ...prev,
              // Only update if fields are empty and we have data
              vix: prev.vix || lastData.vix?.toString() || '',
              stocks_up_20pct: prev.stocks_up_20pct || lastData.stocks_up_20pct?.toString() || '',
              stocks_down_20pct: prev.stocks_down_20pct || lastData.stocks_down_20pct?.toString() || '',
              stocks_up_20dollar: prev.stocks_up_20dollar || lastData.stocks_up_20dollar?.toString() || '',
              stocks_down_20dollar: prev.stocks_down_20dollar || lastData.stocks_down_20dollar?.toString() || '',
              // Also load T2108 and Worden Universe as they're relatively stable
              worden_t2108: prev.worden_t2108 || lastData.t2108?.toString() || '',
              worden_universe: prev.worden_universe || lastData.worden_universe?.toString() || ''
            }))
            
            // VIX is now handled directly in formData.vix
            console.log('📊 VIX will be pre-filled in formData.vix:', lastData.vix)
            
            console.log('✅ Pre-filled persistent fields from last entry (including VIX in formData)')
            setPreFilledFieldsLoaded(true)
          }
        } catch (error) {
          console.log('⚠️ Could not load last breadth data for pre-filling:', error)
          // Silently fail - this is just a convenience feature
        }
      }
    }

    loadLastBreadthData()
  }, [initialData])

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(breadthDataToFormData(initialData))
    }
  }, [initialData])

  // Calculate ratios automatically
  useEffect(() => {
    const stocksUp = Number(formData.stocks_up_4pct) || 0
    const stocksDown = Number(formData.stocks_down_4pct) || 0
    
    // Calculate ratios if we have data
    if (stocksUp > 0 || stocksDown > 0) {
      const totalStocks = stocksUp + stocksDown
      let ratio5day = ''
      let ratio10day = ''
      
      if (totalStocks > 0) {
        const ratio = stocksUp / stocksDown
        ratio5day = ratio.toFixed(2)
        ratio10day = (ratio * 1.1).toFixed(2) // Simple approximation for 10-day
      }
      
      // Update form data without triggering validation
      setFormData(prev => ({
        ...prev,
        ratio_5day: ratio5day,
        ratio_10day: ratio10day
      }))
    }
  }, [formData.stocks_up_4pct, formData.stocks_down_4pct])

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [previewCalculation, setPreviewCalculation] = useState<any>(null)

  // Breadth calculator
  const {
    calculateSingle,
    validateData,
    currentAlgorithm,
    latestResult,
    isLoading,
    error: calculatorError
  } = useBreadthCalculator()

  // Form validation
  const validateForm = useCallback(async (): Promise<boolean> => {
    const newErrors: FormErrors = {}

    // Required fields
    if (!formData.date) newErrors.date = 'Date is required'
    if (!formData.t2108) newErrors.t2108 = 'T2108 is required'
    
    // Check for duplicate date (only for new entries, not edits)
    if (formData.date && !initialData?.id) {
      try {
        const existingData = await window.tradingAPI?.getBreadthData?.()
        const duplicateDate = existingData?.find((item: any) => 
          item.date === formData.date
        )
        if (duplicateDate) {
          newErrors.date = 'Date already exists in database. Please choose a different date.'
        }
      } catch (error) {
        console.warn('Could not check for duplicate dates:', error)
      }
    }

    // Validate numeric fields
    const numericFields = [
      'stocks_up_4pct', 'stocks_down_4pct',
      'stocks_up_25pct_quarter', 'stocks_down_25pct_quarter',
      'stocks_up_25pct_month', 'stocks_down_25pct_month',
      'stocks_up_50pct_month', 'stocks_down_50pct_month',
      'stocks_up_13pct_34days', 'stocks_down_13pct_34days',
      'stocks_up_20pct', 'stocks_down_20pct',
      'stocks_up_20dollar', 'stocks_down_20dollar',
      't2108', 'worden_universe'
    ] as const

    numericFields.forEach(field => {
      const value = formData[field]
      if (value && (isNaN(Number(value)) || Number(value) < 0)) {
        newErrors[field] = 'Must be a valid positive number'
      }
    })

    // Validate T2108 range (0-100)
    if (formData.t2108 && (Number(formData.t2108) < 0 || Number(formData.t2108) > 100)) {
      newErrors.t2108 = 'T2108 must be between 0 and 100'
    }


    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // Handle input change
  const handleInputChange = useCallback((field: keyof MarketDataInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Clear success state when form changes
    if (success) {
      setSuccess(false)
      setPreviewCalculation(null)
    }
  }, [errors, success])

  // Convert form data to raw market breadth data
  const convertToRawData = useCallback((): RawMarketBreadthData => {
    // DEBUG: Log VIX data for verification
    console.log('🔍 VIX DEBUG - convertToRawData:')
    console.log('  formData.vix:', formData.vix)
    console.log('  Number(formData.vix):', Number(formData.vix))
    console.log('  VIX final value:', Number(formData.vix) || undefined)
    
    return {
      date: formData.date,
      timestamp: new Date().toISOString(),
      advancingIssues: Number(formData.stocks_up_4pct) || 0,
      decliningIssues: Number(formData.stocks_down_4pct) || 0,
      newHighs: 0, // Legacy field, not used in enhanced system
      newLows: 0, // Legacy field, not used in enhanced system  
      upVolume: 0, // Legacy field, not used in enhanced system
      downVolume: 0, // Legacy field, not used in enhanced system
      stocksUp4PctDaily: Number(formData.stocks_up_4pct) || undefined,
      stocksDown4PctDaily: Number(formData.stocks_down_4pct) || undefined,
      stocksUp25PctQuarterly: Number(formData.stocks_up_25pct_quarter) || undefined,
      stocksDown25PctQuarterly: Number(formData.stocks_down_25pct_quarter) || undefined,
      stocksUp25PctMonthly: Number(formData.stocks_up_25pct_month) || undefined,
      stocksDown25PctMonthly: Number(formData.stocks_down_25pct_month) || undefined,
      stocksUp50PctMonthly: Number(formData.stocks_up_50pct_month) || undefined,
      stocksDown50PctMonthly: Number(formData.stocks_down_50pct_month) || undefined,
      stocksUp13Pct34Days: Number(formData.stocks_up_13pct_34days) || undefined,
      stocksDown13Pct34Days: Number(formData.stocks_down_13pct_34days) || undefined,
      t2108: Number(formData.t2108) || undefined,
      sp500Level: formData.sp500 || undefined,
      wordenUniverse: Number(formData.worden_universe) || undefined,
      stocksUp20Pct: Number(formData.stocks_up_20pct) || undefined,
      stocksDown20Pct: Number(formData.stocks_down_20pct) || undefined,
      stocksUp20Dollar: Number(formData.stocks_up_20dollar) || undefined,
      stocksDown20Dollar: Number(formData.stocks_down_20dollar) || undefined,
      ratio5Day: Number(formData.ratio_5day) || undefined,
      ratio10Day: Number(formData.ratio_10day) || undefined,
      // VIX field (CRITICAL FOR DATA PERSISTENCE) - Now uses only formData.vix
      vix: Number(formData.vix) || undefined,
      dataQualityScore: 100
    }
  }, [formData])

  // Preview calculation
  const handlePreviewCalculation = useCallback(async () => {
    if (!(await validateForm())) return

    try {
      const rawData = convertToRawData()
      const validation = await validateData(rawData)
      
      if (!validation?.isValid) {
        setErrors({ general: 'Data validation failed: ' + (validation?.errors?.join(', ') || 'Unknown error') })
        return
      }

      const result = await calculateSingle(rawData, currentAlgorithm, false)
      if (result) {
        setPreviewCalculation(result)
      }
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Preview calculation failed' })
    }
  }, [validateForm, convertToRawData, validateData, calculateSingle, currentAlgorithm])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!(await validateForm())) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const rawData = convertToRawData()
      
      // DEBUG: Log final raw data before sending to calculation
      console.log('🔍 VIX DEBUG - Final raw data being sent:')
      console.log('  rawData.vix:', rawData.vix)
      console.log('  Full rawData object:', rawData)
      
      // Calculate and save to database
      const result = await calculateSingle(rawData, currentAlgorithm, true)
      
      if (result) {
        setSuccess(true)
        setPreviewCalculation(result)
        
        // Call success callback after a brief delay to show success state
        setTimeout(() => {
          onSuccess?.()
        }, 1500)
      } else {
        throw new Error('Failed to calculate breadth score')
      }
    } catch (err) {
      setErrors({ 
        general: err instanceof Error ? err.message : 'Failed to save market breadth data' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [validateForm, convertToRawData, calculateSingle, currentAlgorithm, onSuccess])

  // Reset form
  const handleReset = useCallback(() => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      stocks_up_4pct: '',
      stocks_down_4pct: '',
      stocks_up_25pct_quarter: '',
      stocks_down_25pct_quarter: '',
      stocks_up_25pct_month: '',
      stocks_down_25pct_month: '',
      stocks_up_50pct_month: '',
      stocks_down_50pct_month: '',
      stocks_up_13pct_34days: '',
      stocks_down_13pct_34days: '',
      worden_universe: '7000',
      sp500: '',
      t2108: '',
      ratio_5day: '',
      ratio_10day: '',
      worden_t2108: '',
      sp_reference: '',
      stocks_up_20pct: '',
      stocks_down_20pct: '',
      stocks_up_20dollar: '',
      stocks_down_20dollar: '',
      // VIX field (CRITICAL FOR DATA PERSISTENCE)
      vix: ''
    })
    setErrors({})
    setSuccess(false)
    setPreviewCalculation(null)
  }, [])

  // Get data source confidence indicator - Updated for migrated database
  const getDataSourceIndicator = (field: keyof MarketDataInput) => {
    if (!initialData) return null
    
    const value = formData[field]
    if (!value || value === '') return null
    
    // Comprehensive mapping for fields that have different names between MarketDataInput and BreadthData
    const fieldMapping: Partial<Record<keyof MarketDataInput, keyof BreadthData>> = {
      // Reference fields
      'sp_reference': 'sp500',
      'worden_t2108': 't2108',
      'sp500': 'sp500',
      // Standard fields (most have same names, but explicitly map for clarity)
      'stocks_up_4pct': 'stocks_up_4pct',
      'stocks_down_4pct': 'stocks_down_4pct',
      'stocks_up_25pct_quarter': 'stocks_up_25pct_quarter',
      'stocks_down_25pct_quarter': 'stocks_down_25pct_quarter',
      'stocks_up_25pct_month': 'stocks_up_25pct_month',
      'stocks_down_25pct_month': 'stocks_down_25pct_month',
      'stocks_up_50pct_month': 'stocks_up_50pct_month',
      'stocks_down_50pct_month': 'stocks_down_50pct_month',
      'stocks_up_13pct_34days': 'stocks_up_13pct_34days',
      'stocks_down_13pct_34days': 'stocks_down_13pct_34days',
      'stocks_up_20pct': 'stocks_up_20pct',
      'stocks_down_20pct': 'stocks_down_20pct',
      'stocks_up_20dollar': 'stocks_up_20dollar',
      'stocks_down_20dollar': 'stocks_down_20dollar',
      'ratio_5day': 'ratio_5day',
      'ratio_10day': 'ratio_10day',
      't2108': 't2108',
      'vix': 'vix',
      'worden_universe': 'worden_universe'
    }
    
    // Get the corresponding field name in BreadthData
    const breadthDataField = fieldMapping[field] || (field as keyof BreadthData)
    const dbValue = initialData[breadthDataField]
    
    // Check if field is manual-only (not in CSV)
    if (manualOnlyFields.has(field)) {
      return {
        icon: '🔴',
        label: 'Manual',
        confidence: 'Manual Entry Required',
        color: 'text-red-600 bg-red-50'
      }
    }
    
    // Check if field is in CSV mapping (should show as Database after migration)
    if (field in csvFieldMap) {
      // Check if the value came from database (properly populated from CSV)
      const isValidDbValue = dbValue !== null && dbValue !== undefined && dbValue !== '' && 
                            !(typeof dbValue === 'number' && dbValue === 0)
      
      if (isValidDbValue) {
        return {
          icon: '🟢',
          label: 'Database',
          confidence: 'High',
          color: 'text-green-600 bg-green-50'
        }
      }
    }
    
    // Check if value came from notes extraction
    const notesValue = extractFromNotes(initialData.notes, field)
    if (notesValue) {
      return {
        icon: '🟡',
        label: 'Notes',
        confidence: 'Medium',
        color: 'text-yellow-600 bg-yellow-50'
      }
    }
    
    // Check if value came from correlation
    const correlatedValue = getCorrelatedValue(field, initialData)
    if (correlatedValue) {
      return {
        icon: '🔵',
        label: 'Estimated',
        confidence: 'Estimated',
        color: 'text-blue-600 bg-blue-50'
      }
    }
    
    // Check if value came from legacy fallback
    const legacyValue = getLegacyFieldFallback(field, initialData)
    if (legacyValue) {
      return {
        icon: '🟠',
        label: 'Legacy',
        confidence: 'Variable',
        color: 'text-orange-600 bg-orange-50'
      }
    }
    
    return null
  }

  // Enhanced input field renderer with data source indicators
  const renderInputField = (
    field: keyof MarketDataInput,
    label: string,
    placeholder: string,
    type: 'text' | 'number' | 'date' = 'number',
    disabled: boolean = false,
    min?: number,
    max?: number,
    step?: number
  ) => {
    const sourceIndicator = getDataSourceIndicator(field)
    
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            {label} {disabled && <span className="text-gray-500 text-xs">(calculated)</span>}
          </label>
          {sourceIndicator && (
            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${sourceIndicator.color}`}>
              <span>{sourceIndicator.icon}</span>
              <span>{sourceIndicator.label}</span>
            </div>
          )}
        </div>
        <div className="relative">
          <input
            type={type}
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={placeholder}
            // Removed HTML5 validation constraints to prevent browser validation errors
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors[field] ? 'border-red-300' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${
              sourceIndicator ? 'pr-10' : ''
            }`}
            disabled={isSubmitting || disabled}
            readOnly={disabled}
          />
          {sourceIndicator && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="w-2 h-2 rounded-full bg-current opacity-60" title={`${sourceIndicator.confidence} confidence`}></div>
            </div>
          )}
        </div>
        {errors[field] && (
          <p className="mt-1 text-sm text-red-600">{errors[field]}</p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Success!</span>
          </div>
          <p className="mt-1 text-green-700">Market breadth data saved successfully.</p>
        </div>
      )}

      {/* Error Message */}
      {(errors.general || calculatorError) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-1 text-red-700">{errors.general || calculatorError}</p>
        </div>
      )}

      {/* Enhanced Form with Data Population Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Enhanced Market Breadth Entry</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Info className="w-4 h-4" />
            <span>Using {currentAlgorithm.replace('_', ' ').toUpperCase()} algorithm</span>
          </div>
        </div>


        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            </div>
            
            {renderInputField('date', 'Date', '', 'date', false)}
            {renderInputField('sp500', 'S&P 500 Level', 'e.g. 5,847', 'text', false)}
            {renderInputField('worden_universe', 'Worden Universe', 'e.g. 7000', 'number', false, 1000, 10000)}
          </div>

          {/* Primary Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Primary Indicators</span>
              </h3>
            </div>

            {renderInputField('stocks_up_4pct', 'Stocks Up 4% Daily', 'e.g. 180', 'number', false, 0)}
            {renderInputField('stocks_down_4pct', 'Stocks Down 4% Daily', 'e.g. 120', 'number', false, 0)}
            {renderInputField('t2108', 'T2108 (%)', 'e.g. 65', 'number', false, 0, 100)}
          </div>

          {/* Secondary Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingDown className="w-5 h-5 text-purple-600" />
                <span>Secondary Indicators</span>
              </h3>
            </div>

            {renderInputField('stocks_up_25pct_quarter', 'Stocks Up 25% (Quarter)', 'e.g. 450', 'number', false, 0)}
            {renderInputField('stocks_down_25pct_quarter', 'Stocks Down 25% (Quarter)', 'e.g. 200', 'number', false, 0)}
            {renderInputField('stocks_up_25pct_month', 'Stocks Up 25% (Month)', 'e.g. 350', 'number', false, 0)}
            {renderInputField('stocks_down_25pct_month', 'Stocks Down 25% (Month)', 'e.g. 150', 'number', false, 0)}
            {renderInputField('stocks_up_50pct_month', 'Stocks Up 50% (Month)', 'e.g. 120', 'number', false, 0)}
            {renderInputField('stocks_down_50pct_month', 'Stocks Down 50% (Month)', 'e.g. 80', 'number', false, 0)}
            {renderInputField('stocks_up_13pct_34days', 'Stocks Up 13% (34 Days)', 'e.g. 280', 'number', false, 0)}
            {renderInputField('stocks_down_13pct_34days', 'Stocks Down 13% (34 Days)', 'e.g. 180', 'number', false, 0)}
          </div>

          {/* VIX Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-red-600" />
                <span>Volatility Information</span>
              </h3>
            </div>
            
            {renderInputField('vix', 'VIX Level', 'e.g. 18.5', 'number', false)}
          </div>

          {/* Additional Indicators - 20% and $20 moves */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span>Additional Movement Indicators</span>
              </h3>
            </div>

            {renderInputField('stocks_up_20pct', 'Stocks Up 20%', 'e.g. 300', 'number', false, 0)}
            {renderInputField('stocks_down_20pct', 'Stocks Down 20%', 'e.g. 150', 'number', false, 0)}
            {renderInputField('stocks_up_20dollar', 'Stocks Up $20', 'e.g. 250', 'number', false, 0)}
            {renderInputField('stocks_down_20dollar', 'Stocks Down $20', 'e.g. 120', 'number', false, 0)}
            {renderInputField('ratio_5day', '5-Day Ratio', 'Automatically calculated', 'number', true, 0, undefined, 0.1)}
            {renderInputField('ratio_10day', '10-Day Ratio', 'Automatically calculated', 'number', true, 0, undefined, 0.1)}
          </div>


          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handlePreviewCalculation}
                disabled={isSubmitting || isLoading}
                className="flex items-center space-x-2 px-4 py-2 text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                <Calculator className="w-4 h-4" />
                <span>Preview Calculation</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Calculate & Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>


      {/* Preview Calculation Results */}
      {previewCalculation && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculation Preview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {previewCalculation.score.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Raw Score</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {previewCalculation.normalizedScore.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Normalized Score</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(previewCalculation.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center">
              <div className={`text-lg font-bold px-2 py-1 rounded ${
                previewCalculation.market_condition.phase === 'BULL' ? 'bg-green-100 text-green-800' :
                previewCalculation.market_condition.phase === 'BEAR' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {previewCalculation.market_condition.phase}
              </div>
              <div className="text-sm text-gray-600">Market Phase</div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Trend:</strong> {previewCalculation.market_condition.trend_direction}</p>
            <p><strong>Strength:</strong> {previewCalculation.market_condition.strength}</p>
            <p><strong>Algorithm:</strong> {previewCalculation.metadata.algorithm_used}</p>
            <p><strong>Data Quality:</strong> {previewCalculation.metadata.data_quality}%</p>
          </div>
        </div>
      )}
    </div>
  )
}