const { Pool } = require('pg');


const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Aromas-y-Regallos',
    password: 'postgres',
    port: 5432,
});