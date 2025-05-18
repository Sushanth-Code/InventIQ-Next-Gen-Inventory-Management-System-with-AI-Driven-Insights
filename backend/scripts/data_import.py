import pandas as pd
import json
import mysql.connector
from mysql.connector import Error

def import_data_to_mysql(csv_file, db_config):
    """Import data from CSV to MySQL database."""
    try:
        # Read CSV file
        df = pd.read_csv(csv_file)
        print(f"Read {len(df)} records from CSV")
        
        # Connect to MySQL
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # Create tables if they don't exist
        create_tables(cursor)
        
        # Insert products
        for _, row in df.iterrows():
            # Convert historical sales to proper JSON
            historical_sales = json.dumps(eval(row['historical_sales']))
            
            # Insert product
            insert_query = """
            INSERT INTO products (id, name, category, supplier, current_stock, reorder_level, 
                            purchase_price, selling_price, lead_time, historical_sales)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                row['product_id'],
                row['name'],
                row['category'],
                row['supplier'],
                int(row['current_stock']),
                int(row['reorder_level']),
                float(row['purchase_price']),
                float(row['selling_price']),
                int(row['lead_time']),
                historical_sales
            )
            
            cursor.execute(insert_query, values)
        
        # Create admin user
        create_admin_user(cursor)
        
        # Commit changes
        conn.commit()
        print(f"Successfully imported {len(df)} products to MySQL")
        
    except Error as e:
        print(f"Error: {e}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
            print("MySQL connection closed")

def create_tables(cursor):
    """Create necessary tables in the database."""
    # Create products table
    create_products_table = """
    CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        supplier VARCHAR(100) NOT NULL,
        current_stock INT NOT NULL,
        reorder_level INT NOT NULL,
        purchase_price FLOAT NOT NULL,
        selling_price FLOAT NOT NULL,
        lead_time INT NOT NULL,
        historical_sales TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
    """
    cursor.execute(create_products_table)
    
    # Create transactions table
    create_transactions_table = """
    CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(10) NOT NULL,
        transaction_type VARCHAR(20) NOT NULL,
        quantity INT NOT NULL,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
    """
    cursor.execute(create_transactions_table)
    
    # Create users table
    create_users_table = """
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        email VARCHAR(120) UNIQUE NOT NULL,
        password_hash VARCHAR(256) NOT NULL,
        role VARCHAR(20) DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
    cursor.execute(create_users_table)

def create_admin_user(cursor):
    """Create an admin user for initial login."""
    from werkzeug.security import generate_password_hash
    
    # Check if admin exists
    check_query = "SELECT id FROM users WHERE username = 'admin'"
    cursor.execute(check_query)
    if cursor.fetchone() is None:
        # Create admin user
        password_hash = generate_password_hash('admin123')
        insert_query = """
        INSERT INTO users (username, email, password_hash, role)
        VALUES (%s, %s, %s, %s)
        """
        values = ('admin', 'admin@example.com', password_hash, 'admin')
        cursor.execute(insert_query, values)
        print("Admin user created. Username: admin, Password: admin123")

if __name__ == "__main__":
    # Database configuration
    db_config = {
        'host': 'localhost',
        'user': 'inventiq_user',
        'password': 'your_password',
        'database': 'inventiq'
    }
    
    # Import data
    import_data_to_mysql('data/inventory_data.csv', db_config)