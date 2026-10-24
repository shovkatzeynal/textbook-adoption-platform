const mysql = require('mysql2/promise');
const config = require('./config');
const pool = mysql.createPool(config.db);
pool.on('connection', connection => connection.query("SET time_zone = '+00:00'"));
module.exports = pool;
