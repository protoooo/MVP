"""
Scrapers package for multi-county inspection reports.
UPDATED: Now includes Sword Solutions JavaScript-based scraper
"""

from .base_scraper import BaseScraper
from .sword_solutions import SwordSolutionsScraper

__all__ = ['BaseScraper', 'SwordSolutionsScraper']
