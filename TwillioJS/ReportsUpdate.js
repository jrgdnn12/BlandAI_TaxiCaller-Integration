exports.handler = async function(context, event, callback) {
    const mysql = require('mysql');
    const axios = require('axios');
    const moment = require('moment-timezone');

    // Database connection configuration from environment variables
    const db_config = {
        host: context.DB_HOST,
        user: context.DB_USER,
        password: context.DB_PASSWORD,
        database: context.DB_NAME
    };
    const apiBaseUrl = context.API_URL;

    // Function to get JWT token from database
    const getJwtToken = async () => {
        return new Promise((resolve, reject) => {
            const connection = mysql.createConnection(db_config);
            connection.connect();
            connection.query("SELECT token FROM jwt_tokens ORDER BY created_at DESC LIMIT 1", (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results[0].token);
                }
                connection.end();
            });
        });
    };

    // Function to get recent booking IDs from job_reports table that are not in orders_json table
    const getRecentBookingIDs = async () => {
        return new Promise((resolve, reject) => {
            const connection = mysql.createConnection(db_config);
            const sixHoursAgo = moment().tz('America/New_York').subtract(6, 'hours').format('YYYY-MM-DD HH:mm:ss');
            const query = `
                SELECT booking_ID
                FROM webhook_events
                WHERE actual_pickup_date_time > ?
            `;

            connection.connect();
            connection.query(query, [sixHoursAgo], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results.map(row => row.booking_ID));
                }
                connection.end();
            });
        });
    };

    // Function to store or update order data in orders_json
    const storeOrderData = async (orderID, orderData) => {
        return new Promise((resolve, reject) => {
            const connection = mysql.createConnection(db_config);
            const query = `
                INSERT INTO orders_json (order_id, order_data)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE order_data = VALUES(order_data)
            `;

            connection.connect();
            connection.query(query, [orderID, JSON.stringify(orderData)], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
                connection.end();
            });
        });
    };

    try {
        // Get JWT token
        const jwtToken = await getJwtToken();

        // Get recent booking IDs from job_reports table that are not in orders_json table
        const bookingIDs = await getRecentBookingIDs();

        // Process each booking ID
        for (const bookingID of bookingIDs) {
            // Fetch order status from API
            const apiUrl = `${apiBaseUrl}/api/v1/booker/order/${bookingID}`;
            const getResponse = await axios.get(apiUrl, {
                headers: {
                    Authorization: `Bearer ${jwtToken}`
                }
            });

            const orderData = getResponse.data;

            // Store or update order data
            await storeOrderData(bookingID, orderData);
        }

        callback(null, { status: 'success' });
    } catch (error) {
        // Log the full error response
        if (error.response) {
            console.error('Error response data:', error.response.data);
            console.error('Error response status:', error.response.status);
            console.error('Error response headers:', error.response.headers);
        } else {
            console.error('Error message:', error.message);
        }

        callback(error);
    }
};
