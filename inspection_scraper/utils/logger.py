"""
Logging configuration for the inspection scraper.
Sets up consistent logging across all scraper modules.
"""

import logging
import sys


def setup_logger(name: str = 'inspection_scraper', level: int = logging.INFO) -> logging.Logger:
    """
    Set up and configure logger for the scraper.
    
    Args:
        name: Logger name (default: 'inspection_scraper')
        level: Logging level (default: logging.INFO)
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Only add handlers if logger doesn't have any (avoid duplicates)
    if not logger.handlers:
        logger.setLevel(level)
        
        # Create console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(formatter)
        
        # Add handler to logger
        logger.addHandler(console_handler)
    
    return logger
