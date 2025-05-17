USE inventiq_next_gen;
ALTER TABLE user MODIFY COLUMN password_hash VARCHAR(512);
