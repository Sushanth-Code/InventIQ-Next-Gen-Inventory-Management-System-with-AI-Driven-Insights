from flask import current_app
import pandas as pd
import os
import csv
from datetime import datetime
import json
from .ollama_service import OllamaService

class ExportData:
    """Class for exporting inventory data to CSV and generating insights"""
    
    @staticmethod
    def export_inventory_data():
        """Export current inventory data to CSV"""
        from app.models.inventory import Product
        
        # Get all products
        products = Product.query.all()
        
        # Create export directory if it doesn't exist
        export_dir = os.path.join(current_app.root_path, 'exports')
        os.makedirs(export_dir, exist_ok=True)
        
        # Generate timestamp for filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        csv_path = os.path.join(export_dir, f'inventory_export_{timestamp}.csv')
        
        # Write to CSV
        with open(csv_path, 'w', newline='') as csvfile:
            fieldnames = ['id', 'name', 'category', 'supplier', 'current_stock', 
                          'reorder_level', 'purchase_price', 'selling_price', 'stock_status']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for product in products:
                # Determine stock status
                if product.current_stock <= 0:
                    stock_status = 'OUT_OF_STOCK'
                elif product.current_stock <= product.reorder_level:
                    stock_status = 'LOW_STOCK'
                else:
                    stock_status = 'IN_STOCK'
                    
                writer.writerow({
                    'id': product.id,
                    'name': product.name,
                    'category': product.category,
                    'supplier': product.supplier,
                    'current_stock': product.current_stock,
                    'reorder_level': product.reorder_level,
                    'purchase_price': product.purchase_price,
                    'selling_price': product.selling_price,
                    'stock_status': stock_status
                })
        
        return csv_path
    
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
        
        # Check for greetings and general conversation first
        query_lower = query.lower()
        
        # Handle greetings
        greeting_words = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening"]
        if any(word == query_lower for word in greeting_words) or any(word in query_lower.split() for word in greeting_words):
            return f"Hello! I'm your InventIQ Smart Assistant. I can help you with inventory insights, stock levels, category analysis, and more. How can I assist you today?"
        
        # Handle thank you and appreciation
        if any(word in query_lower for word in ["thank", "thanks", "appreciate", "grateful"]):
            return "You're welcome! I'm here to help with any inventory questions you might have."
        
        # Handle questions about the assistant
        if "who are you" in query_lower or "what can you do" in query_lower or "help me" in query_lower:
            return "I'm the InventIQ Smart Assistant, designed to help you manage your inventory efficiently. I can provide insights about low stock items, trending products, category analysis, and overall inventory health. Just ask me what you'd like to know!"
        
        # Handle questions about InventIQ
        if "inventiq" in query_lower and ("what is" in query_lower or "about" in query_lower):
            return "InventIQ is a next-generation smart inventory management system developed by a team of AIML experts. It features AI-powered insights, predictive analytics for demand forecasting, comprehensive inventory tracking, smart notifications, and a beautiful responsive UI. The system helps businesses optimize their inventory operations using cutting-edge AI technology."
        
        # Generate insights based on the query
        if 'low stock' in query_lower or 'running low' in query_lower:
            if len(low_stock_items) > 0:
                insights = f"Found {len(low_stock_items)} products with low stock:\n\n"
                for _, item in low_stock_items.iterrows():
                    insights += f"- {item['name']} (ID: {item['id']}): Current stock {item['current_stock']}, Reorder level {item['reorder_level']}\n"
            else:
                insights = "No products are currently running low on stock."
                
        elif 'critical' in query_lower or 'out of stock' in query_lower:
            if len(out_of_stock_items) > 0:
                insights = f"Found {len(out_of_stock_items)} products that are out of stock:\n\n"
                for _, item in out_of_stock_items.iterrows():
                    insights += f"- {item['name']} (ID: {item['id']})\n"
            else:
                insights = "No products are currently out of stock."
                
        elif 'categories' in query_lower or 'attention' in query_lower:
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
        
        # Handle general inventory questions
        elif "inventory" in query_lower or "stock" in query_lower or "products" in query_lower:
            insights = f"Your inventory currently has {len(df)} products. {len(low_stock_items)} items are running low on stock, and {len(out_of_stock_items)} items are out of stock."
        
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
