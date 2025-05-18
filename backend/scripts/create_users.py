from app import create_app
from app.extensions import db
from app.models.user import User
from datetime import datetime

def create_default_users():
    """
    Create default admin and staff users for the application
    """
    app = create_app()
    
    with app.app_context():
        # Check if users already exist
        admin_exists = User.query.filter_by(username='admin').first()
        staff_exists = User.query.filter_by(username='staff').first()
        
        if not admin_exists:
            # Create admin user
            admin = User(
                username='admin',
                email='admin@inventiq.com',
                role='admin',
                created_at=datetime.utcnow()
            )
            admin.set_password('admin123')
            db.session.add(admin)
            print("Admin user created")
        else:
            print("Admin user already exists")
        
        if not staff_exists:
            # Create staff user
            staff = User(
                username='staff',
                email='staff@inventiq.com',
                role='staff',
                created_at=datetime.utcnow()
            )
            staff.set_password('staff123')
            db.session.add(staff)
            print("Staff user created")
        else:
            print("Staff user already exists")
        
        # Commit changes
        db.session.commit()
        print("Users setup completed")

if __name__ == "__main__":
    create_default_users()
