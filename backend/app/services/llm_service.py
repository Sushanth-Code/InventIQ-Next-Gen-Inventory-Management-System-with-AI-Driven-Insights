import json
from flask import current_app
from app.models.inventory import Product, Transaction
from app.models.export_data import ExportData
import pandas as pd
from .ollama_service import get_ollama_insights

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
            # Process historical sales to identify trending products
            trending_products = []
            for _, row in df.iterrows():
                if row.get('historical_sales'):
                    # Calculate total sales from historical data
                    try:
                        sales_data = row['historical_sales']
                        if isinstance(sales_data, dict):
                            total_sales = sum(sales_data.values())
                            trending_products.append({
                                'id': row['id'],
                                'name': row['name'],
                                'category': row['category'],
                                'total_sales': total_sales
                            })
                    except (TypeError, AttributeError):
                        pass
            
            # Sort by total sales and get top trending products
            trending_products.sort(key=lambda x: x.get('total_sales', 0), reverse=True)
            summary['trending_products'] = trending_products[:5]  # Top 5 trending products
    
    return summary

def get_product_details(product_id):
    """Get detailed information about a specific product."""
    product = Product.query.get(product_id)
    if not product:
        return None
        
    return product.to_dict()

def get_llm_insights(query, product_id=None):
    """Generate insights using LLM based on user query."""
    # Check if we should use Ollama or fallback to rule-based insights
    use_ollama = current_app.config.get('USE_OLLAMA', True)
    
    try:
        # Use the export data insights functionality which has built-in fallback
        export_data = ExportData()
        result = export_data.get_inventory_insights(query)
        return result['insights']
    except Exception as e:
        current_app.logger.error(f"Error using export data insights: {str(e)}")
        
        # If export data insights fails, fall back to the original implementation
        if use_ollama:
            try:
                # Use Ollama for generating insights
                return get_ollama_insights(query, product_id)
            except Exception as e:
                current_app.logger.error(f"Error using Ollama: {str(e)}")
                # Fallback to mock responses if Ollama fails
                return provide_fallback_response(query, product_id)
        else:
            return provide_fallback_response(query, product_id)

def provide_fallback_response(query, product_id=None):
    """Provide fallback responses when all other methods fail"""
    # Prepare context for mock responses
    inventory_summary = prepare_inventory_summary()
    
    # Add specific product details if provided
    product_details = None
    if product_id:
        product_details = get_product_details(product_id)
    
    # Mock responses based on query keywords
    query_lower = query.lower()
    
    if "low stock" in query_lower or "restock" in query_lower:
        if inventory_summary.get('low_stock_items', []):
            items = inventory_summary['low_stock_items'][:3]  # Get top 3 items
            items_text = ", ".join([f"{item['name']} ({item['current_stock']}/{item['reorder_level']})" for item in items])
            return f"I found {len(inventory_summary['low_stock_items'])} items that need restocking soon. The most critical ones are: {items_text}"
        else:
            return "Good news! You don't have any items that need restocking at the moment."
    
    if "trend" in query_lower or "trending" in query_lower or "popular" in query_lower:
        if inventory_summary.get('trending_products', []):
            trending_names = [item['name'] for item in inventory_summary['trending_products'][:5]]
            return f"Based on recent sales data, your top trending products are: {', '.join(trending_names)}"
        else:
            return "I don't have enough sales data to determine trending products at this time."
    
    # Default response
    return f"I can provide insights about your inventory. Try asking about low stock items, trending products, or specific categories."