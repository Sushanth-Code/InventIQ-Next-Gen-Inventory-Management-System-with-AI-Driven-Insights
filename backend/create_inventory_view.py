from sqlalchemy import create_engine, text
from config import Config

def create_inventory_view():
    # Create SQLAlchemy engine
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    
    with engine.connect() as conn:
        # Create inventory view
        conn.execute(text("""
            CREATE OR REPLACE VIEW inventory AS 
            SELECT * FROM products
        """))
        conn.commit()
        print("Created 'inventory' view successfully!")

if __name__ == '__main__':
    create_inventory_view()
