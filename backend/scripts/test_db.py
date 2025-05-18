# backend/test_db.py
import sys
import os
from sqlalchemy.exc import OperationalError
import traceback

# --- Essential App Initialization ---
try:
    from app import create_app, db
    print("Imported create_app, db from app")
except ImportError as e:
    print("FATAL ERROR: Could not import create_app or db from 'app'.")
    print(f"Error details: {e}")
    sys.exit(1)

try:
    print("--- Initializing Flask App ---")
    app = create_app()
    print("Flask app instance created.")
    print(f"Using DB URI from app.config: {app.config.get('SQLALCHEMY_DATABASE_URI')}")
except Exception as e:
    print(f"FATAL ERROR: Failed to create Flask app instance: {e}")
    traceback.print_exc()
    sys.exit(1)

def run_db_test():
    """Minimal test to check table creation."""
    with app.app_context():
        try:
            # Explicitly import models here again to ensure they're loaded
            from app.models.user import User
            from app.models.inventory import Product
            print("Models imported successfully inside test function.")
            
            # Debug: Check what tables are in metadata before operations
            print(f"Tables in metadata before operations: {list(db.metadata.tables.keys())}")
        except ImportError as e:
            print(f"FATAL ERROR: Could not import models: {e}")
            return

        print("\n--- Database Setup Test ---")
        try:
            print(f"Using DB Engine from db instance: {db.engine}")
            
            print("Attempting to drop tables...")
            db.drop_all()
            print("Drop tables command executed.")

            print("Attempting to create tables...")
            db.create_all()
            print("Create tables command executed.")

            # Verification
            print("Verifying table creation...")
            inspector = db.inspect(db.engine)
            table_names = inspector.get_table_names()
            
            # Check the actual tables in metadata after create_all
            print(f"Tables in metadata after create_all: {list(db.metadata.tables.keys())}")
            
            # Check for tables corresponding to imported models
            required_tables = {'products', 'users'}
            print(f"Tables found by inspector: {sorted(table_names)}")

            if required_tables.issubset(set(table_names)):
                print(f"SUCCESS: Required tables were created: {required_tables}")
            else:
                missing = required_tables.difference(set(table_names))
                print(f"FAILURE: Tables creation failed. Missing: {missing}")
                print("Check DB user permissions and model definitions.")
                
                # Additional debugging info
                print("\nDEBUG: Checking database access permissions...")
                try:
                    # Try to create a simple test table directly 
                    with db.engine.connect() as conn:
                        conn.execute("CREATE TABLE IF NOT EXISTS test_permissions (id INT)")
                        print("Permission test: Successfully created test table")
                        conn.execute("DROP TABLE test_permissions")
                        print("Permission test: Successfully dropped test table")
                except Exception as e:
                    print(f"Permission test FAILED: {e}")

        except OperationalError as oe:
            print(f"DATABASE OPERATIONAL ERROR during setup test: {oe}")
            print("Check connection, schema name, privileges.")
            traceback.print_exc()
        except Exception as e:
            print(f"Unexpected ERROR during setup test: {e}")
            traceback.print_exc()

if __name__ == "__main__":
    print("--- Starting Minimal DB Test Script ---")
    run_db_test()
    print("--- Minimal DB Test Script Finished ---")