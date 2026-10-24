const fs = require('fs');
const path = require('path');
const mysql = require('../backend/node_modules/mysql2/promise');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
async function initialize() {
 const name = process.env.DB_NAME;
 if (!name || !/^[a-zA-Z0-9_]+$/.test(name)) throw new Error('Set DB_NAME to a valid database name.');
 const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: name, multipleStatements: true });
 try {
  const [tables] = await connection.query('SHOW TABLES');
  if (tables.length) throw new Error('Refusing to initialize a nonempty database. Use a NEW empty development database.');
  await connection.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  await connection.query(fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8'));
  console.log('Development schema and existing seed loaded.');
 } finally { await connection.end(); }
}
initialize().catch(error => { console.error('Database initialization failed. Check configuration and database state.'); process.exitCode = 1; });
