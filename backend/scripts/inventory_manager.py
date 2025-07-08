import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
import pandas as pd

# Import config
from config import Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('inventory_manager.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class InventoryManager:
    """Main class for inventory management operations."""
    
    def __init__(self, config=None):
        """Initialize with configuration."""
        self.config = config or Config
        self.engine = create_engine(self.config.SQLALCHEMY_DATABASE_URI)
        self.db_name = 'inventiq_next_gen'
    
    def create_database(self):
        """Create the database if it doesn't exist."""
        try:
            # Create a connection without specifying the database
            temp_engine = create_engine(
                f"{self.config.SQLALCHEMY_DATABASE_URI.rsplit('/', 1)[0]}/mysql"
            )
            with temp_engine.connect() as conn:
                conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {self.db_name}"))
                logger.info(f"Database '{self.db_name}' is ready")
            return True
        except SQLAlchemyError as e:
            logger.error(f"Error creating database: {e}")
            return False
    
    def init_database(self, drop_existing=False):
        """Initialize the database schema."""
        try:
            with self.engine.connect() as conn:
                conn.execute(text(f"USE {self.db_name}"))
                
                if drop_existing:
                    logger.info("Dropping existing tables...")
                    conn.execute(text("DROP TABLE IF EXISTS transactions"))
                    conn.execute(text("DROP TABLE IF EXISTS products"))
                    conn.execute(text("DROP TABLE IF EXISTS users"))
                
                # Create users table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(64) UNIQUE NOT NULL,
                        email VARCHAR(120) UNIQUE NOT NULL,
                        password_hash VARCHAR(512) NOT NULL,
                        role VARCHAR(20) NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_login DATETIME NULL
                    )
                
                # Create products table
                CREATE TABLE IF NOT EXISTS products (
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
                
                # Create transactions table
                CREATE TABLE IF NOT EXISTS transactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id VARCHAR(10) NOT NULL,
                    transaction_type ENUM('purchase', 'sale') NOT NULL,
                    quantity INT NOT NULL,
                    unit_price DECIMAL(10, 2) NOT NULL,
                    total_amount DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
                    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    user_id INT,
                    notes TEXT,
                    FOREIGN KEY (product_id) REFERENCES products(id),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
                
                # Create inventory view
                CREATE OR REPLACE VIEW vw_inventory AS
                SELECT 
                    p.id,
                    p.name,
                    p.category,
                    p.supplier,
                    p.current_stock,
                    p.reorder_level,
                    p.purchase_price,
                    p.selling_price,
                    p.lead_time,
                    p.current_stock * p.selling_price AS inventory_value,
                    (SELECT COUNT(*) FROM transactions t WHERE t.product_id = p.id) AS transaction_count,
                    (SELECT MAX(transaction_date) FROM transactions t WHERE t.product_id = p.id) AS last_transaction_date
                FROM products p
                ORDER BY p.name
                """))
                
                logger.info("Database schema initialized successfully")
                return True
                
        except SQLAlchemyError as e:
            logger.error(f"Error initializing database: {e}")
            return False
    
    def create_admin_user(self, username: str, email: str, password: str) -> bool:
        """Create an admin user."""
        try:
            # In a real application, hash the password properly
            from werkzeug.security import generate_password_hash
            password_hash = generate_password_hash(password)
            
            with self.engine.connect() as conn:
                conn.execute(
                    text("""
                    INSERT INTO users (username, email, password_hash, role)
                    VALUES (:username, :email, :password_hash, 'admin')
                    ON DUPLICATE KEY UPDATE
                        email = VALUES(email),
                        password_hash = VALUES(password_hash),
                        role = 'admin'
                    """),
                    {
                        'username': username,
                        'email': email,
                        'password_hash': password_hash
                    }
                )
                conn.commit()
                logger.info(f"Admin user '{username}' created/updated successfully")
                return True
                
        except SQLAlchemyError as e:
            logger.error(f"Error creating admin user: {e}")
            return False
    
    def import_products_from_csv(self, filepath: str) -> bool:
        """Import products from a CSV file."""
        try:
            df = pd.read_csv(filepath)
            
            # Ensure required columns exist
            required_columns = ['id', 'name', 'category', 'supplier', 'current_stock', 
                              'reorder_level', 'purchase_price', 'selling_price', 'lead_time']
            
            if not all(col in df.columns for col in required_columns):
                logger.error("CSV file is missing required columns")
                return False
            
            # Convert dataframe to list of dictionaries
            products = df.to_dict('records')
            
            with self.engine.connect() as conn:
                # Add historical_sales as empty JSON array if not present
                for product in products:
                    if 'historical_sales' not in product:
                        product['historical_sales'] = '[]'
                    
                    conn.execute(
                        text("""
                        INSERT INTO products 
                        (id, name, category, supplier, current_stock, reorder_level, 
                         purchase_price, selling_price, lead_time, historical_sales)
                        VALUES 
                        (:id, :name, :category, :supplier, :current_stock, :reorder_level,
                         :purchase_price, :selling_price, :lead_time, :historical_sales)
                        ON DUPLICATE KEY UPDATE
                            name = VALUES(name),
                            category = VALUES(category),
                            supplier = VALUES(supplier),
                            current_stock = VALUES(current_stock),
                            reorder_level = VALUES(reorder_level),
                            purchase_price = VALUES(purchase_price),
                            selling_price = VALUES(selling_price),
                            lead_time = VALUES(lead_time)
                        """),
                        product
                    )
                
                conn.commit()
                logger.info(f"Successfully imported {len(products)} products")
                return True
                
        except Exception as e:
            logger.error(f"Error importing products: {e}")
            return False
    
    def verify_data_integrity(self) -> Dict[str, Any]:
        """Verify the integrity of the database."""
        result = {
            'status': 'success',
            'checks': {}
        }
        
        try:
            with self.engine.connect() as conn:
                # Check if tables exist
                inspector = inspect(self.engine)
                tables = inspector.get_table_names()
                
                for table in ['users', 'products', 'transactions']:
                    result['checks'][f'table_{table}_exists'] = table in tables
                
                # Check if admin user exists
                admin_count = conn.execute(
                    text("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
                ).scalar()
                result['checks']['admin_user_exists'] = admin_count > 0
                
                # Check product count
                product_count = conn.execute(
                    text("SELECT COUNT(*) as count FROM products")
                ).scalar()
                result['checks']['products_exist'] = product_count > 0
                
                # Check for any failed checks
                if not all(result['checks'].values()):
                    result['status'] = 'warning'
                    result['message'] = 'Some checks failed. See details in checks.'
                else:
                    result['message'] = 'All checks passed successfully.'
                
                return result
                
        except Exception as e:
            result['status'] = 'error'
            result['message'] = f'Error during data verification: {str(e)}'
            return result

# Command-line interface
def main():
    """Command-line interface for the inventory manager."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Inventory Management System')
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # Init command
    init_parser = subparsers.add_parser('init', help='Initialize the database')
    init_parser.add_argument('--drop-existing', action='store_true', help='Drop existing tables')
    
    # Create admin command
    admin_parser = subparsers.add_parser('create-admin', help='Create an admin user')
    admin_parser.add_argument('--username', required=True, help='Admin username')
    admin_parser.add_argument('--email', required=True, help='Admin email')
    admin_parser.add_argument('--password', required=True, help='Admin password')
    
    # Import products command
    import_parser = subparsers.add_parser('import-products', help='Import products from CSV')
    import_parser.add_argument('filepath', help='Path to CSV file')
    
    # Verify command
    verify_parser = subparsers.add_parser('verify', help='Verify data integrity')
    
    args = parser.parse_args()
    
    manager = InventoryManager()
    
    if args.command == 'init':
        print("Initializing database...")
        if manager.create_database() and manager.init_database(drop_existing=args.drop_existing):
            print("Database initialized successfully")
        else:
            print("Failed to initialize database")
    
    elif args.command == 'create-admin':
        print(f"Creating admin user '{args.username}'...")
        if manager.create_admin_user(args.username, args.email, args.password):
            print("Admin user created successfully")
        else:
            print("Failed to create admin user")
    
    elif args.command == 'import-products':
        print(f"Importing products from {args.filepath}...")
        if manager.import_products_from_csv(args.filepath):
            print("Products imported successfully")
        else:
            print("Failed to import products")
    
    elif args.command == 'verify':
        print("Verifying data integrity...")
        result = manager.verify_data_integrity()
        print(f"Status: {result['status']}")
        print(f"Message: {result['message']}")
        print("\nChecks:")
        for check, status in result['checks'].items():
            print(f"- {check}: {'✓' if status else '✗'}")
    
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
