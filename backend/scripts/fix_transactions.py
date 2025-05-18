from sqlalchemy import create_engine, text
from config import Config

def fix_transactions():
    # Create SQLAlchemy engine
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    
    with engine.connect() as conn:
        # Drop existing transactions table
        conn.execute(text("DROP TABLE IF EXISTS transactions"))
        
        # Create transactions table with correct schema
        conn.execute(text("""
            CREATE TABLE transactions (
                id INTEGER NOT NULL AUTO_INCREMENT,
                product_id VARCHAR(10) NOT NULL,
                transaction_type VARCHAR(20) NOT NULL,
                quantity INTEGER NOT NULL,
                transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        """))
        conn.commit()
        print("Transactions table recreated successfully!")

if __name__ == '__main__':
    fix_transactions()
