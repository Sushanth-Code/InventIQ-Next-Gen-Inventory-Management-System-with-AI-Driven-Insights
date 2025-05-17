import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

def prepare_time_series(product):
    """Convert historical sales to time series data."""
    try:
        # Handle empty or invalid historical_sales
        if not product.historical_sales or not isinstance(product.historical_sales, str):
            return pd.DataFrame(columns=['day', 'quantity', 'day_num'])
            
        # Try to parse historical_sales
        try:
            historical_sales = json.loads(product.historical_sales)
        except json.JSONDecodeError:
            return pd.DataFrame(columns=['day', 'quantity', 'day_num'])
        
        if not isinstance(historical_sales, dict):
            return pd.DataFrame(columns=['day', 'quantity', 'day_num'])
        
        # Convert to dataframe
        sales_data = []
        for day, quantity in historical_sales.items():
            try:
                sales_data.append({
                    'day': str(day),
                    'quantity': float(quantity)
                })
            except (ValueError, TypeError):
                continue
                
        df = pd.DataFrame(sales_data)
        
        if df.empty:
            return pd.DataFrame(columns=['day', 'quantity', 'day_num'])
        
        # Sort by day
        try:
            df['day_num'] = df['day'].str.extract(r'Day-(\d+)').astype(int)
            df = df.sort_values('day_num')
        except Exception:
            df['day_num'] = range(len(df))
        
        return df
        
    except Exception as e:
        print(f'Error preparing time series for product {product.id}: {str(e)}')
        return pd.DataFrame(columns=['day', 'quantity', 'day_num'])

def simple_forecast(product, days=30):
    """Use simple moving average to forecast demand."""
    df = prepare_time_series(product)
    
    # If insufficient data, return simple average
    if len(df) < 5:
        avg_sales = df['quantity'].mean() if not df.empty else 0
        return [round(avg_sales) for _ in range(days)]
    
    # Calculate moving average
    window_size = min(5, len(df))
    df['ma'] = df['quantity'].rolling(window=window_size).mean()
    
    # Get the last moving average value
    last_ma = df['ma'].iloc[-1]
    
    # Generate forecast
    forecast = []
    for i in range(days):
        # Add some random variation to make it more realistic
        variation = np.random.normal(0, last_ma * 0.1) if last_ma > 0 else 0  # 10% standard deviation
        forecast.append(max(0, round(last_ma + variation)))
    
    return forecast

def forecast_demand(product, days=30):
    """Forecast demand using simple moving average."""
    return simple_forecast(product, days)

def recommend_restock(product, is_trending=False):
    """Recommend restock quantity based on forecast and current stock."""
    forecast = forecast_demand(product, days=7)  # Forecast next 7 days
    avg_daily_demand = sum(forecast) / len(forecast)
    
    # Calculate safety stock (2 weeks worth)
    safety_stock = avg_daily_demand * 14
    
    # Calculate reorder point
    reorder_point = avg_daily_demand * 7 + safety_stock
    
    # Calculate order quantity
    current_stock = product.current_stock
    order_quantity = max(0, round(reorder_point - current_stock))
    
    # If trending, increase order by 20%
    if is_trending:
        order_quantity = round(order_quantity * 1.2)
    
    return order_quantity

def get_trend_data():
    """Get trend data for all products."""
    from app.models.inventory import Product
    
    products = Product.query.all()
    trend_data = []
    
    # Track daily sales across all products
    total_daily_sales = {}
    category_sales = {}
    
    for product in products:
        try:
            # Parse historical sales
            try:
                historical_sales = json.loads(product.historical_sales) if product.historical_sales else {}
            except json.JSONDecodeError:
                historical_sales = {}
            
            if not isinstance(historical_sales, dict):
                historical_sales = {}
            
            # Calculate metrics based on historical sales
            if historical_sales:
                # Get all sales quantities
                sales_quantities = []
                for day, quantity in historical_sales.items():
                    try:
                        qty = float(quantity)
                        sales_quantities.append(qty)
                        
                        # Add to total daily sales
                        if day not in total_daily_sales:
                            total_daily_sales[day] = 0
                        total_daily_sales[day] += qty
                        
                        # Add to category sales
                        if product.category not in category_sales:
                            category_sales[product.category] = {
                                'name': product.category,
                                'total_sales': 0,
                                'avg_growth': 0,
                                'product_count': 0
                            }
                        category_sales[product.category]['total_sales'] += qty
                    except (ValueError, TypeError):
                        continue
                
                # Calculate average daily sales
                avg_daily_sales = sum(sales_quantities) / len(sales_quantities) if sales_quantities else 0
                
                # Calculate growth rate
                if len(sales_quantities) >= 5:
                    last_5_days = sum(sales_quantities[-5:]) / 5
                    prev_5_days = sum(sales_quantities[-10:-5]) / 5 if len(sales_quantities) >= 10 else sum(sales_quantities[:5]) / 5
                    growth_rate = ((last_5_days - prev_5_days) / prev_5_days * 100) if prev_5_days > 0 else 0
                    
                    # Add growth rate to category
                    category_sales[product.category]['avg_growth'] += growth_rate
                    category_sales[product.category]['product_count'] += 1
                else:
                    growth_rate = 0
            else:
                avg_daily_sales = 0
                growth_rate = 0
            
            # Add product to trend data
            trend_data.append({
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'current_stock': product.current_stock,
                'growth_rate': round(growth_rate, 2),
                'avg_daily_sales': round(avg_daily_sales, 2),
                'stock_status': 'Low' if product.current_stock < product.reorder_level else 'Good',
                'has_sales_data': bool(historical_sales)
            })
            
        except Exception as e:
            print(f'Error calculating trends for product {product.id}: {str(e)}')
            # Include product with default values on error
            trend_data.append({
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'current_stock': product.current_stock,
                'growth_rate': 0,
                'avg_daily_sales': 0,
                'stock_status': 'Low' if product.current_stock < product.reorder_level else 'Good',
                'has_sales_data': False
            })
    
    # Calculate average growth rate for each category
    for category in category_sales.values():
        if category['product_count'] > 0:
            category['avg_growth'] = round(category['avg_growth'] / category['product_count'], 2)
    
    # Convert total daily sales to sorted list
    sales_trend = []
    if total_daily_sales:
        sorted_days = sorted(total_daily_sales.keys(), key=lambda x: int(x.split('-')[1]))
        sales_trend = [
            {'day': day, 'sales': total_daily_sales[day]}
            for day in sorted_days
        ]
    
    # Sort category trends by total sales
    category_trends = list(category_sales.values())
    category_trends.sort(key=lambda x: x['total_sales'], reverse=True)
    
    # Sort products by average daily sales for top selling products
    trend_data.sort(key=lambda x: x['avg_daily_sales'], reverse=True)
    top_selling = trend_data[:10]  # Get top 10
    
    return {
        'topSellingProducts': top_selling,
        'salesTrend': sales_trend,
        'categoryTrends': category_trends
    }
