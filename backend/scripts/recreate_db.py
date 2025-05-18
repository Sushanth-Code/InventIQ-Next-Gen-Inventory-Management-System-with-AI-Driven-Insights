import mysql.connector
import os
import sys
import pandas as pd
import json
from sqlalchemy import text

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize database
db = SQLAlchemy(app)

# Import models after db initialization
from app.models.user import User
from app.models.inventory import Product

def recreate_database():
    # Connect to MySQL
    connection = mysql.connector.connect(
        host='localhost',
        user='root',
        password='Sql@2025'
    )
    cursor = connection.cursor()

    # Drop database if it exists and create a new one
    cursor.execute("DROP DATABASE IF EXISTS inventiq_next_gen")
    cursor.execute("CREATE DATABASE inventiq_next_gen")
    print('Database dropped and recreated!')

    # Close MySQL connection
    cursor.close()
    connection.close()

    # Initialize tables
    with app.app_context():
        # Create database tables
        with db.engine.connect() as conn:
            conn.execute(text('USE inventiq_next_gen'))
        db.create_all()
        
        # Create admin user
        admin = User(
            username='admin',
            email='admin@inventiq.com',
            role='admin'
        )
        admin.set_password('admin123')
        
        # Add admin user to database
        db.session.add(admin)
        db.session.commit()
        
        print("Database recreated successfully!")
        print("Admin user created with:")
        print("Username: admin")
        print("Password: admin123")
        
        try:
            # Load inventory data from CSV
            print("\nLoading inventory data...")
            df = pd.read_csv('data/inventory_data.csv')
            products = df.to_dict('records')
            
            for product_data in products:
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
            print("\nInventory data loaded successfully!")
            
        except Exception as e:
            print(f"\nError loading inventory data: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    recreate_database()
