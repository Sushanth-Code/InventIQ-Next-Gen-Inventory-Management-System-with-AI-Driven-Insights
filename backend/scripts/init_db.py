from sqlalchemy import create_engine, text
from config import Config

def init_database():
    # Create SQLAlchemy engine
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    
    with engine.connect() as conn:
        # Create database if it doesn't exist
        conn.execute(text("CREATE DATABASE IF NOT EXISTS inventiq_next_gen"))
        conn.execute(text("USE inventiq_next_gen"))
        
        # Drop existing tables if they exist
        conn.execute(text("DROP TABLE IF EXISTS transactions"))
        conn.execute(text("DROP TABLE IF EXISTS products"))
        conn.execute(text("DROP TABLE IF EXISTS users"))
        
        # Create users table
        conn.execute(text("""
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(64) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                password_hash VARCHAR(512) NOT NULL,
                role VARCHAR(20) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME NULL
            )
        """))
        
        # Create products table
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
        
        # Create transactions table
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
        
        conn.commit()
        print("Database and tables created successfully!")

if __name__ == '__main__':
    init_database()
