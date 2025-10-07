const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',     // promijeni ako ti je drugačiji user
    password: 'korjen123',     // stavi svoju lozinku
    database: 'sisanje'
});

module.exports = pool.promise();
