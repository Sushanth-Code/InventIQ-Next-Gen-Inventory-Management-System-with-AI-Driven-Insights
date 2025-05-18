import os
import sys
import pandas as pd
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from werkzeug.security import generate_password_hash
from datetime import datetime

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from config import Config

def setup_database():
    # Create SQLAlchemy engine
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Check if admin user exists
        result = session.execute(text("SELECT * FROM users WHERE username = 'admin'"))
        admin_exists = result.fetchone() is not None
        
        if not admin_exists:
            # Create admin user
            password_hash = generate_password_hash('admin123', method='scrypt')
            session.execute(text("""
                INSERT INTO users (username, email, password_hash, role, created_at)
                VALUES (:username, :email, :password_hash, :role, :created_at)
            """), {
                'username': 'admin',
                'email': 'admin@inventiq.com',
                'password_hash': password_hash,
                'role': 'admin',
                'created_at': datetime.now()
            })
            session.commit()
            print("Admin user created!")
        else:
            print("Admin user already exists!")
        
        # Load inventory data
        print("\nLoading inventory data...")
        df = pd.read_csv('data/inventory_data.csv')
        df = df.rename(columns={'product_id': 'product_id'})  # Keep original column names
        
        for _, row in df.iterrows():
            # Convert product ID from P0001 format to integer
            product_id = int(row['product_id'][1:])
            
            # Parse historical sales from string to dict
            historical_sales = eval(row['historical_sales']) if isinstance(row['historical_sales'], str) else {}
            
            # Check if product exists
            result = session.execute(text("SELECT id FROM products WHERE id = :id"), {'id': product_id})
            product_exists = result.fetchone() is not None
            
            if not product_exists:
                # Insert product
                session.execute(text("""
                    INSERT INTO products (id, name, category, supplier, current_stock, reorder_level, purchase_price, selling_price, lead_time, historical_sales)
                    VALUES (:id, :name, :category, :supplier, :current_stock, :reorder_level, :purchase_price, :selling_price, :lead_time, :historical_sales)
                """), {
                    'id': product_id,
                    'name': row['name'],
                    'category': row['category'],
                    'supplier': row['supplier'],
                    'current_stock': int(row['current_stock']),
                    'reorder_level': int(row['reorder_level']),
                    'purchase_price': float(row['purchase_price']),
                    'selling_price': float(row['selling_price']),
                    'lead_time': float(row['lead_time']),
                    'historical_sales': json.dumps(historical_sales)
                })
                print(f"Added product {product_id}: {row['name']}")
        
        session.commit()
        print("\nInventory data loaded successfully!")
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        session.rollback()
    finally:
        session.close()

if __name__ == '__main__':
    setup_database()
