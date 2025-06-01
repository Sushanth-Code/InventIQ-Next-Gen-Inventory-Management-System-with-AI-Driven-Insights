from flask import Flask
from flask_cors import CORS
from config import Config
from app.models.user import User
from app.extensions import db

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    CORS(app)
    db.init_app(app)
    
    # Import and register blueprints
    from app.routes.auth import auth_bp
    from app.routes.inventory import inventory_bp
    from app.routes.predictions import predictions_bp
    from app.routes.export import export_bp
    from app.routes.assistant import assistant_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
    app.register_blueprint(predictions_bp, url_prefix='/api/predictions')
    app.register_blueprint(export_bp, url_prefix='/api/export')
    app.register_blueprint(assistant_bp)
    
    return app

def init_db(app):
    with app.app_context():
        db.create_all()
        
        # Create default admin user if it doesn't exist
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@inventiq.com',
                role='admin'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()

if __name__ == '__main__':
    app = create_app()
    init_db(app)
    app.run(debug=True)