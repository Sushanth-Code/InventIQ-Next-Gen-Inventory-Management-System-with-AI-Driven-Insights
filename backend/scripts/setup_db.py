import os
import sys
import pandas as pd
import json
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash
from datetime import datetime

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from config import Config

def setup_database():
    # Import Flask app and database from app package
    from app import create_app, db
    
    # Initialize Flask app
    app = create_app()
    app.app_context().push()
    
    # Import models after db initialization
    from app.models.user import User
    from app.models.inventory import Product
    
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Check if admin user exists
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            # Create admin user
            admin = User(
                username='admin',
                email='admin@inventiq.com',
                role='admin'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("Admin user created!")
        else:
            print("Admin user already exists!")

        
        print("Database tables created and admin user added!")
        
        try:
            # Load inventory data from CSV
            print("\nLoading inventory data...")
            # Read CSV with column names
            df = pd.read_csv('data/inventory_data.csv', names=['product_id', 'name', 'category', 'supplier', 'current_stock', 'reorder_level', 'purchase_price', 'selling_price', 'lead_time', 'historical_sales'])
            
            for _, row in df.iterrows():
                # Convert product ID from P0001 format to integer
                product_id = int(row['product_id'][1:])
                
                # Parse historical sales from string to dict
                historical_sales = eval(row['historical_sales']) if isinstance(row['historical_sales'], str) else {}
                
                product = Product(
                    id=product_id,
                    name=row['name'],
                    category=row['category'],
                    supplier=row['supplier'],
                    current_stock=int(row['current_stock']),
                    reorder_level=int(row['reorder_level']),
                    purchase_price=float(row['purchase_price']),
                    selling_price=float(row['selling_price']),
                    lead_time=float(row['lead_time']),
                    historical_sales=json.dumps(historical_sales)
                )
                db.session.add(product)
                print(f"Added product {product.id}: {product.name}")
            
            db.session.commit()
            print("\nInventory data loaded successfully!")
            
        except Exception as e:
            print(f"\nError loading inventory data: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    setup_database()
