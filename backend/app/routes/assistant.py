from flask import Blueprint, request, jsonify, current_app
from app.services.llm_service import get_llm_insights

assistant_bp = Blueprint('assistant', __name__, url_prefix='/api/assistant')

@assistant_bp.route('/insights', methods=['POST'])
def get_insights():
    """Generate AI insights based on user query."""
    data = request.get_json()
    
    if not data or 'query' not in data:
        return jsonify({'error': 'Query is required'}), 400
    
    query = data['query']
    product_id = data.get('product_id')  # Optional product ID for context
    
    try:
        # Get insights from LLM service
        insights = get_llm_insights(query, product_id)
        return jsonify({'insights': insights})
    except Exception as e:
        current_app.logger.error(f"Error generating insights: {str(e)}")
        return jsonify({'error': f'Failed to generate insights: {str(e)}'}), 500
