# backend/app/__init__.py
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from config import Config

# Define explicit MetaData with naming convention
metadata = MetaData(naming_convention={
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
})

# Initialize SQLAlchemy with metadata
db = SQLAlchemy(metadata=metadata)

def create_app(config_class=Config):
    """Application Factory Function"""
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app)
    db.init_app(app)

    with app.app_context():
        # Import models INSIDE app context to ensure they're registered properly
        from app.models.user import User
    from app.routes.inventory import inventory_bp
    from app.routes.auth import auth_bp
    from app.routes.predictions import predictions_bp
    from app.routes.csv_handler import csv_handler
    from app.routes.assistant import assistant_bp
    from app.routes.export import export_bp
    
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(predictions_bp, url_prefix='/api/predictions')
    app.register_blueprint(csv_handler, url_prefix='/api/csv')
    app.register_blueprint(assistant_bp)
    app.register_blueprint(export_bp)
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app