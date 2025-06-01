from flask import current_app
import pandas as pd
import os
import csv
from datetime import datetime
import json
from app.services.ollama_service import OllamaService

class ExportData:
    """Class for exporting inventory data to CSV and generating insights"""
    
    @staticmethod
    def export_inventory_data():
        """Export current inventory data to CSV"""
        from app.models.inventory import Product
        
        # Get all products
        products = Product.query.all()
        
        # Create export directory if it doesn't exist
        export_dir = os.path.join(current_app.root_path, 'exports')
        os.makedirs(export_dir, exist_ok=True)
        
        # Generate timestamp for filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        csv_path = os.path.join(export_dir, f'inventory_export_{timestamp}.csv')
        
        # Write to CSV
        with open(csv_path, 'w', newline='') as csvfile:
            fieldnames = ['id', 'name', 'category', 'supplier', 'current_stock', 
                          'reorder_level', 'purchase_price', 'selling_price', 'stock_status']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for product in products:
                # Determine stock status
                if product.current_stock <= 0:
                    stock_status = 'OUT_OF_STOCK'
                elif product.current_stock <= product.reorder_level:
                    stock_status = 'LOW_STOCK'
                else:
                    stock_status = 'IN_STOCK'
                    
                writer.writerow({
                    'id': product.id,
                    'name': product.name,
                    'category': product.category,
                    'supplier': product.supplier,
                    'current_stock': product.current_stock,
                    'reorder_level': product.reorder_level,
                    'purchase_price': product.purchase_price,
                    'selling_price': product.selling_price,
                    'stock_status': stock_status
                })
        
        return csv_path
    
    @staticmethod
    def get_inventory_insights(query=None):
        """Get AI-powered insights about inventory using Ollama"""
        # Export latest data
        csv_path = ExportData.export_inventory_data()
        
        # Read the CSV data
        df = pd.read_csv(csv_path)
        
        # Prepare inventory summary
        summary = {
            'total_products': len(df),
            'out_of_stock': len(df[df['stock_status'] == 'OUT_OF_STOCK']),
            'low_stock': len(df[df['stock_status'] == 'LOW_STOCK']),
            'categories': df['category'].unique().tolist(),
            'total_value': (df['current_stock'] * df['purchase_price']).sum()
        }
        
        # Prepare context for Ollama
        context = f"""
        Current Inventory Summary:
        - Total Products: {summary['total_products']}
        - Out of Stock Items: {summary['out_of_stock']}
        - Low Stock Items: {summary['low_stock']}
        - Total Inventory Value: ${summary['total_value']:,.2f}
        - Product Categories: {', '.join(summary['categories'])}
        """
        
        # If no specific query, provide general insights
        if not query:
            query = """Based on the inventory data, provide key insights about:
            1. Critical stock situations
            2. Categories that need attention
            3. Overall inventory health
            Keep the response concise and actionable."""
        
        # Check if Ollama is available without raising exceptions
        ollama_available = False
        try:
            # Quick health check without logging errors
            import requests
            from flask import current_app
            base_url = current_app.config.get('OLLAMA_BASE_URL', 'http://localhost:11434')
            health_response = requests.get(f"{base_url}/api/health", timeout=2)
            ollama_available = health_response.status_code == 200
        except:
            # Silently handle connection issues
            ollama_available = False
        
        if ollama_available:
            try:
                # Try to get insights from Ollama
                ollama_service = OllamaService()
                insights = ollama_service.generate(
                    prompt=f"{context}\n\nQuery: {query}",
                    system_prompt="You are an inventory management expert. Analyze the data and provide specific, actionable insights."
                )
            except Exception:
                # Fallback to rule-based insights if Ollama generation fails
                insights = ExportData.generate_rule_based_insights(df, query)
        else:
            # Use rule-based insights without attempting Ollama connection
            insights = ExportData.generate_rule_based_insights(df, query)
        
        return {
            'insights': insights,
            'summary': summary,
            'export_path': csv_path
        }
    
    @staticmethod
    def generate_rule_based_insights(df, query):
        """Generate rule-based insights when Ollama is not available"""
        # Get low stock items
        low_stock_items = df[df['stock_status'] == 'LOW_STOCK']
        out_of_stock_items = df[df['stock_status'] == 'OUT_OF_STOCK']
        
        # Get category statistics
        category_stats = df.groupby('category').agg({
            'id': 'count',
            'current_stock': 'sum',
            'purchase_price': lambda x: (df.loc[x.index, 'current_stock'] * x).sum()
        }).rename(columns={'id': 'count', 'purchase_price': 'total_value'})
        
        # Check for greetings and general conversation first
        query_lower = query.lower()
        
        # Define comprehensive greeting lists exactly as provided by the user
        # Basic Greetings
        basic_greetings = [
            "hello", "hi", "hey", "hi there", "hello there", "greetings", 
            "good morning", "good afternoon", "good evening", "good day"
        ]
        
        # Casual Greetings
        casual_greetings = [
            "what's up", "how's it going", "how are you", "how are you doing", 
            "how's everything", "how's your day", "howdy", "yo", "hey there"
        ]
        
        # Formal Greetings
        formal_greetings = [
            "good day to you", "pleased to meet you", "it's nice to meet you", 
            "how do you do", "welcome"
        ]
        
        # Contextual Greetings
        contextual_greetings = [
            "hello inventiq", "hi assistant", "hey smart assistant", 
            "hello inventory assistant", "greetings inventiq assistant"
        ]
        
        # Greeting with Intent
        intent_greetings = [
            "hello, can you help me", "hi, i need assistance", "hey there, i have a question", 
            "good morning, i'd like some information", "hello, are you available"
        ]
        
        # Time-specific Greetings
        time_greetings = ["morning", "afternoon", "evening"]
        
        # Special cases
        farewell_greetings = ["good night", "goodnight", "night", "bye", "goodbye", "see you", "see ya", "farewell", "take care", "later", "cya"]
        
        # Combine all greeting types for exact matching
        all_greetings = basic_greetings + casual_greetings + formal_greetings + \
                        contextual_greetings + intent_greetings + time_greetings + farewell_greetings
        
        # Create word lists for partial matching
        greeting_words = ["hello", "hi", "hey", "greetings"]
        time_words = ["morning", "afternoon", "evening", "night", "day"]
        time_prefixes = ["good", "nice"]
        question_words = ["how", "what", "who"]
        
        # Extremely robust greeting detection
        is_greeting = False
        is_farewell = False
        
        # Check for farewell phrases first (highest priority)
        if any(farewell in query_lower for farewell in farewell_greetings):
            is_greeting = True
            is_farewell = True
        
        # Check for exact matches
        elif query_lower in all_greetings:
            is_greeting = True
            if query_lower in farewell_greetings:
                is_farewell = True
        
        # Check for common greeting patterns
        elif any(query_lower == greeting for greeting in all_greetings):
            is_greeting = True
        
        # Check for time-based greetings (good morning, good night, etc.)
        elif any(f"{prefix} {time}" == query_lower for prefix in time_prefixes for time in time_words):
            is_greeting = True
            if "night" in query_lower:
                is_farewell = True
        
        # Check for greeting words as standalone
        elif any(word == query_lower for word in greeting_words + time_words):
            is_greeting = True
            if query_lower == "night":
                is_farewell = True
        
        # Check for greeting words at the start
        elif any(query_lower.startswith(word + " ") for word in greeting_words):
            is_greeting = True
        
        # Check for question-based greetings
        elif any(query_lower.startswith(question + " ") for question in question_words) and \
             any(word in query_lower for word in ["you", "going", "day"]):
            is_greeting = True
        
        if is_greeting:
            # Handle farewell greetings first (Good night, bye, etc.)
            if is_farewell:
                import random
                # Different responses based on time of day
                from datetime import datetime
                current_hour = datetime.now().hour
                
                if "night" in query_lower or "goodnight" in query_lower:
                    farewell_responses = [
                        "Good night! I'll be here if you need any inventory insights tomorrow. Rest well!",
                        "Sleep tight! Your inventory will be waiting for your attention tomorrow.",
                        "Have a restful night! I'll keep an eye on your inventory while you're away.",
                        "Good night! Dream of perfectly optimized inventory levels!",
                        "Night! I'll be here ready to assist with your inventory needs when you return."
                    ]
                elif "bye" in query_lower or "goodbye" in query_lower or "see you" in query_lower:
                    farewell_responses = [
                        "Goodbye! I'll be here when you need inventory insights again!",
                        "See you soon! Your inventory data will be ready for analysis when you return.",
                        "Bye for now! I'll keep monitoring your inventory metrics while you're away.",
                        "Take care! I'll be here to help optimize your inventory whenever you need me.",
                        "Farewell! Your inventory assistant will be waiting for your next question."
                    ]
                else:
                    farewell_responses = [
                        "Until next time! I'll be here for all your inventory management needs.",
                        "Take care! I'll keep your inventory data organized and ready for your return.",
                        "Goodbye for now! Looking forward to our next inventory analysis session.",
                        "See you later! I'll be here whenever you need inventory insights.",
                        "Farewell! Your inventory is in good hands until we chat again."
                    ]
                return random.choice(farewell_responses)
                
            # Personalize greeting based on time of day
            from datetime import datetime
            current_hour = datetime.now().hour
            
            if 5 <= current_hour < 12:
                time_greeting = "Good morning!"
            elif 12 <= current_hour < 17:
                time_greeting = "Good afternoon!"
            elif 17 <= current_hour < 22:
                time_greeting = "Good evening!"
            else:
                time_greeting = "Hello!"
            
            import random
            
            # Match exact greetings first
            if query_lower in basic_greetings:
                # Basic greeting responses
                basic_responses = [
                    f"{time_greeting} I'm your InventIQ Smart Assistant. I can help you with inventory insights, stock levels, category analysis, and more. How can I assist you today?",
                    f"{time_greeting} Welcome to InventIQ! I'm here to make inventory management a breeze. What would you like to explore today?",
                    f"{time_greeting} Great to see you! I'm your inventory management assistant. Ready to dive into your stock data?",
                    f"{time_greeting} InventIQ at your service! Let's tackle your inventory challenges together. What's on your mind?",
                    f"{time_greeting} Your inventory command center is active! How can I help optimize your stock management today?"
                ]
                return random.choice(basic_responses)
                
            # Handle time-specific greetings
            elif query_lower in time_greetings or any(f"{prefix} {time}" == query_lower for prefix in time_prefixes for time in time_words):
                # Time-specific greeting responses
                time_responses = [
                    f"{time_greeting} I'm your InventIQ Smart Assistant. How can I help with your inventory management today?",
                    f"{time_greeting} Perfect timing! Your inventory dashboard is ready for exploration. What would you like to focus on?",
                    f"{time_greeting} Hope you're having a productive day! I'm here to provide inventory insights whenever you need them.",
                    f"{time_greeting} Your InventIQ assistant is online and ready to analyze your inventory data. What shall we examine?",
                    f"{time_greeting} Time for some inventory magic! What aspect of your stock would you like to explore?"
                ]
                return random.choice(time_responses)
                
            # Handle casual greetings
            elif query_lower in casual_greetings or any(casual in query_lower for casual in ["what's up", "how's it going", "how are you"]):
                # Casual greeting responses
                casual_responses = [
                    f"{time_greeting} How's it going? I'm your InventIQ Smart Assistant. I can help you with inventory insights, stock levels, category analysis, and more. What would you like to know today?",
                    f"{time_greeting} I'm doing great! Your inventory is looking interesting today. Anything specific you'd like to check out?",
                    f"{time_greeting} All systems operational! I've been analyzing your inventory trends while waiting. What can I help you discover?",
                    f"{time_greeting} Hey there! I'm ready to dive into inventory data whenever you are. What's on your mind?",
                    f"{time_greeting} I'm fantastic, thanks for asking! Your inventory is waiting for your expert attention. Where should we focus?"
                ]
                return random.choice(casual_responses)
                
            # Handle formal greetings
            elif query_lower in formal_greetings or "pleased to meet you" in query_lower or "welcome" == query_lower:
                # Formal greeting responses
                formal_responses = [
                    f"{time_greeting} It's a pleasure to assist you. I'm the InventIQ Smart Assistant, ready to provide inventory insights, stock analysis, and category performance data. How may I be of service?",
                    f"{time_greeting} At your service! I'm delighted to help with your inventory management needs. What information would you like to review?",
                    f"{time_greeting} Welcome to your inventory command center. I'm prepared to assist with detailed analytics and insights. How may I help you today?",
                    f"{time_greeting} I'm honored to assist with your inventory management. My analytics are at your disposal. What would you like to examine?",
                    f"{time_greeting} A pleasure to see you. Your inventory dashboard awaits your instructions. How may I be of assistance?"
                ]
                return random.choice(formal_responses)
                
            # Handle intent greetings
            elif any(intent in query_lower for intent in ["can you help", "need assistance", "have a question"]):
                # Intent-based greeting responses
                intent_responses = [
                    f"{time_greeting} I'm here to help! As your InventIQ Smart Assistant, I can provide inventory insights, analyze stock levels, identify trends, and more. What specific information are you looking for?",
                    f"{time_greeting} Absolutely! I specialize in inventory analytics. Tell me what you need, and I'll find the answers in your data.",
                    f"{time_greeting} Help is my middle name! Your inventory questions are my priority. What would you like to know about your stock?",
                    f"{time_greeting} I'd be delighted to assist! Whether it's low stock alerts, category performance, or trend analysis, I've got you covered.",
                    f"{time_greeting} That's what I'm here for! Your inventory management companion is ready to tackle any question you have."
                ]
                return random.choice(intent_responses)
                
            # Handle contextual greetings
            elif "assistant" in query_lower or "inventiq" in query_lower:
                # Contextual greeting responses
                contextual_responses = [
                    f"{time_greeting} I'm your InventIQ inventory assistant. Ready to provide insights on your stock levels, product categories, and inventory health. What would you like to know?",
                    f"{time_greeting} InventIQ assistant online! Your inventory data is processed and ready for analysis. What aspects would you like to explore?",
                    f"{time_greeting} You called for InventIQ? I'm here with all your inventory data at my fingertips. What shall we analyze today?",
                    f"{time_greeting} Your personal inventory analyst reporting for duty! The InventIQ system is ready to provide insights. What's your focus today?",
                    f"{time_greeting} InventIQ assistant at your service! I've been monitoring your inventory metrics. Would you like a summary or specific details?"
                ]
                return random.choice(contextual_responses)
                
            # Default greeting response
            else:
                # Default greeting responses
                default_responses = [
                    f"{time_greeting} I'm your InventIQ Smart Assistant. I can help you with inventory insights, stock levels, category analysis, and more. How can I assist you today?",
                    f"{time_greeting} InventIQ is ready to analyze your inventory! From stock levels to sales trends, I'm here to help. What would you like to know?",
                    f"{time_greeting} Your inventory management just got smarter! I'm here to provide insights and answer questions about your stock. What can I help with?",
                    f"{time_greeting} Ready to make inventory management effortless! Ask me about stock levels, product performance, or category insights.",
                    f"{time_greeting} InventIQ assistant online and ready to serve! Your inventory data is at my fingertips. What would you like to explore today?"
                ]
                return random.choice(default_responses)
        
        # Handle thank you and appreciation with more variations
        thank_phrases = ["thank", "thanks", "appreciate", "grateful", "thank you", "thx", "ty", "thankyou"]
        if any(phrase in query_lower for phrase in thank_phrases):
            import random
            thank_responses = [
                "You're welcome! I'm happy to help with your inventory management needs. Is there anything else you'd like to know?",
                "Anytime! Your inventory success is my priority. What else can I assist you with today?",
                "It's my pleasure! I'm here to make inventory management easier for you. Need anything else?",
                "Glad I could help! Your inventory insights are just a question away. What's next on your mind?",
                "No problem at all! That's what I'm here for. Any other inventory questions I can answer?",
                "You're most welcome! I enjoy providing valuable inventory insights. What other aspects would you like to explore?",
                "Happy to be of service! Your inventory management journey is important to me. What else can I help with?",
                "The pleasure is mine! I'm always ready to dive into inventory data. What other insights would you like?"
            ]
            return random.choice(thank_responses)
        
        # Handle questions about the assistant with more comprehensive detection
        assistant_questions = [
            "who are you", "what can you do", "help me", "what are you", "tell me about yourself",
            "your capabilities", "what do you do", "how can you help", "what's your purpose",
            "how do you work", "your functions", "assistant info", "about you", "your features"
        ]
        
        if any(question in query_lower for question in assistant_questions):
            import random
            assistant_info_responses = [
                "I'm the InventIQ Smart Assistant, designed to help you manage your inventory efficiently. I can provide insights about:\n\n" + \
                "1. Low stock items and reorder recommendations\n" + \
                "2. Out of stock products that need immediate attention\n" + \
                "3. Category performance and which categories need focus\n" + \
                "4. Overall inventory health and valuation\n" + \
                "5. Product-specific details and stock history\n\n" + \
                "You can ask me questions like 'What products are low on stock?', 'Which categories need attention?', 'How is my overall inventory health?', or about specific products or categories. I'm here to make inventory management easier for you!",
                
                "I'm your InventIQ Smart Assistant! Think of me as your inventory management partner. My capabilities include:\n\n" + \
                "✓ Identifying low stock and out-of-stock items\n" + \
                "✓ Analyzing category performance metrics\n" + \
                "✓ Providing comprehensive inventory health reports\n" + \
                "✓ Offering product-specific insights and history\n" + \
                "✓ Suggesting optimal reorder quantities\n\n" + \
                "Just ask me anything about your inventory in natural language, and I'll provide the insights you need to make informed decisions!",
                
                "Hello! I'm your AI-powered inventory assistant, designed to transform how you manage stock. Here's what I can do for you:\n\n" + \
                "• Provide real-time low stock alerts and recommendations\n" + \
                "• Identify products that need immediate restocking\n" + \
                "• Analyze performance across different product categories\n" + \
                "• Assess overall inventory health and optimization opportunities\n" + \
                "• Deliver detailed product analytics and historical trends\n\n" + \
                "Simply ask me questions about your inventory in everyday language, and I'll handle the complex data analysis for you!",
                
                "I'm the InventIQ Smart Assistant, your inventory management companion! My purpose is to help you:\n\n" + \
                "1️⃣ Stay ahead of stock shortages with timely alerts\n" + \
                "2️⃣ Identify products requiring immediate attention\n" + \
                "3️⃣ Understand which product categories are thriving or struggling\n" + \
                "4️⃣ Get a complete picture of your inventory health\n" + \
                "5️⃣ Access detailed product insights instantly\n\n" + \
                "Ask me anything about your inventory, and I'll translate complex data into actionable insights. How can I assist you today?",
                
                "Greetings! I'm your InventIQ Smart Assistant, bringing AI-powered intelligence to your inventory management. My capabilities include:\n\n" + \
                "★ Stock level monitoring and alerts\n" + \
                "★ Out-of-stock product identification\n" + \
                "★ Category performance analysis\n" + \
                "★ Comprehensive inventory health assessment\n" + \
                "★ Product-specific analytics and history\n\n" + \
                "I understand natural language, so you can simply ask questions like you would to a human inventory specialist. How can I optimize your inventory management today?"
            ]
            return random.choice(assistant_info_responses)
        
        # Handle questions about InventIQ with more comprehensive detection
        inventiq_questions = [
            "what is inventiq", "about inventiq", "tell me about inventiq", "inventiq system",
            "inventiq features", "inventiq capabilities", "how does inventiq work", 
            "inventiq benefits", "why use inventiq", "inventiq overview", "inventiq details"
        ]
        
        if any(question in query_lower for question in inventiq_questions) or \
           ("inventiq" in query_lower and any(word in query_lower for word in ["what", "about", "tell", "how", "why"])):
            import random
            inventiq_info_responses = [
                "InventIQ is a next-generation smart inventory management system with the following key features:\n\n" + \
                "1. AI-Powered Smart Assistant: Natural language interface for inventory insights\n" + \
                "2. Predictive Analytics: Advanced demand forecasting and trend analysis\n" + \
                "3. Comprehensive Dashboard: Real-time inventory metrics and visualizations\n" + \
                "4. Smart Notifications: Automated alerts for low stock and reordering\n" + \
                "5. Voice Integration: Hands-free operation with voice commands\n" + \
                "6. Category Analysis: Performance tracking across product categories\n" + \
                "7. Multi-user Support: Role-based access for team collaboration\n\n" + \
                "InventIQ helps businesses optimize inventory levels, reduce costs, prevent stockouts, and make data-driven decisions for improved profitability and customer satisfaction.",
                
                "Welcome to InventIQ - your revolutionary inventory management solution! Here's what makes us special:\n\n" + \
                "🔹 Conversational AI Assistant - Talk to your inventory system naturally\n" + \
                "🔹 Smart Forecasting - Predict demand before it happens\n" + \
                "🔹 Interactive Dashboards - Visual insights at your fingertips\n" + \
                "🔹 Proactive Alerts - Never miss a reorder point again\n" + \
                "🔹 Voice-Controlled Interface - Manage inventory hands-free\n" + \
                "🔹 Deep Category Insights - Understand performance across product lines\n" + \
                "🔹 Team Collaboration Tools - Everyone stays in sync\n\n" + \
                "InventIQ transforms inventory from a cost center to a strategic advantage by eliminating stockouts, reducing excess inventory, and providing actionable intelligence.",
                
                "InventIQ is the intelligent inventory management platform designed for modern businesses:\n\n" + \
                "⚡ AI-Powered Insights - Get answers about your inventory in plain English\n" + \
                "⚡ Future-Proof Forecasting - Machine learning algorithms predict demand patterns\n" + \
                "⚡ Visual Analytics Dashboard - See your inventory health at a glance\n" + \
                "⚡ Intelligent Notification System - Get alerts before problems occur\n" + \
                "⚡ Voice Command System - Manage inventory while multitasking\n" + \
                "⚡ Product Category Intelligence - Optimize across product categories\n" + \
                "⚡ Collaborative Workflow - Perfect for teams of any size\n\n" + \
                "By implementing InventIQ, businesses typically reduce carrying costs by 20%, eliminate 95% of stockouts, and save 15+ hours per week on inventory management tasks.",
                
                "InventIQ: Redefining Inventory Management for the AI Age\n\n" + \
                "📊 Features That Set Us Apart:\n\n" + \
                "• Smart Assistant Technology - Ask questions in everyday language\n" + \
                "• Predictive Inventory Intelligence - Stay ahead of market demands\n" + \
                "• Dynamic Dashboard Environment - Customizable real-time metrics\n" + \
                "• Intelligent Alert Ecosystem - Timely, relevant notifications\n" + \
                "• Voice-First Interface Option - Effortless hands-free control\n" + \
                "• Category Performance Analytics - Granular product insights\n" + \
                "• Team Collaboration Platform - Streamlined communication\n\n" + \
                "InventIQ transforms inventory management from reactive to proactive, helping businesses maintain optimal stock levels while maximizing profitability and customer satisfaction.",
                
                "InventIQ is your intelligent inventory management solution built on cutting-edge technology:\n\n" + \
                "🔵 Core Capabilities:\n" + \
                "• Conversational AI - Natural language inventory management\n" + \
                "• Advanced Forecasting - ML-powered demand prediction\n" + \
                "• Intuitive Visualization - Clear, actionable dashboards\n" + \
                "• Smart Alert System - Context-aware notifications\n" + \
                "• Voice Control - Seamless speech recognition\n" + \
                "• Category Insights - Deep product performance analysis\n" + \
                "• Team Management - Role-based collaborative access\n\n" + \
                "Our system integrates with your existing workflows to provide immediate value through optimized stock levels, reduced carrying costs, and enhanced inventory intelligence."
            ]
            return random.choice(inventiq_info_responses)
        
        # Generate insights based on the query
        if 'low stock' in query_lower or 'running low' in query_lower or 'what products are low' in query_lower:
            if len(low_stock_items) > 0:
                # Group low stock items by category
                low_stock_by_category = low_stock_items.groupby('category')
                
                insights = f"Found {len(low_stock_items)} products with low stock:\n\n"
                
                # Show items by category
                for category, group in low_stock_by_category:
                    insights += f"Category: {category} ({len(group)} items)\n"
                    for _, item in group.iterrows():
                        insights += f"- {item['name']} (Current: {item['current_stock']}, Reorder level: {item['reorder_level']})\n"
                    insights += "\n"
            else:
                insights = "No products are currently running low on stock."
                
        elif 'critical' in query_lower or 'out of stock' in query_lower:
            if len(out_of_stock_items) > 0:
                # Group out of stock items by category
                out_of_stock_by_category = out_of_stock_items.groupby('category')
                
                insights = f"Found {len(out_of_stock_items)} products that are out of stock:\n\n"
                
                # Show items by category
                for category, group in out_of_stock_by_category:
                    insights += f"Category: {category} ({len(group)} items)\n"
                    for _, item in group.iterrows():
                        insights += f"- {item['name']} (Last known stock: 0, Reorder level: {item['reorder_level']})\n"
                    insights += "\n"
            else:
                insights = "No products are currently out of stock."
                
        elif 'categories' in query_lower or 'attention' in query_lower or 'which categories' in query_lower:
            # Identify categories with low stock and out of stock items
            category_low_stock = df[df['stock_status'] == 'LOW_STOCK'].groupby('category').size().reset_index(name='low_stock_count')
            category_out_stock = df[df['stock_status'] == 'OUT_OF_STOCK'].groupby('category').size().reset_index(name='out_stock_count')
            
            # Merge the two dataframes
            if not category_low_stock.empty:
                # Sort categories by number of low stock items
                category_low_stock = category_low_stock.sort_values('low_stock_count', ascending=False)
                top_category = category_low_stock.iloc[0]
                
                insights = f"The category requiring most attention is {top_category['category']} with {top_category['low_stock_count']} low stock items.\n\n"
                
                # List all categories with low stock items
                insights += "Categories with low stock items:\n"
                for _, row in category_low_stock.iterrows():
                    category = row['category']
                    count = row['low_stock_count']
                    insights += f"- {category}: {count} low stock items\n"
                    
                    # List the specific products in this category that are low on stock
                    low_stock_in_category = df[(df['stock_status'] == 'LOW_STOCK') & (df['category'] == category)]
                    for _, item in low_stock_in_category.iterrows():
                        insights += f"  * {item['name']} (Current: {item['current_stock']}, Reorder: {item['reorder_level']})\n"
                
                insights += "\n"
                
                # Add out of stock information if available
                if not category_out_stock.empty:
                    insights += "Categories with out of stock items:\n"
                    for _, row in category_out_stock.sort_values('out_stock_count', ascending=False).iterrows():
                        insights += f"- {row['category']}: {row['out_stock_count']} out of stock items\n"
                    insights += "\n"
                
                # Add general category statistics
                insights += "Category statistics:\n"
                for category, stats in category_stats.iterrows():
                    insights += f"- {category}: {stats['count']} products, Total stock: {stats['current_stock']}, Value: ${stats['total_value']:,.2f}\n"
            else:
                insights = "No categories currently need attention. All stock levels are normal."
        
        # Handle general inventory questions
        elif "inventory" in query_lower or "stock" in query_lower or "products" in query_lower or "health" in query_lower:
            # Provide a comprehensive inventory health summary
            insights = f"Inventory Health Summary:\n\n"
            insights += f"- Total Products: {len(df)}\n"
            insights += f"- Products Out of Stock: {len(out_of_stock_items)}\n"
            insights += f"- Products with Low Stock: {len(low_stock_items)}\n\n"
            
            if len(low_stock_items) > 0:
                insights += "Critical Items Requiring Attention:\n"
                for _, item in low_stock_items.head(5).iterrows():
                    insights += f"- {item['name']} (Current: {item['current_stock']}, Reorder: {item['reorder_level']})\n"
                if len(low_stock_items) > 5:
                    insights += f"...and {len(low_stock_items) - 5} more items\n"
            
            # Add category information
            insights += "\nCategory Overview:\n"
            for category, stats in category_stats.iterrows():
                insights += f"- {category}: {stats['count']} products, Value: ${stats['total_value']:,.2f}\n"
        
        else:
            # For any other query, provide the same detailed inventory health summary
            insights = f"Inventory Health Summary:\n\n"
            insights += f"- Total Products: {len(df)}\n"
            insights += f"- Products Out of Stock: {len(out_of_stock_items)}\n"
            insights += f"- Products with Low Stock: {len(low_stock_items)}\n\n"
            
            if len(low_stock_items) > 0:
                insights += "Critical Items Requiring Attention:\n"
                for _, item in low_stock_items.head(5).iterrows():
                    insights += f"- {item['name']} (Current: {item['current_stock']}, Reorder: {item['reorder_level']})\n"
                if len(low_stock_items) > 5:
                    insights += f"...and {len(low_stock_items) - 5} more items\n"
            
            # Add category information
            insights += "\nCategory Overview:\n"
            for category, stats in category_stats.iterrows():
                insights += f"- {category}: {stats['count']} products, Value: ${stats['total_value']:,.2f}\n"
        
        return insights
