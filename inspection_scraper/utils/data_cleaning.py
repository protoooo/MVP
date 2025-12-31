"""
Data cleaning utilities for normalizing inspection data.
Handles standardization of business names, addresses, dates, and other fields.
"""

import re
from datetime import datetime
from typing import Optional


class DataCleaner:
    """
    Utilities for cleaning and normalizing inspection data.
    Standardizes formats for business names, addresses, dates, etc.
    """
    
    def normalize_business_name(self, name: str) -> str:
        """
        Normalize business name by removing extra whitespace and standardizing format.
        
        Args:
            name: Raw business name
            
        Returns:
            Normalized business name
        """
        if not name:
            return ""
        
        # Strip leading/trailing whitespace
        name = name.strip()
        
        # Replace multiple spaces with single space
        name = re.sub(r'\s+', ' ', name)
        
        # Remove extra punctuation at the end
        name = re.sub(r'[,;]+\s*$', '', name)
        
        # Final strip to remove any trailing whitespace added by punctuation removal
        name = name.strip()
        
        return name
    
    def normalize_address(self, address: str) -> str:
        """
        Normalize address by standardizing format and removing extra whitespace.
        
        Args:
            address: Raw address string
            
        Returns:
            Normalized address
        """
        if not address:
            return ""
        
        # Strip and clean whitespace
        address = address.strip()
        address = re.sub(r'\s+', ' ', address)
        
        # Standardize common abbreviations
        replacements = {
            r'\bSt\b\.?': 'Street',
            r'\bAve\b\.?': 'Avenue',
            r'\bRd\b\.?': 'Road',
            r'\bDr\b\.?': 'Drive',
            r'\bBlvd\b\.?': 'Boulevard',
            r'\bLn\b\.?': 'Lane',
            r'\bCt\b\.?': 'Court',
            r'\bPl\b\.?': 'Place',
        }
        
        for pattern, replacement in replacements.items():
            address = re.sub(pattern, replacement, address, flags=re.IGNORECASE)
        
        return address
    
    def normalize_date(self, date_str: str) -> str:
        """
        Normalize date string to ISO format (YYYY-MM-DD).
        
        Args:
            date_str: Raw date string in various formats
            
        Returns:
            Date in ISO format (YYYY-MM-DD) or original string if parsing fails
        """
        if not date_str:
            return ""
        
        # Common date formats to try
        date_formats = [
            '%Y-%m-%d',      # 2024-01-15
            '%m/%d/%Y',      # 01/15/2024
            '%m-%d-%Y',      # 01-15-2024
            '%d/%m/%Y',      # 15/01/2024
            '%d-%m-%Y',      # 15-01-2024
            '%B %d, %Y',     # January 15, 2024
            '%b %d, %Y',     # Jan 15, 2024
            '%m/%d/%y',      # 01/15/24
            '%m-%d-%y',      # 01-15-24
        ]
        
        date_str = date_str.strip()
        
        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(date_str, fmt)
                return parsed_date.strftime('%Y-%m-%d')
            except ValueError:
                continue
        
        # If no format matches, return original string
        return date_str
    
    def normalize_violations(self, violations: str) -> str:
        """
        Normalize violations text by cleaning whitespace and formatting.
        
        Args:
            violations: Raw violations text
            
        Returns:
            Normalized violations text
        """
        if not violations:
            return ""
        
        # Strip and clean whitespace
        violations = violations.strip()
        violations = re.sub(r'\s+', ' ', violations)
        
        return violations
    
    def normalize_severity(self, severity: str) -> str:
        """
        Normalize severity level to standard values.
        
        Args:
            severity: Raw severity string
            
        Returns:
            Normalized severity (e.g., 'high', 'medium', 'low', 'critical')
        """
        if not severity:
            return ""
        
        severity = severity.strip().lower()
        
        # Map common variations to standard values
        severity_map = {
            'critical': 'critical',
            'crit': 'critical',
            'high': 'high',
            'h': 'high',
            'medium': 'medium',
            'med': 'medium',
            'moderate': 'medium',
            'm': 'medium',
            'low': 'low',
            'l': 'low',
            'minor': 'low',
        }
        
        return severity_map.get(severity, severity)
    
    def clean_record(self, record: dict) -> dict:
        """
        Clean all fields in an inspection record.
        
        Args:
            record: Dictionary containing inspection data
            
        Returns:
            Dictionary with all fields normalized
        """
        cleaned = record.copy()
        
        if 'business_name' in cleaned:
            cleaned['business_name'] = self.normalize_business_name(cleaned['business_name'])
        
        if 'address' in cleaned:
            cleaned['address'] = self.normalize_address(cleaned['address'])
        
        if 'inspection_date' in cleaned:
            cleaned['inspection_date'] = self.normalize_date(cleaned['inspection_date'])
        
        if 'violations' in cleaned:
            cleaned['violations'] = self.normalize_violations(cleaned['violations'])
        
        if 'severity' in cleaned:
            cleaned['severity'] = self.normalize_severity(cleaned['severity'])
        
        return cleaned
