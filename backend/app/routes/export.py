from flask import Blueprint, jsonify, request, send_file
from app.models.export_data import ExportData

export_bp = Blueprint('export', __name__)

@export_bp.route('/inventory', methods=['GET'])
def export_inventory():
    """Export inventory data to CSV and return the file"""
    try:
        filepath = ExportData.export_inventory_data()
        return send_file(filepath, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@export_bp.route('/insights', methods=['POST'])
def get_inventory_insights():
    """Get AI-powered insights about the inventory"""
    try:
        data = request.get_json()
        query = data.get('query') if data else None
        
        # Get insights using the ExportData class
        result = ExportData.get_inventory_insights(query)
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
