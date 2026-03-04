/**
 * Database utility functions
 * Provides query wrappers, transaction support, and prepared statement helpers
 */

const { getPool } = require('../config/database');
const logger = require('./logger');

/**
 * Custom database error class
 */
class DatabaseError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.originalError = originalError;
  }
}

/**
 * Execute a query with error handling and logging
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Query results
 */
async function query(sql, params = [], options = {}) {
  const startTime = Date.now();
  const pool = getPool();
  
  try {
    logger.debug('Executing query', {
      sql: sql.substring(0, 100), // Log first 100 chars
      paramCount: params.length
    });

    const [rows] = await pool.query(sql, params);
    
    const duration = Date.now() - startTime;
    logger.debug('Query executed successfully', {
      duration: `${duration}ms`,
      rowCount: Array.isArray(rows) ? rows.length : 1
    });

    return rows;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Query execution failed', {
      sql: sql.substring(0, 100),
      error: error.message,
      code: error.code,
      duration: `${duration}ms`
    });

    // Map MySQL error codes to custom error codes
    const errorCode = mapErrorCode(error.code);
    throw new DatabaseError(
      error.message,
      errorCode,
      error
    );
  }
}

/**
 * Execute a query and return the first row
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} - First row or null
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute an INSERT query and return the inserted ID
 * @param {string} sql - SQL INSERT statement
 * @param {Array} params - Query parameters
 * @returns {Promise<number>} - Inserted ID
 */
async function insert(sql, params = []) {
  const result = await query(sql, params);
  return result.insertId;
}

/**
 * Execute an UPDATE query and return affected rows count
 * @param {string} sql - SQL UPDATE statement
 * @param {Array} params - Query parameters
 * @returns {Promise<number>} - Number of affected rows
 */
async function update(sql, params = []) {
  const result = await query(sql, params);
  return result.affectedRows;
}

/**
 * Execute a DELETE query and return affected rows count
 * @param {string} sql - SQL DELETE statement
 * @param {Array} params - Query parameters
 * @returns {Promise<number>} - Number of affected rows
 */
async function remove(sql, params = []) {
  const result = await query(sql, params);
  return result.affectedRows;
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} callback - Async function that receives connection
 * @returns {Promise<any>} - Result from callback
 */
async function transaction(callback) {
  const pool = getPool();
  const connection = await pool.getConnection();
  
  try {
    logger.debug('Starting transaction');
    await connection.beginTransaction();
    
    // Create transaction-scoped query functions
    const txQuery = async (sql, params = []) => {
      const startTime = Date.now();
      try {
        logger.debug('Executing transaction query', {
          sql: sql.substring(0, 100),
          paramCount: params.length
        });

        const [rows] = await connection.query(sql, params);
        
        const duration = Date.now() - startTime;
        logger.debug('Transaction query executed', {
          duration: `${duration}ms`,
          rowCount: Array.isArray(rows) ? rows.length : 1
        });

        return rows;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Transaction query failed', {
          sql: sql.substring(0, 100),
          error: error.message,
          code: error.code,
          duration: `${duration}ms`
        });
        throw error;
      }
    };

    // Execute callback with transaction query function
    const result = await callback(txQuery, connection);
    
    // Commit transaction
    await connection.commit();
    logger.debug('Transaction committed successfully');
    
    return result;
  } catch (error) {
    // Rollback on error
    logger.warn('Rolling back transaction', {
      error: error.message,
      code: error.code
    });
    
    try {
      await connection.rollback();
      logger.debug('Transaction rolled back successfully');
    } catch (rollbackError) {
      logger.error('Rollback failed', {
        error: rollbackError.message
      });
    }
    
    // Map and throw error
    const errorCode = mapErrorCode(error.code);
    throw new DatabaseError(
      error.message,
      errorCode,
      error
    );
  } finally {
    connection.release();
    logger.debug('Transaction connection released');
  }
}

/**
 * Prepared statement helper - builds parameterized INSERT statement
 * @param {string} table - Table name
 * @param {Object} data - Data object with column names as keys
 * @returns {Object} - { sql, params }
 */
