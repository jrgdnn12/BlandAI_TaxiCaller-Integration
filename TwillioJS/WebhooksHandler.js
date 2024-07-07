const moment = require('moment-timezone');
const mysql = require('mysql');

function parseDate(dateStr) {
    if (!dateStr || dateStr === '-') return null;
    
    if (dateStr.toLowerCase() === 'asap') {
        return moment().tz("America/New_York").format('YYYY-MM-DD HH:mm:ss'); // Adjusted to EST
    }

    try {
        const dateObject = moment(dateStr, 'MM/DD/YYYY hh:mm A', true);
        if (dateObject.isValid()) {
            return dateObject.format('YYYY-MM-DD HH:mm:ss');
        } else {
            console.log('Invalid date format:', dateStr);
            return null;
        }
    } catch (error) {
        console.log('Date parsing exception:', error);
        return null;
    }
}

exports.handler = function(context, event, callback) {
    const connection = mysql.createConnection({
        host: context.DB_HOST,
        user: context.DB_USER,
        password: context.DB_PASSWORD,
        database: context.DB_NAME
    });

    // Connect to the database
    connection.connect(err => {
        if (err) {
            console.error('Database connection failed:', err);
            callback(err);
            return;
        }

        const query = `INSERT INTO webhook_events (vehicle_number, license_plate, vehicle_make, vehicle_color, driver_phone_number, driver_first_name, driver_last_name, passenger_first_name, passenger_last_name, passenger_phone_number, job_id, booking_id, pick_up_location, drop_off_location, estimated_pick_up_time, actual_pickup_date_time, job_start_date_time, arrival_date_time, passenger_on_board_date_time, drop_off_date_time, job_closed_date_time, quoted_price, quoted_currency, fare_grand_total, company_name, booking_source, track_my_ride_url, cost_code, project_name, reference, customer_account_balance, event_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        vehicle_number = VALUES(vehicle_number),
        license_plate = VALUES(license_plate),
        vehicle_make = VALUES(vehicle_make),
        vehicle_color = VALUES(vehicle_color),
        driver_phone_number = VALUES(driver_phone_number),
        driver_first_name = VALUES(driver_first_name),
        driver_last_name = VALUES(driver_last_name),
        passenger_first_name = VALUES(passenger_first_name),
        passenger_last_name = VALUES(passenger_last_name),
        passenger_phone_number = VALUES(passenger_phone_number),
        pick_up_location = VALUES(pick_up_location),
        drop_off_location = VALUES(drop_off_location),
        estimated_pick_up_time = COALESCE(VALUES(estimated_pick_up_time), estimated_pick_up_time),
        actual_pickup_date_time = COALESCE(VALUES(actual_pickup_date_time), actual_pickup_date_time),
        job_start_date_time = COALESCE(VALUES(job_start_date_time), job_start_date_time),
        arrival_date_time = COALESCE(VALUES(arrival_date_time), arrival_date_time),
        passenger_on_board_date_time = COALESCE(VALUES(passenger_on_board_date_time), passenger_on_board_date_time),
        drop_off_date_time = COALESCE(VALUES(drop_off_date_time), drop_off_date_time),
        job_closed_date_time = COALESCE(VALUES(job_closed_date_time), job_closed_date_time),
        quoted_price = VALUES(quoted_price),
        quoted_currency = VALUES(quoted_currency),
        fare_grand_total = VALUES(fare_grand_total),
        company_name = VALUES(company_name),
        booking_source = VALUES(booking_source),
        track_my_ride_url = VALUES(track_my_ride_url),
        cost_code = VALUES(cost_code),
        project_name = VALUES(project_name),
        reference = VALUES(reference),
        customer_account_balance = VALUES(customer_account_balance),
        event_type = VALUES(event_type);`;

        const values = [
            event.Vehicle_Number, event.License_Plate, event.Make, event.Color,
            event.Driver_Phone_Number, event.Driver_First_Name, event.Driver_Last_Name,
            event.Passenger_First_Name, event.Passenger_Last_Name, event.Passenger_Phone_Number,
            event.Job_ID, event.Order_ID, event.Pick_Up, event.Drop_Off,
            event.Estimated_Pick_Up_Time, parseDate(event.Actual_Pickup_Date_and_Time), parseDate(event.Job_Start_Date_and_Time),
            parseDate(event.Arrival_Date_and_Time), parseDate(event.Passenger_On_Board_Date_and_Time), parseDate(event.Drop_Off_Date_and_Time),
            parseDate(event.Job_Closed_Date_and_Time), event.Quoted_Price, event.Quoted_Currency,
            event.Fare_Grand_Total, event.Company_Name, event.Booking_Source, event.Track_My_Ride_URL,
            event.Cost_Code, event.Project, event.Reference, event.Customer_Account_Balance, event.Event_Type
        ];

        if (event.Event_Type === "Delivered") {
            // Handle special 'Delivered' event type logic here
            // Assume deliveredOrderJson is another function within the same service
            const deliveredOrderJsonPath = Runtime.getFunctions()['deliveredOrderJson'].path;
            console.log(deliveredOrderJsonPath);
            const deliveredOrderJson = require(deliveredOrderJsonPath);
            deliveredOrderJson.processAndStoreOrderData(context, event.Order_ID, (err, result) => {
                if (err) {
                    console.error('Error calling deliveredOrderJson:', err);
                    // Proceed to insert/update in database even if there was an error
                } else {
                    console.log('deliveredOrderJson executed successfully:', result);
                }
                // Continue to database operation even after handling 'Delivered'
                executeDatabaseOperation();
            });
        } else {
            // Directly execute database operation if not 'Delivered'
            executeDatabaseOperation();
        }

        function executeDatabaseOperation() {
            connection.query(query, values, (error, results) => {
                if (error) {
                    console.error('Failed to insert or update data in database:', error);
                    callback(error);
                } else {
                    console.log('Data inserted or updated in database successfully:', results);
                    let response = new Twilio.Response();
                    response.setStatusCode(200);
                    response.setBody("Tack och hej, leverpastej");
                    response.appendHeader('Content-Type', 'text/plain');
                    callback(null, response);
                }
                connection.end();
            });
        }
    });
};
