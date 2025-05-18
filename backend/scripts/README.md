# Database Scripts

This folder contains all database management and utility scripts for the InventIQ system.

## Database Setup Scripts
- `init_db.py` - Initialize the database and create all tables
- `setup_db.py` - Set up the database with initial configuration
- `create_schema.py` - Create the database schema
- `schema.sql` - SQL schema definitions

## Data Management Scripts
- `fix_products.py` - Fix and validate product data
- `fix_users.py` - Fix and validate user data
- `fix_transactions.py` - Fix and validate transaction data
- `fix_product_sales.py` - Fix historical sales data
- `fix_historical_sales.py` - Update historical sales records
- `fix_transactions_table.py` - Fix transaction table issues

## User Management Scripts
- `create_admin.py` - Create admin user
- `create_users.py` - Create sample users
- `setup_admin.py` - Set up admin configuration
- `alter_user_table.sql` - SQL for user table modifications

## Data Import/Export Scripts
- `data_import.py` - Import data from external sources
- `load_inventory.py` - Load inventory data

## Utility Scripts
- `verify_data.py` - Verify data integrity
- `test_db.py` - Test database connections
- `migrate_db.py` - Database migration utilities
- `reset_db.py` - Reset database to initial state
- `recreate_db.py` - Recreate database from scratch

## Usage
To run any script, use:
```bash
python scripts/script_name.py
```

For example, to initialize the database:
```bash
python scripts/init_db.py
```
