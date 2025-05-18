from sqlalchemy import create_engine, text
from config import Config

def fix_product_sales():
    # Create SQLAlchemy engine
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    
    with engine.connect() as conn:
        # Update all products to have valid historical_sales
        conn.execute(text("""
            UPDATE products 
            SET historical_sales = '{}' 
            WHERE historical_sales IS NULL 
            OR historical_sales = '' 
            OR historical_sales = 'null'
        """))
        conn.commit()
        print("Fixed historical_sales for all products!")

if __name__ == '__main__':
    fix_product_sales()
