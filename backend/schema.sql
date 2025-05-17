-- Drop database if exists
DROP DATABASE IF EXISTS inventiq_next_gen;

-- Create database
CREATE DATABASE inventiq_next_gen;

-- Use the database
USE inventiq_next_gen;

-- Create users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    last_login DATETIME
);

-- Create products table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    supplier VARCHAR(100) NOT NULL,
    current_stock INT NOT NULL,
    reorder_level INT NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    lead_time FLOAT NOT NULL,
    historical_sales JSON
);
