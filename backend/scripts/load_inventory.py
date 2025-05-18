import pandas as pd
import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import json

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from config import Config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize database
db = SQLAlchemy(app)

# Import models after db initialization
from app.models.inventory import Product

def load_inventory_data():
    with app.app_context():
        try:
            # Read CSV file
            df = pd.read_csv('data/inventory_data.csv')
            
            # Get existing products to preserve them
            existing_products = {p.id: p for p in Product.query.all()}
            
            # Convert DataFrame to list of dictionaries
            products = df.to_dict('records')
            
            for product_data in products:
                # Skip if product already exists
                if product_data['id'] in existing_products:
                    print(f"Product {product_data['id']} already exists, skipping...")
                    continue
                
                # Create new product
                product = Product(
                    id=product_data['id'],
                    name=product_data['name'],
                    category=product_data['category'],
                    supplier=product_data['supplier'],
                    current_stock=int(product_data['current_stock']),
                    reorder_level=int(product_data['reorder_level']),
                    purchase_price=float(product_data['purchase_price']),
                    selling_price=float(product_data['selling_price']),
                    lead_time=float(product_data['lead_time']),
                    historical_sales=json.dumps(product_data.get('historical_sales', {}))
                )
                db.session.add(product)
                print(f"Added product {product.id}: {product.name}")
            
            db.session.commit()
            print("Inventory data loaded successfully!")
            
        except Exception as e:
            print(f"Error loading inventory data: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    load_inventory_data()
