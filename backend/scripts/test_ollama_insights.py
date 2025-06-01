import requests
import json
import os

def test_export_and_insights():
    """Test both the export and insights endpoints"""
    BASE_URL = "http://localhost:5000"  # Adjust if your server runs on a different port
    
    print("\n=== Testing Export Functionality ===")
    # Test CSV export
    try:
        response = requests.get(f"{BASE_URL}/api/export/inventory")
        if response.status_code == 200:
            # Save the CSV file
            filename = "test_export.csv"
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"✅ CSV Export successful! Saved as: {filename}")
            
            # Read first few lines of CSV to verify content
            with open(filename, 'r') as f:
                print("\nFirst few lines of CSV:")
                for i, line in enumerate(f):
                    if i < 5:  # Show first 5 lines
                        print(line.strip())
        else:
            print(f"❌ Export failed with status code: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Export error: {str(e)}")

    print("\n=== Testing AI Insights ===")
    # Test insights with different queries
    test_queries = [
        "What products are running low on stock?",
        "Show me critical stock situations",
        "Which categories need attention?"
    ]
    
    for query in test_queries:
        try:
            print(f"\nTesting query: '{query}'")
            response = requests.post(
                f"{BASE_URL}/api/export/insights",
                json={"query": query},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Query successful!")
                print("\nInsights:")
                print(data['data']['insights'])
                print("\nSummary:")
                print(json.dumps(data['data']['summary'], indent=2))
            else:
                print(f"❌ Query failed with status code: {response.status_code}")
                print(response.text)
        except Exception as e:
            print(f"❌ Query error: {str(e)}")

if __name__ == "__main__":
    test_export_and_insights()
