from sqlalchemy import create_engine, text
from config import Config
import json

def fix_historical_sales():
    # Create SQLAlchemy engine
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    
    with engine.connect() as conn:
        # Get all products
        result = conn.execute(text("SELECT id, historical_sales FROM products"))
        products = result.fetchall()
        
        # Fix each product's historical_sales
        for product in products:
            try:
                # Try to parse existing historical_sales
                json.loads(product[1])
            except (json.JSONDecodeError, TypeError):
                # If invalid or None, set to empty dict
                conn.execute(
                    text("UPDATE products SET historical_sales = :sales WHERE id = :id"),
                    {"sales": '{}', "id": product[0]}
                )
        
        conn.commit()
        print("Fixed historical_sales for all products!")

if __name__ == '__main__':
    fix_historical_sales()
