from app.models.user import User
from app.extensions import db
from app import create_app
from app.utils.db_init import init_db

def create_admin_user():
    app = create_app()
    with app.app_context():
        # Initialize database tables
        init_db(app)
        
        # Check if admin already exists
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                email='admin@inventiq.com',
                role='admin'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print('Admin user created successfully!')
        else:
            print('Admin user already exists!')

if __name__ == '__main__':
    create_admin_user()
