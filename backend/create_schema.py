import mysql.connector

def create_schema():
    # Connect to MySQL
    connection = mysql.connector.connect(
        host='localhost',
        user='root',
        password='Sql@2025'
    )
    cursor = connection.cursor()

    try:
        # Read schema file
        with open('schema.sql', 'r') as file:
            sql_commands = file.read().split(';')
            
            # Execute each command
            for command in sql_commands:
                if command.strip():
                    cursor.execute(command)
                    
            connection.commit()
            print("Schema created successfully!")
            
    except Exception as e:
        print(f"Error creating schema: {str(e)}")
        connection.rollback()
    finally:
        cursor.close()
        connection.close()

if __name__ == '__main__':
    create_schema()