function buildInsert(table, data) {
  const columns = Object.keys(data);
  const values = Object.values(data);
  
  const columnList = columns.join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${table} (${columnList}) VALUES (${placeholders})`;
  
  return { sql, params: values };
}

/**
 * Prepared statement helper - builds parameterized UPDATE statement
 * @param {string} table - Table name
 * @param {Object} data - Data object with column names as keys
 * @param {Object} where - Where conditions object
 * @returns {Object} - { sql, params }
 */
function buildUpdate(table, data, where) {
  const dataColumns = Object.keys(data);
  const dataValues = Object.values(data);
  
  const whereColumns = Object.keys(where);
  const whereValues = Object.values(where);
  
  const setClause = dataColumns.map(col => `${col} = ?`).join(', ');
  const whereClause = whereColumns.map(col => `${col} = ?`).join(' AND ');
  
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const params = [...dataValues, ...whereValues];
  
  return { sql, params };
}

/**
 * Prepared statement helper - builds parameterized DELETE statement
 * @param {string} table - Table name
 * @param {Object} where - Where conditions object
 * @returns {Object} - { sql, params }
 */
function buildDelete(table, where) {
  const whereColumns = Object.keys(where);
  const whereValues = Object.values(where);
  
  const whereClause = whereColumns.map(col => `${col} = ?`).join(' AND ');
  
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
  
  return { sql, params: whereValues };
}

/**
 * Prepared statement helper - builds parameterized SELECT statement
 * @param {string} table - Table name
 * @param {Object} options - Query options
 * @param {Object} options.where - Where conditions
 * @param {Array<string>} options.columns - Columns to select (default: *)
 * @param {string} options.orderBy - Order by clause
 * @param {number} options.limit - Limit
 * @param {number} options.offset - Offset
 * @returns {Object} - { sql, params }
 */
function buildSelect(table, options = {}) {
  const {
    where = {},
    columns = ['*'],
    orderBy = null,
    limit = null,
    offset = null
  } = options;
  
  const columnList = columns.join(', ');
  let sql = `SELECT ${columnList} FROM ${table}`;
  const params = [];
  
  // Add WHERE clause
  if (Object.keys(where).length > 0) {
    const whereColumns = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereColumns.map(col => `${col} = ?`).join(' AND ');
    
    sql += ` WHERE ${whereClause}`;
    params.push(...whereValues);
  }
  
  // Add ORDER BY clause
  if (orderBy) {
    sql += ` ORDER BY ${orderBy}`;
  }
  
  // Add LIMIT clause
  if (limit !== null) {
    sql += ` LIMIT ?`;
    params.push(limit);
  }
  
  // Add OFFSET clause
  if (offset !== null) {
    sql += ` OFFSET ?`;
    params.push(offset);
  }
  
  return { sql, params };
}

/**
 * Execute a batch insert operation
 * @param {string} table - Table name
 * @param {Array<Object>} records - Array of data objects
 * @param {number} batchSize - Number of records per batch
 * @returns {Promise<number>} - Total number of inserted records
 */
async function batchInsert(table, records, batchSize = 100) {
  if (records.length === 0) {
    return 0;
  }

  const columns = Object.keys(records[0]);
  const columnList = columns.join(', ');
  
  let totalInserted = 0;
  
  // Process in batches
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    // Build multi-row INSERT
    const placeholders = batch.map(() => 
      `(${columns.map(() => '?').join(', ')})`
    ).join(', ');
    
    const sql = `INSERT INTO ${table} (${columnList}) VALUES ${placeholders}`;
    
    // Flatten values
    const params = batch.flatMap(record => 
      columns.map(col => record[col])
    );
    
    const result = await query(sql, params);
    totalInserted += result.affectedRows;
    
    logger.debug('Batch insert completed', {
      table,
      batchNumber: Math.floor(i / batchSize) + 1,
      recordsInBatch: batch.length,
      totalInserted
    });
  }
  
  return totalInserted;
}

/**
 * Map MySQL error codes to application error codes
 * @param {string} mysqlCode - MySQL error code
 * @returns {string} - Application error code
 */
function mapErrorCode(mysqlCode) {
  const errorMap = {
    'ER_DUP_ENTRY': 'DB_DUPLICATE_ENTRY',
    'ER_NO_REFERENCED_ROW': 'DB_FOREIGN_KEY_VIOLATION',
    'ER_NO_REFERENCED_ROW_2': 'DB_FOREIGN_KEY_VIOLATION',
    'ER_ROW_IS_REFERENCED': 'DB_FOREIGN_KEY_VIOLATION',
    'ER_ROW_IS_REFERENCED_2': 'DB_FOREIGN_KEY_VIOLATION',
    'ER_BAD_NULL_ERROR': 'DB_NULL_VIOLATION',
    'ER_NO_DEFAULT_FOR_FIELD': 'DB_MISSING_REQUIRED_FIELD',
    'ER_DATA_TOO_LONG': 'DB_DATA_TOO_LONG',
    'ER_TRUNCATED_WRONG_VALUE': 'DB_INVALID_VALUE',
    'ER_LOCK_WAIT_TIMEOUT': 'DB_LOCK_TIMEOUT',
    'ER_LOCK_DEADLOCK': 'DB_DEADLOCK',
    'ECONNREFUSED': 'DB_CONNECTION_ERROR',
    'ETIMEDOUT': 'DB_CONNECTION_TIMEOUT',
    'PROTOCOL_CONNECTION_LOST': 'DB_CONNECTION_LOST'
  };
  
  return errorMap[mysqlCode] || 'DB_QUERY_ERROR';
}

module.exports = {
  // Core query functions
  query,
  queryOne,
  insert,
  update,
  remove,
  
  // Transaction support
  transaction,
  
  // Prepared statement helpers
  buildInsert,
  buildUpdate,
  buildDelete,
  buildSelect,
  
  // Batch operations
  batchInsert,
  
  // Error handling
  DatabaseError,
  mapErrorCode
};
