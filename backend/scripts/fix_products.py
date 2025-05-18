from sqlalchemy import create_engine, text
from config import Config

def fix_products():
    # Create SQLAlchemy engine
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    
    with engine.connect() as conn:
        # Drop existing products table
        conn.execute(text("DROP TABLE IF EXISTS transactions"))
        conn.execute(text("DROP TABLE IF EXISTS products"))
        
        # Create products table with correct schema
        conn.execute(text("""
            CREATE TABLE products (
                id VARCHAR(10) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL,
                supplier VARCHAR(100) NOT NULL,
                current_stock INT NOT NULL,
                reorder_level INT NOT NULL,
                purchase_price DECIMAL(10, 2) NOT NULL,
                selling_price DECIMAL(10, 2) NOT NULL,
                lead_time INT NOT NULL,
                historical_sales TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """))
        
        # Create transactions table with correct schema
        conn.execute(text("""
            CREATE TABLE transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id VARCHAR(10) NOT NULL,
                transaction_type VARCHAR(20) NOT NULL,
                quantity INT NOT NULL,
                transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        """))
        
        # Reload sample data
        print("\nLoading sample products...")
        with open('data/inventory_data.csv', 'r') as file:
            # Skip header
            next(file)
            
            for line in file:
                product_id, name, category, supplier, current_stock, reorder_level, purchase_price, selling_price, lead_time, historical_sales = line.strip().split(',', 9)
                
                # Insert product
                conn.execute(text("""
                    INSERT INTO products (id, name, category, supplier, current_stock, reorder_level, purchase_price, selling_price, lead_time, historical_sales)
                    VALUES (:id, :name, :category, :supplier, :current_stock, :reorder_level, :purchase_price, :selling_price, :lead_time, :historical_sales)
                """), {
                    'id': product_id,
                    'name': name,
                    'category': category,
                    'supplier': supplier,
                    'current_stock': int(current_stock),
                    'reorder_level': int(reorder_level),
                    'purchase_price': float(purchase_price),
                    'selling_price': float(selling_price),
                    'lead_time': int(float(lead_time)),
                    'historical_sales': historical_sales
                })
                print(f"Added product {product_id}: {name}")
        
        conn.commit()
        print("\nDatabase tables recreated and sample data loaded!")

if __name__ == '__main__':
    fix_products()
