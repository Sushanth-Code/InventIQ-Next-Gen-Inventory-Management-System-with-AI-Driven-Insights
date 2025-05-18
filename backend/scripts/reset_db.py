import os
from flask import Flask
from config import Config
from app.extensions import db
from app.models.user import User

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    db.init_app(app)
    return app

def reset_db():
    app = create_app()
    
    with app.app_context():
        # Get database path from app config
        db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
        
        # Remove existing database files
        if os.path.exists(db_path):
            print(f"Removing existing database: {db_path}")
            os.remove(db_path)
        
        instance_db_path = os.path.join('instance', os.path.basename(db_path))
        if os.path.exists(instance_db_path):
            print(f"Removing existing database in instance directory: {instance_db_path}")
            os.remove(instance_db_path)
        
        # Create tables
        print("Creating database tables...")
        db.create_all()
        
        # Create default admin user
        print("Creating default admin user...")
        admin = User(
            username='admin',
            email='admin@inventiq.com',
            role='admin'
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        
        print("Database reset and initialized successfully!")

if __name__ == '__main__':
    reset_db()
