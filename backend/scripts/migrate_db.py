from flask import Flask
from config import Config
from app.extensions import db
import sqlite3
from app.models.user import User

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    db.init_app(app)
    return app

def migrate_db():
    app = create_app()
    
    with app.app_context():
        # Get database path from app config
        db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
        
        # Connect to SQLite database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if last_login column exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'last_login' not in columns:
            print("Adding 'last_login' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN last_login TIMESTAMP")
            conn.commit()
            print("Column added successfully!")
        else:
            print("'last_login' column already exists.")
        
        conn.close()

if __name__ == '__main__':
    migrate_db()
