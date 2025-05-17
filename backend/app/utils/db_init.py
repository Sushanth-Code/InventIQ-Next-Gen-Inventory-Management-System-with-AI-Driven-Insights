from app import create_app
from app.extensions import db
from app.models.inventory import Product
from app.models.user import User

def init_inventory():
    app = create_app()
    with app.app_context():
        try:
            # Create tables
            db.create_all()
            print('Database tables created successfully!')
            
            # Create admin user if not exists
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
                
        except Exception as e:
            print(f'Error initializing database: {str(e)}')
            return

if __name__ == '__main__':
    init_inventory()