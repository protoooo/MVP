"""
Flask Web Application for Michigan Food Safety Dashboard
Displays restaurant inspection data scraped from Sword Solutions
"""
from flask import Flask, render_template, jsonify
import json
import os
import threading
from scraper import main as run_scraper

app = Flask(__name__)


def load_data():
    """Load inspection data from JSON file"""
    data_file = 'inspections.json'
    
    if not os.path.exists(data_file):
        return []
    
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except Exception as e:
        print(f"Error loading data: {str(e)}")
        return []


@app.route('/')
def home():
    """Home page - Display restaurant dashboard"""
    data = load_data()
    count = len(data)
    return render_template('index.html', restaurants=data, count=count)


@app.route('/api/data')
def api_data():
    """API endpoint - Return raw JSON data"""
    data = load_data()
    return jsonify(data)


@app.route('/scrape')
def scrape():
    """Trigger route - Run scraper in background"""
    
    def background_scrape():
        """Run the scraper in a background thread"""
        try:
            print("Background scraping started...")
            run_scraper()
            print("Background scraping completed!")
        except Exception as e:
            print(f"Error in background scraping: {str(e)}")
    
    # Start scraping in background thread
    thread = threading.Thread(target=background_scrape)
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'status': 'started',
        'message': 'Scraping started in background. Check logs for progress.'
    })


if __name__ == '__main__':
    # For local development
    app.run(debug=True, host='0.0.0.0', port=5000)
