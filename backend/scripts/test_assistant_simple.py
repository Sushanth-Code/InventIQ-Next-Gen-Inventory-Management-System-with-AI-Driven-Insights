import sys
import os
import json

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the necessary modules
from main import create_app
from app.models.export_data import ExportData

# Create the Flask app
app = create_app()

def test_insights():
    """Test the export data insights directly"""
    print("=== Testing Export Data Insights Integration ===\n")
    
    # Test queries
    queries = [
        "What products are low on stock?",
        "Which categories need attention?",
        "How is my overall inventory health?"
    ]
    
    # Use the Flask application context
    with app.app_context():
        # Test each query
        for query in queries:
            print("="*60)
            print(f"QUERY: '{query}'")
            print("="*60)
            
            # Get insights directly from ExportData
            export_data = ExportData()
            result = export_data.get_inventory_insights(query)
            
            print("\nRESPONSE:\n")
            print(result['insights'])
            print("\n")
            
            print("-"*60 + "\n")

if __name__ == "__main__":
    test_insights()
