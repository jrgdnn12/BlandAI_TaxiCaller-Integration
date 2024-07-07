exports.handler = async function(context, event, callback) {
    const mysql = require('mysql');
    const axios = require('axios');

    // Extract the booking_ID from the Studio Flow
    const bookingID = event.booking_ID;

    // Database connection configuration from environment variables
    const db_config = {
        host: context.DB_HOST,
        user: context.DB_USER,
        password: context.DB_PASSWORD,
        database: context.DB_NAME
    };

    // Base API URL from environment variables
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

    // Function to get order data from orders_json table
    const getOrderDataFromDatabase = async (bookingID) => {
        return new Promise((resolve, reject) => {
            const connection = mysql.createConnection(db_config);
            const query = "SELECT order_data FROM orders_json WHERE order_id = ?";
            
            connection.connect();
            connection.query(query, [bookingID], (error, results) => {
                if (error) {
                    reject(error);
                } else if (results.length === 0) {
                    reject(new Error('Order not found in database'));
                } else {
                    resolve(JSON.parse(results[0].order_data));
                }
                connection.end();
            });
        });
    };

    try {
        // Get JWT token
        const jwtToken = await getJwtToken();

        // Log the JWT token
        console.log('JWT Token:', jwtToken);

        let orderData;

        // Attempt to get order data from API
        const apiUrl = `${apiBaseUrl}/api/v1/booker/order/${bookingID}`;
      

        try {
            const getResponse = await axios.get(apiUrl, {
                headers: {
                    Authorization: `Bearer ${jwtToken}`
                }
            });
            orderData = getResponse.data;
        } catch (apiError) {
            if (apiError.response && (apiError.response.status === 500 || (apiError.response.status === 400 && apiError.response.data.errors && apiError.response.data.errors.some(error => error.err_msg.includes("No job found for id"))))) {
                // If API returns a 500 error or specific 400 error, fall back to database
            
                orderData = await getOrderDataFromDatabase(bookingID);
            } else {
                // If other errors, rethrow
                throw apiError;
            }
        }

        // Map the response data to the required format
        const postData = {
            order: {
                company_id: orderData.order.company_id,
                provider_id: orderData.order.provider_id || 0,
                items: orderData.order.items.map(item => ({
                    "@type": "passengers",
                    seq: item.seq,
                    passenger: {
                        name: item.passenger.name,
                        email: item.passenger.email,
                        phone: item.passenger.phone
                    },
                    client_id: item.client_id || 0,
                    account: item.account || { id: 0 },
                    require: {
                        seats: item.require.seats,
                        wc: item.require.wc,
                        bags: item.require.bags
                    },
                    pay_info: item.pay_info.map(pay => ({
                        "@t": pay["@t"],
                        data: pay.data || null
                    }))
                })),
                route: {
                    meta: {
                        est_dur: orderData.order.route.meta.est_dur,
                        dist: orderData.order.route.meta.dist
                    },
                    nodes: orderData.order.route.nodes.map(node => ({
                        seq: node.seq,
                        location: {
                            name: node.location.name,
                            coords: node.location.coords
                        },
                        times: node.times ? {
                            arrive: {
                                target: 0
                            }
                        } : null,
                        info: node.info,
                        actions: node.actions.map(action => ({
                            "@type": "client_action",
                            item_seq: action.item_seq,
                            action: action.action
                        }))
                    })),
                    legs: orderData.order.route.legs.map(leg => ({
                        from_seq: leg.from_seq,
                        to_seq: leg.to_seq,
                        pts: leg.pts,
                        meta: leg.meta
                    }))
                }
            }
        };


        // Make API POST request to submit the order
        const postApiUrl = `${apiBaseUrl}/api/v1/booker/order`;
        const postResponse = await axios.post(postApiUrl, postData, {
            headers: {
                Authorization: `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Return the POST API response
        callback(null, postResponse.data);
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
