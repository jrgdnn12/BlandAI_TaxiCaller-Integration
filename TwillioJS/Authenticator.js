const mysql = require('mysql');
const axios = require('axios');  // Include the axios library

// Database connection configuration
const dbConfig = {
    host: context.DB_HOST,
    user: context.DB_USER,
    password: context.DB_PASSWORD,
    database: context.DB_NAME
};

// Establish a database connection
const connection = mysql.createConnection(dbConfig);

exports.handler = function(context, event, callback) {
    const apiKey = context.API_KEY;  // Use context to access environment variables in Twilio
    const subject = '*';  
    // Base API URL from environment variables
    const apiBaseUrl = context.API_URL;
    // Call the external API to get a JWT token
    getJWTFromAPI(apiKey, subject).then(token => {
        console.log(`Received JWT token from API: ${token}`);

        // Store the JWT token in the database
        storeToken(token).then(storeTokenResult => {
            console.log(`JWT token stored: ${storeTokenResult}`);
            callback(null, {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'JWT token received from API and stored successfully',
                    token: token
                })
            });
        }).catch(error => {
            console.error('Error storing token:', error);
            callback(null, {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'Failed to store JWT token',
                    error: error.message,
                })
            });
        });
    }).catch(error => {
        console.error('Error fetching token:', error);
        callback(null, {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to retrieve JWT token',
                error: error.message,
            })
        });
    });
};

function getJWTFromAPI(apiKey, subject) {
    const url = `${apiBaseUrl}/api/v1/jwt/for-key`;
    return axios.get(url, {
        params: { key: apiKey, sub: subject }
    }).then(response => {
        return response.data.token;  // Assuming the API response contains the JWT in 'token' field
    });
}

function storeToken(token) {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO jwt_tokens (token) VALUES (?)';
        connection.query(query, [token], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.insertId);
            }
        });
    });
}
