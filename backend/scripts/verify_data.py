from sqlalchemy import create_engine, text
from config import Config

def verify_data():
    # Create SQLAlchemy engine
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    
    # Create a connection
    with engine.connect() as conn:
        # Check admin user
        result = conn.execute(text("SELECT username, email, role FROM users"))
        print("\nUsers in database:")
        for row in result:
            print(f"Username: {row[0]}, Email: {row[1]}, Role: {row[2]}")
            
        # Check product count
        result = conn.execute(text("SELECT COUNT(*) FROM products"))
        product_count = result.scalar()
        print(f"\nTotal products in database: {product_count}")
        
        # Sample some products
        result = conn.execute(text("""
            SELECT id, name, category, current_stock, selling_price 
            FROM products 
            LIMIT 5
        """))
        print("\nSample products:")
        for row in result:
            print(f"ID: {row[0]}, Name: {row[1]}, Category: {row[2]}, Stock: {row[3]}, Price: ${row[4]:.2f}")

if __name__ == '__main__':
    verify_data()
