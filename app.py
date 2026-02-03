from flask import Flask, request, jsonify, send_from_directory
import baoStack
import os
import pandas as pd

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'double.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(BASE_DIR, path)

@app.route('/api/stock_data', methods=['POST'])
def get_stock_data():
    data = request.json
    code = data.get('code')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if not code or not start_date or not end_date:
        return jsonify({"error": "Missing parameters"}), 400
        
    df, error = baoStack.get(code, start_date, end_date)
    
    if error:
        return jsonify({"error": error}), 500
        
    if df.empty:
        return jsonify({"error": "No data found for the given parameters"}), 404
        
    # Convert DataFrame to list of dicts
    result = df.to_dict(orient='records')
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
