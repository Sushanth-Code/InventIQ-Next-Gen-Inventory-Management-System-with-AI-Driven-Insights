from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    role = db.Column(db.String(20), default='staff')  # 'admin', 'staff'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def has_permission(self, permission):
        # Define permissions for different roles
        permissions = {
            'admin': [
                'view_dashboard',
                'view_inventory',
                'add_product',
                'edit_product',
                'delete_product',
                'restock_product',
                'view_calculator',
                'view_trends',
                'export_data'
            ],
            'staff': [
                'view_dashboard',
                'view_inventory',
                'view_trends'
            ]
        }
        
        role_permissions = permissions.get(self.role, [])
        return permission in role_permissions
    
    def __repr__(self):
        return f'<User {self.username}>'