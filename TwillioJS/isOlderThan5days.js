const mysql = require('mysql');

exports.handler = function(context, event, callback) {
    const config = {
        host: context.DB_HOST,
        user: context.DB_USER,
        password: context.DB_PASSWORD,
        database: context.DB_NAME
    };
    
    const connection = mysql.createConnection(config);
    
    const fromNumber = event.From;
    const query = "SELECT * FROM anilanguage WHERE callid = ? ORDER BY updateDate DESC LIMIT 1";
    
    connection.query(query, [fromNumber], (error, results) => {
        if (error) {
            connection.end();
            return callback(error);
        }
        
        const currentDate = new Date();
        
        if (results.length === 0) {
            // No records found
            connection.end();
            return callback(null, { isOlderThan5Days: true });
        }
        
        const latestRecord = results[0];
        const updateDate = new Date(latestRecord.updateDate);
        const diffTime = Math.abs(currentDate - updateDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        connection.end();
        
        const isOlderThan5Days = diffDays > 5;
        
        return callback(null, { isOlderThan5Days: isOlderThan5Days });
    });
};
