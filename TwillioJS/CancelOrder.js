const mysql = require('mysql');
const axios = require('axios');

// Twilio Function Handler
exports.handler = async function(context, event, callback) {
  // Database configuration from environment variables
  const db_config = {
    host: context.DB_HOST,
    user: context.DB_USER,
    password: context.DB_PASSWORD,
    database: context.DB_NAME
  };
  // Base API URL from environment variables
  const apiBaseUrl = context.API_URL;

  // Function to get JWT token from the database
  const getJwtToken = async () => {
    return new Promise((resolve, reject) => {
      const connection = mysql.createConnection(db_config);
      connection.connect(err => {
        if (err) {
          reject(err);
          return;
        }
        connection.query("SELECT token FROM jwt_tokens ORDER BY created_at DESC LIMIT 1", (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results[0].token);
          }
          connection.end();
        });
      });
    });
  };

  // Function to cancel order using API
  const cancelOrder = async (order_id, token) => {
    const url = `${apiBaseUrl}/api/v1/booker/order/${order_id}/cancel`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    try {
      const response = await axios.post(url, {}, { headers: headers });
      return response.data;
    } catch (error) {
      console.error('Failed API call with URL:', url);
      if (error.response) {
        console.error('API responded with:', error.response.status, error.response.data);
        return error.response.data;
      } else {
        console.error('API call failed with no response:', error);
        return { error: 'API call failed with no response' };
      }
    }
  };

  try {
    const jwtToken = await getJwtToken();
    if (!jwtToken) {
      return callback(null, 'Error fetching JWT');
    }
    const bookingId = event.bookingID; // Assuming bookingID is passed from Studio Flow
    const result = await cancelOrder(bookingId, jwtToken);
    callback(null, result);
  } catch (err) {
    console.error('Error in processing:', err);
    callback(err);
  }
};
