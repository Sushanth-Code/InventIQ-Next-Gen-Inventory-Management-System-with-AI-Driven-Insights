from datetime import datetime
import pandas as pd
from sqlalchemy import text
from app.extensions import db
from app.models.inventory import Product, Transaction
from app.services.ollama_service import OllamaService

class ExportData:
    @staticmethod
    def export_inventory_data():
        """Export current inventory data to CSV"""
        # Get all products and convert to DataFrame
        products = Product.query.all()
        
        # Convert to list of dictionaries
        products_data = [{
            'id': p.id,
            'name': p.name,
            'category': p.category,
            'supplier': p.supplier,
            'current_stock': p.current_stock,
            'reorder_level': p.reorder_level,
            'purchase_price': p.purchase_price,
            'selling_price': p.selling_price,
            'lead_time': p.lead_time,
            'stock_status': 'OUT_OF_STOCK' if p.current_stock <= 0 
                           else 'LOW_STOCK' if p.current_stock <= p.reorder_level 
                           else 'NORMAL'
        } for p in products]
        
        # Convert to DataFrame
        df = pd.DataFrame(products_data)
        
        # Add timestamp to filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"inventory_export_{timestamp}.csv"
        
        # Create exports directory if it doesn't exist
        import os
        exports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'exports')
        os.makedirs(exports_dir, exist_ok=True)
        
        # Save to CSV
        filepath = os.path.join(exports_dir, filename)
        df.to_csv(filepath, index=False)
        return filepath

    @staticmethod
    def get_inventory_insights(query=None):
        """Get AI-powered insights about inventory using Ollama"""
        # Export latest data
        csv_path = ExportData.export_inventory_data()
        
        # Read the CSV data
        df = pd.read_csv(csv_path)
        
        # Prepare inventory summary
        summary = {
            'total_products': len(df),
            'out_of_stock': len(df[df['stock_status'] == 'OUT_OF_STOCK']),
            'low_stock': len(df[df['stock_status'] == 'LOW_STOCK']),
            'categories': df['category'].unique().tolist(),
            'total_value': (df['current_stock'] * df['purchase_price']).sum()
        }
        
        # Prepare context for Ollama
        context = f"""
        Current Inventory Summary:
        - Total Products: {summary['total_products']}
        - Out of Stock Items: {summary['out_of_stock']}
        - Low Stock Items: {summary['low_stock']}
        - Total Inventory Value: ${summary['total_value']:,.2f}
        - Product Categories: {', '.join(summary['categories'])}
        """
        
        # If no specific query, provide general insights
        if not query:
            query = """Based on the inventory data, provide key insights about:
            1. Critical stock situations
            2. Categories that need attention
            3. Overall inventory health
            Keep the response concise and actionable."""
        
        # Check if Ollama is available without raising exceptions
        ollama_available = False
        try:
            # Quick health check without logging errors
            import requests
            from flask import current_app
            base_url = current_app.config.get('OLLAMA_BASE_URL', 'http://localhost:11434')
            health_response = requests.get(f"{base_url}/api/health", timeout=2)
            ollama_available = health_response.status_code == 200
        except:
            # Silently handle connection issues
            ollama_available = False
        
        if ollama_available:
            try:
                # Try to get insights from Ollama
                ollama_service = OllamaService()
                insights = ollama_service.generate(
                    prompt=f"{context}\n\nQuery: {query}",
                    system_prompt="You are an inventory management expert. Analyze the data and provide specific, actionable insights."
                )
            except Exception:
                # Fallback to rule-based insights if Ollama generation fails
                insights = ExportData.generate_rule_based_insights(df, query)
        else:
            # Use rule-based insights without attempting Ollama connection
            insights = ExportData.generate_rule_based_insights(df, query)
        
        return {
            'insights': insights,
            'summary': summary,
            'export_path': csv_path
        }
        
    @staticmethod
    def generate_rule_based_insights(df, query):
        """Generate rule-based insights when Ollama is not available"""
        # Get low stock items
        low_stock_items = df[df['stock_status'] == 'LOW_STOCK']
        out_of_stock_items = df[df['stock_status'] == 'OUT_OF_STOCK']
        
        # Get category statistics
        category_stats = df.groupby('category').agg({
            'id': 'count',
            'current_stock': 'sum',
            'purchase_price': lambda x: (df.loc[x.index, 'current_stock'] * x).sum()
        }).rename(columns={'id': 'count', 'purchase_price': 'total_value'})
        
        # Generate insights based on the query
        if 'low stock' in query.lower() or 'running low' in query.lower():
            if len(low_stock_items) > 0:
                insights = f"Found {len(low_stock_items)} products with low stock:\n\n"
                for _, item in low_stock_items.iterrows():
                    insights += f"- {item['name']} (ID: {item['id']}): Current stock {item['current_stock']}, Reorder level {item['reorder_level']}\n"
            else:
                insights = "No products are currently running low on stock."
                
        elif 'critical' in query.lower() or 'out of stock' in query.lower():
            if len(out_of_stock_items) > 0:
                insights = f"Found {len(out_of_stock_items)} products that are out of stock:\n\n"
                for _, item in out_of_stock_items.iterrows():
                    insights += f"- {item['name']} (ID: {item['id']})\n"
            else:
                insights = "No products are currently out of stock."
                
        elif 'categories' in query.lower() or 'attention' in query.lower():
            # Identify categories with the most low stock items
            category_low_stock = df[df['stock_status'] == 'LOW_STOCK'].groupby('category').size().reset_index(name='low_stock_count')
            if not category_low_stock.empty:
                top_category = category_low_stock.sort_values('low_stock_count', ascending=False).iloc[0]
                insights = f"The category requiring most attention is {top_category['category']} with {top_category['low_stock_count']} low stock items.\n\n"
                insights += "Category statistics:\n"
                for category, stats in category_stats.iterrows():
                    insights += f"- {category}: {stats['count']} products, Total stock: {stats['current_stock']}, Value: ${stats['total_value']:,.2f}\n"
            else:
                insights = "No categories currently need attention. All stock levels are normal."
        else:
            # General insights
            insights = f"Inventory Health Summary:\n\n"
            insights += f"- Total Products: {len(df)}\n"
            insights += f"- Products Out of Stock: {len(out_of_stock_items)}\n"
            insights += f"- Products with Low Stock: {len(low_stock_items)}\n\n"
            
            if len(low_stock_items) > 0:
                insights += "Critical Items Requiring Attention:\n"
                for _, item in low_stock_items.head(5).iterrows():
                    insights += f"- {item['name']} (Current: {item['current_stock']}, Reorder: {item['reorder_level']})\n"
                if len(low_stock_items) > 5:
                    insights += f"...and {len(low_stock_items) - 5} more items\n"
            
            # Add category information
            insights += "\nCategory Overview:\n"
            for category, stats in category_stats.iterrows():
                insights += f"- {category}: {stats['count']} products, Value: ${stats['total_value']:,.2f}\n"
        
        return insights
