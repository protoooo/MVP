"""
Restaurant Inspection Scraper for Southeast Michigan Counties
Scrapes data from Sword Solutions legacy ASP website
"""
import requests
from bs4 import BeautifulSoup
import json
import time


def scrape_county(county_id):
    """
    Scrape restaurant inspection data for a specific county
    
    Args:
        county_id: County ID number (e.g., 28 for Washtenaw)
    
    Returns:
        List of restaurant data dictionaries
    """
    # Note: Using HTTP because the legacy Sword Solutions ASP website doesn't support HTTPS
    base_url = "http://www.swordsolutions.com/inspections/pgeSearchResults.asp"
    params = {
        'County': county_id,
        'Name': ''
    }
    
    restaurants = []
    
    try:
        print(f"Scraping county ID {county_id}...")
        response = requests.get(base_url, params=params, timeout=30)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find the results table
        # The site uses tables for layout, we need to find the data table
        tables = soup.find_all('table')
        
        # Look for the table with restaurant data
        for table in tables:
            rows = table.find_all('tr')
            
            # Skip if too few rows (likely a header/layout table)
            if len(rows) < 2:
                continue
            
            # Process rows (skip header row)
            for row in rows[1:]:
                cells = row.find_all('td')
                
                # Look for rows with at least 3 cells (Name, Address, City)
                if len(cells) >= 3:
                    # Extract text from cells
                    name_cell = cells[0]
                    
                    # Try to find the link to the full report
                    link = name_cell.find('a')
                    report_url = ''
                    if link and link.get('href'):
                        href = link.get('href')
                        # Make absolute URL if relative
                        if href.startswith('http'):
                            report_url = href
                        else:
                            report_url = f"http://www.swordsolutions.com/inspections/{href}"
                    
                    # Get restaurant name
                    name = name_cell.get_text(strip=True)
                    
                    # Get address and city
                    address = cells[1].get_text(strip=True) if len(cells) > 1 else ''
                    city = cells[2].get_text(strip=True) if len(cells) > 2 else ''
                    
                    # Only add if we have at least a name
                    if name:
                        restaurant = {
                            'name': name,
                            'address': address,
                            'city': city,
                            'report_url': report_url,
                            'county_id': county_id
                        }
                        restaurants.append(restaurant)
        
        print(f"Found {len(restaurants)} restaurants for county {county_id}")
        
    except requests.exceptions.RequestException as e:
        print(f"Error scraping county {county_id}: {str(e)}")
    except Exception as e:
        print(f"Unexpected error scraping county {county_id}: {str(e)}")
    
    return restaurants


def main():
    """
    Main function to scrape all target counties and save results
    """
    # Southeast Michigan county IDs
    target_counties = {
        28: 'Washtenaw',
        63: 'Oakland',
        82: 'Wayne',
        50: 'Macomb'
    }
    
    all_restaurants = []
    
    print("Starting Michigan Restaurant Inspection Scraper")
    print("=" * 60)
    
    for county_id, county_name in target_counties.items():
        print(f"\nProcessing {county_name} County (ID: {county_id})...")
        
        restaurants = scrape_county(county_id)
        all_restaurants.extend(restaurants)
        
        # Be polite to the server
        time.sleep(2)
    
    print("\n" + "=" * 60)
    print(f"Total restaurants scraped: {len(all_restaurants)}")
    
    # Save to JSON file
    output_file = 'inspections.json'
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_restaurants, f, indent=2, ensure_ascii=False)
        print(f"Data saved to {output_file}")
    except Exception as e:
        print(f"Error saving data: {str(e)}")
    
    return all_restaurants


if __name__ == '__main__':
    main()
