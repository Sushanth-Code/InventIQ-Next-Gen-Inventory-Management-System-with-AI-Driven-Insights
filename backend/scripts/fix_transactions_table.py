from sqlalchemy import create_engine, text
from config import Config

def fix_transactions_table():
    # Create SQLAlchemy engine
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    
    with engine.connect() as conn:
        # Drop existing transactions table if it exists
        conn.execute(text("DROP TABLE IF EXISTS transactions"))
        
        # Create transactions table with correct data types
        conn.execute(text("""
            CREATE TABLE transactions (
                id INTEGER NOT NULL AUTO_INCREMENT,
                product_id INTEGER NOT NULL,
                transaction_type VARCHAR(20) NOT NULL,
                quantity INTEGER NOT NULL,
                transaction_date DATETIME,
                PRIMARY KEY (id),
                FOREIGN KEY(product_id) REFERENCES products (id)
            )
        """))
        conn.commit()
        print("Transactions table created successfully!")

if __name__ == '__main__':
    fix_transactions_table()
