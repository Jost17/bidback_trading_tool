"""
Data Validation Functions for BIDBACK Trading Tool
Ensures data quality and consistency for market breadth and price data
"""

from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
import logging
import re

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Custom exception for data validation errors"""
    pass

class DataValidator:
    """Comprehensive data validation for trading data"""
    
    # Validation rules and constraints
    DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')
    MIN_DATE = date(2007, 1, 1)
    MAX_DATE = date.today().replace(year=date.today().year + 1)  # Allow 1 year future
    
    # Price validation constraints
    MIN_PRICE = 0.01
    MAX_PRICE = 99999.99
    
    # Breadth indicator constraints
    MIN_STOCK_COUNT = 0
    MAX_STOCK_COUNT = 10000
    
    # Ratio constraints
    MIN_RATIO = 0.001
    MAX_RATIO = 100.0
    
    # Percentage constraints (T2108, etc.)
    MIN_PERCENTAGE = 0.0
    MAX_PERCENTAGE = 100.0
    
    @staticmethod
    def validate_date(date_value: Any) -> Tuple[bool, str, Optional[date]]:
        """
        Validate date field
        
        Args:
            date_value: Date value to validate
            
        Returns:
            Tuple of (is_valid, error_message, parsed_date)
        """
        try:
            if date_value is None:
                return False, "Date cannot be null", None
            
            # Handle different date formats
            if isinstance(date_value, date):
                parsed_date = date_value
            elif isinstance(date_value, datetime):
                parsed_date = date_value.date()
            elif isinstance(date_value, str):
                # Check format
                if not DataValidator.DATE_PATTERN.match(date_value):
                    return False, "Date must be in YYYY-MM-DD format", None
                
                try:
                    parsed_date = datetime.strptime(date_value, '%Y-%m-%d').date()
                except ValueError:
                    return False, "Invalid date format", None
            else:
                return False, "Date must be string, date, or datetime object", None
            
            # Check date range
            if parsed_date < DataValidator.MIN_DATE:
                return False, f"Date cannot be before {DataValidator.MIN_DATE}", None
            
            if parsed_date > DataValidator.MAX_DATE:
                return False, f"Date cannot be after {DataValidator.MAX_DATE}", None
            
            return True, "", parsed_date
            
        except Exception as e:
            return False, f"Date validation error: {str(e)}", None
    
    @staticmethod
    def validate_price(price_value: Any, field_name: str = "price") -> Tuple[bool, str, Optional[float]]:
        """
        Validate price field (high, low, close, etc.)
        
        Args:
            price_value: Price value to validate
            field_name: Name of the field for error messages
            
        Returns:
            Tuple of (is_valid, error_message, parsed_price)
        """
        try:
            if price_value is None:
                return True, "", None  # Allow null prices
            
            # Convert to float
            if isinstance(price_value, str):
                # Remove commas and quotes
                price_value = price_value.replace(',', '').replace('"', '').strip()
                if not price_value:
                    return True, "", None
            
            try:
                price_float = float(price_value)
            except (ValueError, TypeError):
                return False, f"{field_name} must be a valid number", None
            
            # Check range
            if price_float < DataValidator.MIN_PRICE:
                return False, f"{field_name} cannot be less than {DataValidator.MIN_PRICE}", None
            
            if price_float > DataValidator.MAX_PRICE:
                return False, f"{field_name} cannot exceed {DataValidator.MAX_PRICE}", None
            
            return True, "", price_float
            
        except Exception as e:
            return False, f"{field_name} validation error: {str(e)}", None
    
    @staticmethod
    def validate_stock_count(count_value: Any, field_name: str = "stock_count") -> Tuple[bool, str, Optional[int]]:
        """
        Validate stock count fields (breadth indicators)
        
        Args:
            count_value: Count value to validate
            field_name: Name of the field for error messages
            
        Returns:
            Tuple of (is_valid, error_message, parsed_count)
        """
        try:
            if count_value is None:
                return True, "", None  # Allow null counts
            
            # Convert to integer
            try:
                if isinstance(count_value, str):
                    count_value = count_value.replace(',', '').strip()
                    if not count_value:
                        return True, "", None
                
                count_int = int(float(count_value))  # Handle decimal strings
            except (ValueError, TypeError):
                return False, f"{field_name} must be a valid integer", None
            
            # Check range
            if count_int < DataValidator.MIN_STOCK_COUNT:
                return False, f"{field_name} cannot be negative", None
            
            if count_int > DataValidator.MAX_STOCK_COUNT:
                return False, f"{field_name} cannot exceed {DataValidator.MAX_STOCK_COUNT}", None
            
            return True, "", count_int
            
        except Exception as e:
            return False, f"{field_name} validation error: {str(e)}", None
    
    @staticmethod
    def validate_ratio(ratio_value: Any, field_name: str = "ratio") -> Tuple[bool, str, Optional[float]]:
        """
        Validate ratio fields (5-day, 10-day ratios)
        
        Args:
            ratio_value: Ratio value to validate
            field_name: Name of the field for error messages
            
        Returns:
            Tuple of (is_valid, error_message, parsed_ratio)
        """
        try:
            if ratio_value is None:
                return True, "", None  # Allow null ratios
            
            # Convert to float
            try:
                if isinstance(ratio_value, str):
                    ratio_value = ratio_value.replace(',', '').strip()
                    if not ratio_value:
                        return True, "", None
                
                ratio_float = float(ratio_value)
            except (ValueError, TypeError):
                return False, f"{field_name} must be a valid number", None
            
            # Check range
            if ratio_float < DataValidator.MIN_RATIO:
                return False, f"{field_name} cannot be less than {DataValidator.MIN_RATIO}", None
            
            if ratio_float > DataValidator.MAX_RATIO:
                return False, f"{field_name} cannot exceed {DataValidator.MAX_RATIO}", None
            
            return True, "", ratio_float
            
        except Exception as e:
            return False, f"{field_name} validation error: {str(e)}", None
    
    @staticmethod
    def validate_percentage(pct_value: Any, field_name: str = "percentage") -> Tuple[bool, str, Optional[float]]:
        """
        Validate percentage fields (T2108, etc.)
        
        Args:
            pct_value: Percentage value to validate
            field_name: Name of the field for error messages
            
        Returns:
            Tuple of (is_valid, error_message, parsed_percentage)
        """
        try:
            if pct_value is None:
                return True, "", None  # Allow null percentages
            
            # Convert to float
            try:
                if isinstance(pct_value, str):
                    pct_value = pct_value.replace(',', '').strip()
                    if not pct_value:
                        return True, "", None
                
                pct_float = float(pct_value)
            except (ValueError, TypeError):
                return False, f"{field_name} must be a valid number", None
            
            # Check range
            if pct_float < DataValidator.MIN_PERCENTAGE:
                return False, f"{field_name} cannot be negative", None
            
            if pct_float > DataValidator.MAX_PERCENTAGE:
                return False, f"{field_name} cannot exceed {DataValidator.MAX_PERCENTAGE}%", None
            
            return True, "", pct_float
            
        except Exception as e:
            return False, f"{field_name} validation error: {str(e)}", None
    
    @staticmethod
    def validate_high_low_consistency(high: float, low: float) -> Tuple[bool, str]:
        """
        Validate that high >= low price consistency
        
        Args:
            high: High price
            low: Low price
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if high is None or low is None:
            return True, ""  # Skip validation if either is null
        
        if high < low:
            return False, f"High price ({high}) cannot be less than low price ({low})"
        
        return True, ""
    
    @staticmethod
    def validate_true_range_calculation(high: float, low: float, previous_close: float) -> Tuple[bool, str, Optional[float]]:
        """
        Validate and calculate True Range
        
        Args:
            high: Daily high price
            low: Daily low price
            previous_close: Previous day's closing price
            
        Returns:
            Tuple of (is_valid, error_message, calculated_true_range)
        """
        try:
            if any(v is None for v in [high, low, previous_close]):
                return True, "", None  # Skip if any value is missing
            
            # Validate high >= low
            is_valid, error_msg = DataValidator.validate_high_low_consistency(high, low)
            if not is_valid:
                return False, error_msg, None
            
            # Calculate True Range components
            hl_range = high - low
            hc_range = abs(high - previous_close)
            lc_range = abs(low - previous_close)
            
            # True Range is the maximum of the three components
            true_range = max(hl_range, hc_range, lc_range)
            
            # Sanity check
            if true_range < 0:
                return False, "True Range cannot be negative", None
            
            # Round to 4 decimal places
            true_range = round(true_range, 4)
            
            return True, "", true_range
            
        except Exception as e:
            return False, f"True Range calculation error: {str(e)}", None

