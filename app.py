from flask import Flask, render_template, jsonify
import json
import os

app = Flask(__name__)

# Load data helper
def load_data():
    try:
        # We read the file that Colab uploaded
        with open('inspections.json', 'r') as f:
            return json.load(f)
    except:
        return []

@app.route('/')
def home():
    data = load_data()
    return render_template('index.html', restaurants=data)

@app.route('/api')
def api():
    return jsonify(load_data())

if __name__ == '__main__':
    app.run(debug=True)
