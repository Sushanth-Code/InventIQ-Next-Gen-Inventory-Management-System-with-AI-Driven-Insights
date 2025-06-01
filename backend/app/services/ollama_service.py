import requests
import json
from flask import current_app
from app.models.inventory import Product, Transaction
import pandas as pd

class OllamaService:
    def __init__(self, base_url="http://localhost:11434", model="llama3"):
        """Initialize the Ollama service with base URL and model."""
        self.base_url = base_url
        self.model = model
        self.api_endpoint = f"{self.base_url}/api/generate"
    
    def generate(self, prompt, system_prompt=None, temperature=0.7, max_tokens=500):
        """Generate a response using Ollama."""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        if system_prompt:
            payload["system"] = system_prompt
            
        try:
            # Try to connect to Ollama server first
            health_check = requests.get(f"{self.base_url}/api/health", timeout=5)
            if health_check.status_code != 200:
                raise Exception("Ollama server is not running. Please start Ollama first.")
                
            # Check if model exists
            models = requests.get(f"{self.base_url}/api/tags", timeout=5).json()
            if not any(self.model in model.get('name', '') for model in models.get('models', [])):
                raise Exception(f"Model {self.model} is not downloaded. Please run: ollama pull {self.model}")
            
            # Generate response with timeout
            response = requests.post(self.api_endpoint, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()["response"]
            
        except requests.exceptions.Timeout:
            error_msg = "Request to Ollama timed out. Please check if the server is responding."
            current_app.logger.error(error_msg)
            raise Exception(error_msg)
            
        except requests.exceptions.ConnectionError:
            error_msg = "Could not connect to Ollama. Please make sure Ollama is running."
            current_app.logger.error(error_msg)
            raise Exception(error_msg)
            
        except Exception as e:
            current_app.logger.error(f"Error calling Ollama API: {str(e)}")
            raise Exception(f"Error generating insights: {str(e)}")

def prepare_inventory_summary():
    """Prepare a summary of inventory data for the LLM context."""
    products = Product.query.all()
    
    # Convert to dataframe for easier analysis
    products_data = []
    for p in products:
        product_data = {
            'id': p.id,
            'name': p.name,
            'category': p.category,
            'supplier': p.supplier,
            'current_stock': p.current_stock,
            'reorder_level': p.reorder_level,
            'purchase_price': p.purchase_price,
            'selling_price': p.selling_price
        }
        
        # Add historical sales data if available
        if hasattr(p, 'historical_sales') and p.historical_sales:
            product_data['historical_sales'] = p.historical_sales
            
        products_data.append(product_data)
        
    df = pd.DataFrame(products_data)
    
    # Create summary stats
    summary = {
        'total_products': len(products),
        'categories': df['category'].value_counts().to_dict() if not df.empty else {},
        'low_stock_items': []
    }
    
    # Get low stock items
    if not df.empty:
        low_stock_df = df[df['current_stock'] <= df['reorder_level']]
        summary['low_stock_count'] = low_stock_df.shape[0]
        summary['out_of_stock_count'] = df[df['current_stock'] == 0].shape[0]
        
        # Add detailed low stock items
        summary['low_stock_items'] = low_stock_df[['id', 'name', 'category', 'current_stock', 'reorder_level']].to_dict('records')
        
        # Add trending products based on historical sales if available
        if 'historical_sales' in df.columns and not df['historical_sales'].isna().all():
            # This would need to be implemented based on your historical_sales data structure
            # For now, we'll just include a placeholder
            summary['trending_products'] = []
    
    return summary

def get_product_details(product_id):
    """Get detailed information about a specific product."""
    product = Product.query.get(product_id)
    if not product:
        return None
        
    return product.to_dict()

def get_ollama_insights(query, product_id=None):
    """Generate insights using Ollama based on user query."""
    ollama_service = OllamaService(
        base_url=current_app.config.get('OLLAMA_BASE_URL', 'http://localhost:11434'),
        model=current_app.config.get('OLLAMA_MODEL', 'llama3')
    )
    
    # Prepare context for the LLM
    inventory_summary = prepare_inventory_summary()
    
    # Add specific product details if provided
    product_details = None
    if product_id:
        product_details = get_product_details(product_id)
    
    # Create the system prompt
    system_prompt = """You are an intelligent inventory management assistant for InventIQ system. 
    Your role is to provide accurate, helpful insights about inventory data.
    When asked about low stock items or trending products, always include specific product names and quantities.
    For restock recommendations, include a 30% buffer for trending or fast-moving products.
    Be concise but informative."""
    
    # Create the user prompt with inventory data
    user_prompt = f"""Inventory Summary:
{json.dumps(inventory_summary, indent=2)}

{"Product Details:\n" + json.dumps(product_details, indent=2) if product_details else ""}

User Query: {query}

Provide a helpful response addressing the user's query based on the inventory data provided above."""
    
    # Generate response using Ollama
    insight = ollama_service.generate(
        prompt=user_prompt,
        system_prompt=system_prompt,
        temperature=0.7,
        max_tokens=500
    )
    
    return insight
