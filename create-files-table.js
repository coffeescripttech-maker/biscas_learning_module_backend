const mysql = require('mysql2/promise');
require('dotenv').config();

async function createFilesTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Connected to database');

    // Check if files table exists
    const [tables] = await connection.query('SHOW TABLES LIKE "files"');
    
    if (tables.length > 0) {
      console.log('✅ Files table already exists');
    } else {
      console.log('Creating files table...');
      
      await connection.query(`
        CREATE TABLE files (
          id CHAR(36) PRIMARY KEY,
          user_id CHAR(36) NOT NULL,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          mimetype VARCHAR(100) NOT NULL,
          size BIGINT NOT NULL,
          path TEXT NOT NULL,
          folder VARCHAR(100),
          url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_folder (folder),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Files table created successfully!');
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

createFilesTable();
