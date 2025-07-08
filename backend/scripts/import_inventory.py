import os
import json
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
import random

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Sql@2025',
    'database': 'inventiq_next_gen',
    'port': 3306
}

def create_database():
    # Connect without database specified
    temp_config = DB_CONFIG.copy()
    temp_config.pop('database', None)
    engine = create_engine(f"mysql+mysqlconnector://{temp_config['user']}:{temp_config['password']}@{temp_config['host']}:{temp_config['port']}")
    
    # Create database if not exists
    with engine.connect() as conn:
        conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
        conn.execute(text(f"USE {DB_CONFIG['database']}"))
    
    return create_engine(f"mysql+mysqlconnector://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")

def create_tables(engine):
    with engine.connect() as conn:
        # Create categories table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            category_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_category (name)
        )
        """)
        
        # Create suppliers table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS suppliers (
            supplier_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            contact_person VARCHAR(100),
            email VARCHAR(100),
            phone VARCHAR(20),
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_supplier (name)
        )
        """)
        
        # Create products table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            product_id VARCHAR(10) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category_id INT,
            supplier_id INT,
            current_stock INT NOT NULL DEFAULT 0,
            reorder_level INT NOT NULL DEFAULT 0,
            purchase_price DECIMAL(10, 2) NOT NULL,
            selling_price DECIMAL(10, 2) NOT NULL,
            lead_time INT COMMENT 'Lead time in days',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE SET NULL
        )
        """)
        
        # Create sales_history table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS sales_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id VARCHAR(10),
            sale_date DATE NOT NULL,
            quantity_sold INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
            INDEX idx_sale_date (sale_date)
        )
        """)
        
        # Create inventory_transactions table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            transaction_id INT AUTO_INCREMENT PRIMARY KEY,
            product_id VARCHAR(10),
            transaction_type ENUM('PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN') NOT NULL,
            quantity INT NOT NULL,
            reference_id VARCHAR(100),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
        )
        """)

def import_data(engine):
    # Read the CSV file
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'inventory_data.csv')
    df = pd.read_csv(csv_path)
    
    with engine.connect() as conn:
        # Insert categories
        categories = df[['category']].drop_duplicates()
        categories.to_sql('temp_categories', conn, if_exists='replace', index=False)
        conn.execute("""
            INSERT IGNORE INTO categories (name)
            SELECT category FROM temp_categories
        """)
        
        # Insert suppliers
        suppliers = df[['supplier']].drop_duplicates()
        suppliers.to_sql('temp_suppliers', conn, if_exists='replace', index=False)
        
        # Add some contact info for suppliers
        conn.execute("""
            INSERT IGNORE INTO suppliers (name, contact_person, email, phone)
            SELECT 
                supplier as name,
                CONCAT('Manager ', @n := @n + 1) as contact_person,
                CONCAT(REPLACE(LOWER(supplier), ' ', ''), '@example.com') as email,
                CONCAT('+1', LPAD(FLOOR(1000000000 + RAND() * 9000000000), 10, '0')) as phone
            FROM temp_suppliers, (SELECT @n := 0) as n
        """)
        
        # Get category and supplier mappings
        categories_map = pd.read_sql("SELECT category_id, name FROM categories", conn).set_index('name')['category_id'].to_dict()
        suppliers_map = pd.read_sql("SELECT supplier_id, name FROM suppliers", conn).set_index('name')['supplier_id'].to_dict()
        
        # Prepare products data
        products = df[['product_id', 'name', 'category', 'supplier', 'current_stock', 
                      'reorder_level', 'purchase_price', 'selling_price', 'lead_time']].copy()
        
        # Map category and supplier names to IDs
        products['category_id'] = products['category'].map(categories_map)
        products['supplier_id'] = products['supplier'].map(suppliers_map)
        
        # Select and rename columns for products table
        products = products[['product_id', 'name', 'category_id', 'supplier_id', 
                           'current_stock', 'reorder_level', 'purchase_price', 
                           'selling_price', 'lead_time']]
        
        # Insert products
        products.to_sql('products', conn, if_exists='append', index=False)
        
        # Generate sales history from historical_sales
        sales_data = []
        today = datetime.now()
        
        for _, row in df.iterrows():
            try:
                historical_sales = eval(row['historical_sales'])  # Be careful with eval in production
                for day, quantity in historical_sales.items():
                    if quantity > 0:  # Only record sales with quantity > 0
                        sale_date = today - timedelta(days=int(day.split('-')[1]))
                        sales_data.append({
                            'product_id': row['product_id'],
                            'sale_date': sale_date.strftime('%Y-%m-%d'),
                            'quantity_sold': quantity
                        })
            except:
                continue
        
        # Insert sales history
        if sales_data:
            sales_df = pd.DataFrame(sales_data)
            sales_df.to_sql('sales_history', conn, if_exists='append', index=False)
        
        # Generate some inventory transactions
        transactions = []
        for _, row in df.iterrows():
            # Initial stock transaction
            transactions.append({
                'product_id': row['product_id'],
                'transaction_type': 'PURCHASE',
                'quantity': row['current_stock'],
                'reference_id': f'INIT-{row["product_id"]}',
                'notes': 'Initial stock import'
            })
            
            # Generate some purchase orders
            if random.random() > 0.7:  # 30% chance of having a purchase order
                po_quantity = random.randint(10, 50)
                transactions.append({
                    'product_id': row['product_id'],
                    'transaction_type': 'PURCHASE',
                    'quantity': po_quantity,
                    'reference_id': f'PO-{row["product_id"]}-{random.randint(1000, 9999)}',
                    'notes': 'Regular purchase order'
                })
        
        # Insert transactions
        if transactions:
            transactions_df = pd.DataFrame(transactions)
            transactions_df.to_sql('inventory_transactions', conn, if_exists='append', index=False)
        
        # Clean up temporary tables
        for table in ['temp_categories', 'temp_suppliers']:
            try:
                conn.execute(f"DROP TABLE IF EXISTS {table}")
            except:
                pass

def main():
    try:
        print("Starting database import...")
        
        # Create database and get engine
        engine = create_database()
        print("Database created/connected")
        
        # Create tables
        create_tables(engine)
        print("Tables created")
        
        # Import data
        import_data(engine)
        print("Data imported successfully!")
        
        # Print summary
        with engine.connect() as conn:
            tables = ['categories', 'suppliers', 'products', 'sales_history', 'inventory_transactions']
            for table in tables:
                count = conn.execute(text(f"SELECT COUNT(*) as count FROM {table}")).fetchone()[0]
                print(f"- {table}: {count} records")
        
        print("\nImport completed successfully!")
        
    except Exception as e:
        print(f"Error during import: {str(e)}")
        raise

if __name__ == "__main__":
    main()
