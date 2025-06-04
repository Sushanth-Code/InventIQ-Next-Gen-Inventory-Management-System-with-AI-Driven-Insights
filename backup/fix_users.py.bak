from sqlalchemy import create_engine, text
from config import Config
from werkzeug.security import generate_password_hash
from datetime import datetime

def fix_users():
    # Create SQLAlchemy engine
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    
    with engine.connect() as conn:
        # Drop existing users table
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
        
        # Add sample users
        users = [
            ('admin', 'admin@inventiq.com', 'admin123', 'admin'),
            ('staff', 'staff@inventiq.com', 'staff123', 'staff'),
            ('manager', 'manager@inventiq.com', 'manager123', 'manager')
        ]
        
        for username, email, password, role in users:
            password_hash = generate_password_hash(password)
            conn.execute(
                text("INSERT INTO users (username, email, password_hash, role, last_login) VALUES (:username, :email, :password_hash, :role, :last_login)"),
                {
                    "username": username,
                    "email": email,
                    "password_hash": password_hash,
                    "role": role,
                    "last_login": None
                }
            )
        
        conn.commit()
        print("Database users table recreated and sample users loaded!")
        print("\nSample Users:")
        print("1. Admin User:")
        print("   Username: admin")
        print("   Password: admin123")
        print("   Role: admin")
        print("\n2. Staff User:")
        print("   Username: staff")
        print("   Password: staff123")
        print("   Role: staff")
        print("\n3. Manager User:")
        print("   Username: manager")
        print("   Password: manager123")
        print("   Role: manager")

if __name__ == '__main__':
    fix_users()