class BreadthDataValidator:
    """Specialized validator for market breadth data"""
    
    # CSV column mapping for validation
    CSV_FIELD_MAPPING = {
        'Date': 'date',
        'Number of stocks up 4% plus today': 'stocks_up_4pct_daily',
        'Number of stocks down 4% plus today': 'stocks_down_4pct_daily',
        '5 day ratio': 'ratio_5day',
        '10 day  ratio ': 'ratio_10day',  # Note the space in original
        'Number of stocks up 25% plus in a quarter': 'stocks_up_25pct_quarterly',
        'Number of stocks down 25% + in a quarter': 'stocks_down_25pct_quarterly',
        'Number of stocks up 25% + in a month': 'stocks_up_25pct_monthly',
        'Number of stocks down 25% + in a month': 'stocks_down_25pct_monthly',
        'Number of stocks up 50% + in a month': 'stocks_up_50pct_monthly',
        'Number of stocks down 50% + in a month': 'stocks_down_50pct_monthly',
        'Number of stocks up 13% + in 34 days': 'stocks_up_13pct_34days',
        'Number of stocks down 13% + in 34 days': 'stocks_down_13pct_34days',
        ' Worden Common stock universe': 'worden_common_stocks',  # Note the leading space
        'T2108 ': 't2108',  # Note the trailing space
        'S&P': 'sp_reference'
    }
    
    @staticmethod
    def validate_breadth_record(record: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Validate complete market breadth record
        
        Args:
            record: Dictionary with breadth data
            
        Returns:
            Tuple of (is_valid, list_of_errors, validated_record)
        """
        errors = []
        validated_record = {}
        
        try:
            # Validate date (required)
            if 'date' in record:
                is_valid, error_msg, parsed_date = DataValidator.validate_date(record['date'])
                if is_valid:
                    validated_record['date'] = parsed_date
                else:
                    errors.append(error_msg)
            else:
                errors.append("Date field is required")
            
            # Validate stock counts
            stock_count_fields = [
                'stocks_up_4pct_daily', 'stocks_down_4pct_daily',
                'stocks_up_25pct_quarterly', 'stocks_down_25pct_quarterly',
                'stocks_up_25pct_monthly', 'stocks_down_25pct_monthly',
                'stocks_up_50pct_monthly', 'stocks_down_50pct_monthly',
                'stocks_up_13pct_34days', 'stocks_down_13pct_34days'
            ]
            
            for field in stock_count_fields:
                if field in record:
                    is_valid, error_msg, parsed_count = DataValidator.validate_stock_count(
                        record[field], field
                    )
                    if is_valid:
                        if parsed_count is not None:
                            validated_record[field] = parsed_count
                    else:
                        errors.append(error_msg)
            
            # Validate ratios
            ratio_fields = ['ratio_5day', 'ratio_10day']
            for field in ratio_fields:
                if field in record:
                    is_valid, error_msg, parsed_ratio = DataValidator.validate_ratio(
                        record[field], field
                    )
                    if is_valid:
                        if parsed_ratio is not None:
                            validated_record[field] = parsed_ratio
                    else:
                        errors.append(error_msg)
            
            # Validate percentages
            if 't2108' in record:
                is_valid, error_msg, parsed_pct = DataValidator.validate_percentage(
                    record['t2108'], 't2108'
                )
                if is_valid:
                    if parsed_pct is not None:
                        validated_record['t2108'] = parsed_pct
                else:
                    errors.append(error_msg)
            
            # Validate reference values
            reference_fields = ['worden_common_stocks', 'sp_reference']
            for field in reference_fields:
                if field in record:
                    is_valid, error_msg, parsed_value = DataValidator.validate_price(
                        record[field], field
                    )
                    if is_valid:
                        if parsed_value is not None:
                            validated_record[field] = parsed_value
                    else:
                        errors.append(error_msg)
            
            # Validate High/Low data if present
            if 'daily_high' in record and 'daily_low' in record:
                high_valid, high_error, high_value = DataValidator.validate_price(
                    record['daily_high'], 'daily_high'
                )
                low_valid, low_error, low_value = DataValidator.validate_price(
                    record['daily_low'], 'daily_low'
                )
                
                if high_valid and low_valid:
                    if high_value is not None:
                        validated_record['daily_high'] = high_value
                    if low_value is not None:
                        validated_record['daily_low'] = low_value
                    
                    # Validate consistency
                    if high_value is not None and low_value is not None:
                        consistency_valid, consistency_error = DataValidator.validate_high_low_consistency(
                            high_value, low_value
                        )
                        if not consistency_valid:
                            errors.append(consistency_error)
                else:
                    if high_error:
                        errors.append(high_error)
                    if low_error:
                        errors.append(low_error)
            
            # Calculate True Range if we have all required data
            if all(k in validated_record for k in ['daily_high', 'daily_low']) and 'previous_close' in record:
                close_valid, close_error, close_value = DataValidator.validate_price(
                    record['previous_close'], 'previous_close'
                )
                
                if close_valid and close_value is not None:
                    validated_record['previous_close'] = close_value
                    
                    tr_valid, tr_error, tr_value = DataValidator.validate_true_range_calculation(
                        validated_record['daily_high'],
                        validated_record['daily_low'],
                        close_value
                    )
                    
                    if tr_valid and tr_value is not None:
                        validated_record['true_range'] = tr_value
                    elif tr_error:
                        errors.append(tr_error)
                elif close_error:
                    errors.append(close_error)
            
            # Set data source if not provided
            if 'data_source' not in validated_record:
                validated_record['data_source'] = 'csv_import'
            
            is_valid = len(errors) == 0
            return is_valid, errors, validated_record
            
        except Exception as e:
            logger.error(f"Unexpected error during validation: {str(e)}")
            errors.append(f"Validation error: {str(e)}")
            return False, errors, {}
    
    @staticmethod
    def validate_csv_row(csv_row: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Validate CSV row and convert to database format
        
        Args:
            csv_row: Raw CSV row dictionary
            
        Returns:
            Tuple of (is_valid, list_of_errors, converted_record)
        """
        try:
            # Convert CSV column names to database field names
            converted_record = {}
            
            for csv_column, db_field in BreadthDataValidator.CSV_FIELD_MAPPING.items():
                if csv_column in csv_row:
                    converted_record[db_field] = csv_row[csv_column]
            
            # Handle any additional fields that might be present
            for key, value in csv_row.items():
                if key not in BreadthDataValidator.CSV_FIELD_MAPPING and key not in converted_record:
                    # Convert key to snake_case database format
                    db_key = key.lower().replace(' ', '_').replace('%', 'pct').replace('+', 'plus')
                    db_key = re.sub(r'[^a-z0-9_]', '', db_key)
                    converted_record[db_key] = value
            
            # Validate the converted record
            return BreadthDataValidator.validate_breadth_record(converted_record)
            
        except Exception as e:
            logger.error(f"CSV row validation error: {str(e)}")
            return False, [f"CSV validation error: {str(e)}"], {}

# Export validation functions
__all__ = [
    'ValidationError',
    'DataValidator', 
    'BreadthDataValidator'
]