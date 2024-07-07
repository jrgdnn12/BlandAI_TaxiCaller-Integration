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
    const selectQuery = "SELECT isEnglish FROM anilanguage WHERE callid = ? ORDER BY updateDate DESC LIMIT 1";

    connection.query(selectQuery, [fromNumber], (selectError, results) => {
        connection.end();

        if (selectError) {
            return callback(selectError);
        }

        if (results.length === 0) {
            return callback(null, { message: "No record found for the given call ID." });
        } else {
            return callback(null, { isEnglish: results[0].isEnglish });
        }
    });
};
