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
    const isEnglish = parseInt(event.isEnglish);  // Retrieve the 'isEnglish' from the event, ensure it's an integer
    const updateQuery = "UPDATE anilanguage SET isEnglish = ?, updateDate = NOW() WHERE callid = ?";
    const insertQuery = "INSERT INTO anilanguage (callid, isEnglish, updateDate) VALUES (?, ?, NOW())";

    connection.query(updateQuery, [isEnglish, fromNumber], (updateError, updateResults) => {
        if (updateError) {
            connection.end();
            return callback(updateError);
        }

        if (updateResults.affectedRows === 0) {
            // No rows affected, insert new record
            connection.query(insertQuery, [fromNumber, isEnglish], (insertError) => {
                connection.end();

                if (insertError) {
                    return callback(insertError);
                }

                return callback(null, { message: "New record inserted with language set to " + isEnglish + "." });
            });
        } else {
            connection.end();
            return callback(null, { message: "Existing record updated with language set to " + isEnglish + "." });
        }
    });
};
