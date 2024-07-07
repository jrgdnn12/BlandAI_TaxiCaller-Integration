// Function to process and store order data
async function processAndStoreOrderData(context, order_ID, callback) {
    const mysql = require('mysql');
    const axios = require('axios');
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
                connection.end();
                if (error) {
                    reject(error);
                } else {
                    resolve(results[0].token);
                }
            });
        });
    };

    // Function to store or update order data in orders_json
    const storeOrderData = async (orderID, orderData) => {
        return new Promise((resolve, reject) => {
            const connection = mysql.createConnection(db_config);
            connection.connect();
            const query = `
                INSERT INTO orders_json (order_id, order_data)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE order_data = VALUES(order_data)
            `;
            connection.query(query, [orderID, JSON.stringify(orderData)], (error, results) => {
                connection.end();
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };

    try {
        const bookingID = order_ID; // Assuming bookingID is passed through the event parameter
        if (!bookingID) {
            throw new Error("Booking ID is required");
        }
        
        console.log(bookingID);
        const jwtToken = await getJwtToken();
        const apiUrl = `${apiBaseUrl}/api/v1/booker/order/${bookingID}`;
        const orderResponse = await axios.get(apiUrl, {
            headers: { Authorization: `Bearer ${jwtToken}` }
        });
        const orderData = orderResponse.data;

        await storeOrderData(bookingID, orderData);
        callback(null, { status: 'success', message: 'Order processed successfully' });
    } catch (error) {
        console.error('Error processing order:', error);
        callback(error);
    }
}

// Export this function to be used in other Twilio functions
module.exports = { processAndStoreOrderData };
