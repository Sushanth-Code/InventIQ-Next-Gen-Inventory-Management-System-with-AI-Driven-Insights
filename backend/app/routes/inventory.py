from flask import Blueprint, request, jsonify
from app.models.inventory import Product, Transaction
from app.routes.auth import token_required
from main import db
import json
from datetime import datetime

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route('/', methods=['GET'])
@token_required
def get_all_products(current_user):
    try:
        print('Fetching all products...')
        products = Product.query.all()
        product_list = [product.to_dict() for product in products]
        print(f'Found {len(product_list)} products')
        return jsonify(product_list), 200
    except Exception as e:
        print(f'Error fetching products: {str(e)}')
        return jsonify({'message': f'Error fetching products: {str(e)}'}), 500

@inventory_bp.route('/<product_id>', methods=['GET'])
@token_required
def get_product(current_user, product_id):
    product = Product.query.get_or_404(product_id)  
    return jsonify(product.to_dict()), 200

@inventory_bp.route('/', methods=['POST'])
@token_required
def add_product(current_user):
    if current_user.role not in ['admin', 'manager']:
        return jsonify({'message': 'Permission denied!'}), 403
        
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['name', 'category', 'supplier', 'current_stock', 
                        'reorder_level', 'purchase_price', 'selling_price', 'lead_time']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({'message': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        # Validate numeric fields
        numeric_fields = ['current_stock', 'reorder_level', 'purchase_price', 'selling_price', 'lead_time']
        for field in numeric_fields:
            try:
                data[field] = float(data[field])
                if data[field] < 0:
                    return jsonify({'message': f'{field} cannot be negative'}), 400
            except (ValueError, TypeError):
                return jsonify({'message': f'{field} must be a valid number'}), 400
        
        # Ensure integers for stock fields
        data['current_stock'] = int(data['current_stock'])
        data['reorder_level'] = int(data['reorder_level'])
        
        # Generate product ID if not provided
        if not data.get('id'):
            # Get the highest existing product ID
            highest_product = Product.query.order_by(Product.id.desc()).first()
            if highest_product and highest_product.id.startswith('P'):
                try:
                    last_num = int(highest_product.id[1:])
                    data['id'] = f'P{str(last_num + 1).zfill(4)}'
                except ValueError:
                    data['id'] = 'P0001'
            else:
                data['id'] = 'P0001'
        
        # Initialize historical sales with default structure
        historical_sales = data.get('historical_sales', {})
        if not isinstance(historical_sales, dict):
            historical_sales = {}
        
        # Create new product
        product = Product(
            id=data['id'],
            name=data['name'],
            category=data['category'],
            supplier=data['supplier'],
            current_stock=data['current_stock'],
            reorder_level=data['reorder_level'],
            purchase_price=data['purchase_price'],
            selling_price=data['selling_price'],
            lead_time=data['lead_time'],
            historical_sales=json.dumps(historical_sales)
        )
        
        # Check if product ID already exists
        if Product.query.get(product.id):
            return jsonify({'message': f'Product with ID {product.id} already exists'}), 409
        
        db.session.add(product)
        db.session.commit()
        
        return jsonify({
            'message': 'Product added successfully!',
            'product': product.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f'Error adding product: {str(e)}')
        return jsonify({'message': f'Error adding product: {str(e)}'}), 500

@inventory_bp.route('/<product_id>', methods=['PUT'])
@token_required
def update_product(current_user, product_id):
    if current_user.role not in ['admin', 'manager']:
        return jsonify({'message': 'Permission denied!'}), 403
        
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    
    # Update fields
    for field in data:
        if field == 'historical_sales':
            setattr(product, field, json.dumps(data[field]))
        else:
            setattr(product, field, data[field])
    
    db.session.commit()
    
    return jsonify({
        'message': 'Product updated successfully!',
        'product': product.to_dict()
    }), 200

@inventory_bp.route('/<product_id>', methods=['DELETE'])
@token_required
def delete_product(current_user, product_id):
    try:
        # Check user role
        if current_user.role != 'admin':
            return jsonify({'message': 'Permission denied! Only admin can delete products.'}), 403
        
        # Check if product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'message': f'Product with ID {product_id} not found'}), 404
        
        # Check if we should delete all products from the supplier
        delete_supplier = request.args.get('delete_supplier', 'false').lower() == 'true'
        supplier_name = product.supplier
        
        try:
            if delete_supplier:
                # Delete all products from this supplier
                products_to_delete = Product.query.filter_by(supplier=supplier_name).all()
                if not products_to_delete:
                    return jsonify({'message': f'No products found for supplier {supplier_name}'}), 404
                
                # First delete all transactions for each product
                for p in products_to_delete:
                    # Delete related transactions
                    Transaction.query.filter_by(product_id=p.id).delete()
                
                # Then delete the products
                for p in products_to_delete:
                    db.session.delete(p)
                
                db.session.commit()
                return jsonify({
                    'message': f'Supplier {supplier_name} and all associated products deleted successfully!',
                    'deleted_count': len(products_to_delete)
                }), 200
            else:
                # First delete all transactions for this product
                Transaction.query.filter_by(product_id=product.id).delete()
                
                # Then delete the product
                db.session.delete(product)
                db.session.commit()
                
                return jsonify({
                    'message': 'Product deleted successfully!',
                    'deleted_product': product.to_dict()
                }), 200
                
        except Exception as db_error:
            db.session.rollback()
            print(f'Database error during delete: {str(db_error)}')
            return jsonify({'message': f'Database error occurred while deleting: {str(db_error)}'}), 500
            
    except Exception as e:
        print(f'Error in delete_product: {str(e)}')
        return jsonify({'message': f'Error occurred: {str(e)}'}), 500

@inventory_bp.route('/transaction', methods=['POST'])
@token_required
def record_transaction(current_user):
    try:
        print('Recording transaction...')
        data = request.get_json()
        print(f'Received data: {data}')
        
        # Validate required fields
        required_fields = ['product_id', 'transaction_type', 'quantity']
        for field in required_fields:
            if field not in data:
                print(f'Missing field: {field}')
                return jsonify({'message': f'Missing required field: {field}'}), 400
        
        print(f'Looking for product {data["product_id"]}...')
        product = Product.query.get(data['product_id'])
        if not product:
            print(f'Product not found: {data["product_id"]}')
            return jsonify({'message': f'Product not found: {data["product_id"]}'}), 404
        
        quantity = int(data['quantity'])
        
        # Update product stock based on transaction type
        if data['transaction_type'] == 'sale':
            print(f'Processing sale. Current stock: {product.current_stock}, Requested: {quantity}')
            if product.current_stock < quantity:
                return jsonify({'message': 'Insufficient stock!'}), 400
            
            # Update stock
            product.current_stock -= quantity
            
            # Initialize historical_sales if None or invalid
            if not product.historical_sales or not isinstance(product.historical_sales, str):
                product.historical_sales = '{}'
            
            # Update historical sales
            try:
                historical_sales = json.loads(product.historical_sales)
                today = datetime.utcnow().strftime('Day-%j')  # Day of year
                historical_sales[today] = historical_sales.get(today, 0) + quantity
                product.historical_sales = json.dumps(historical_sales)
                print(f'Updated historical sales for {today}')
            except Exception as e:
                print(f'Error updating historical sales: {e}')
                product.historical_sales = '{}'
            
        elif data['transaction_type'] == 'restock':
            print('Processing restock')
            product.current_stock += quantity
        
        # Create and save transaction record
        print('Creating transaction record...')
        transaction = Transaction(
            product_id=str(data['product_id']),
            transaction_type=data['transaction_type'],
            quantity=quantity
        )
        
        print('Saving changes to database...')
        db.session.add(transaction)
        db.session.commit()
        print('Transaction recorded successfully!')
        
        return jsonify({
            'message': 'Transaction recorded successfully!',
            'transaction': {
                'id': transaction.id,
                'product_id': transaction.product_id,
                'transaction_type': transaction.transaction_type,
                'quantity': transaction.quantity,
                'transaction_date': transaction.transaction_date.isoformat() if transaction.transaction_date else None
            },
            'updated_stock': product.current_stock
        }), 201
        
    except Exception as e:
        print(f'Error recording transaction: {str(e)}')
        db.session.rollback()
        return jsonify({'message': f'Error recording transaction: {str(e)}'}), 500
    
    return jsonify({
        'message': 'Transaction recorded successfully!',
        'transaction': {
            'id': transaction.id,
            'product_id': transaction.product_id,
            'transaction_type': transaction.transaction_type,
            'quantity': transaction.quantity,
            'transaction_date': transaction.transaction_date.isoformat()
        },
        'updated_stock': product.current_stock
    }), 201