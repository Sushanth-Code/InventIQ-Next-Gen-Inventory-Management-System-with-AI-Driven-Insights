import requests
import json
import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the create_app function
from main import create_app

# Create the Flask app
app = create_app()

def test_assistant_insights():
    """Test the assistant insights endpoint directly using the Flask test client"""
    with app.test_client() as client:
        print("=== Testing Smart Assistant with Export Insights Integration ===\n")
        
        # Define test queries
        test_queries = [
            "What products are low on stock?",
            "Which categories need attention?",
            "How is my overall inventory health?"
        ]
        
        # Test each query
        for query in test_queries:
            print("="*50)
            print(f"QUERY: '{query}'")
            print("="*50)
            
            # Make the request
            response = client.post('/api/assistant/insights', json={'query': query})
            
            print(f"Status code: {response.status_code}")
            if response.status_code == 200:
                data = response.get_json()
                print("\nRESPONSE:\n")
                print(data.get('insight', 'No insight returned'))
                print("\n")
            else:
                print(f"\nERROR: {response.data.decode('utf-8')}\n")
            
            print("\n" + "-"*50 + "\n")

if __name__ == "__main__":
    test_assistant_insights()
