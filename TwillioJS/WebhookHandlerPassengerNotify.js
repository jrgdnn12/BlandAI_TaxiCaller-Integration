const mysql = require('mysql');

exports.handler = function(context, event, callback) {
    const client = require('twilio')(context.ACCOUNT_SID, context.AUTH_TOKEN);

    const dbConfig = {
        host: context.DB_HOST,
        user: context.DB_USER,
        password: context.DB_PASSWORD,
        database: context.DB_NAME
    };

    const connection = mysql.createConnection(dbConfig);
    let phoneNumber = event.Passenger_Phone_Number;

    // Normalize the phone number
    phoneNumber = phoneNumber.replace('+', '').replace(/-/g, '');
    phoneNumber = phoneNumber.startsWith('1') ? phoneNumber : '1' + phoneNumber;

    console.log(phoneNumber); // Debugging the phone number after normalization

    const eventType = event.Event_Type;
    const trackUrl = decodeURIComponent(event.Track_My_Ride_URL);
    const eta = decodeURIComponent(event.Estimated_Pick_Up_Time);

    connection.connect(err => {
        if (err) {
            console.error('Database connection error:', err);
            return callback(err);
        }

        const query = "SELECT isEnglish FROM anilanguage WHERE callid = ? ORDER BY updateDate DESC LIMIT 1";
        connection.query(query, [phoneNumber], (error, results) => {
            connection.end();

            if (error) {
                console.error('Query error:', error);
                return callback(error);
            }

            const isEnglish = results.length && results[0].isEnglish === 1;
            let message = "";

            if (['created_asap', 'Callout', 'Waiting', 'Canceled', 'no_show', 'Client Canceled'].includes(eventType)) {
                switch (eventType) {
                    case 'created_asap':
                        message = isEnglish
                            ? `Hi! This is WOO Transportation. I'll update you as soon as I have a car on the way. Track your ride: ${trackUrl}`
                            : `¡Hola! Esto es WOO Transportation. Te actualizaré tan pronto como tenga un coche en camino. Sigue tu viaje: ${trackUrl}`;
                        break;
                    case 'Callout':
                        message = isEnglish
                            ? `Your Driver Will arrive at approximately ${eta}. Track your ride: ${trackUrl}`
                            : `Su conductor llegará a las ${eta}. Sigue tu viaje: ${trackUrl}`;
                        break;
                    case 'Waiting':
                        message = isEnglish
                            ? "Your Driver is on location and waiting."
                            : "Su conductor está en el lugar y esperando.";
                        break;
                    case 'Canceled':
                    case 'no_show':
                    case 'Client Canceled':
                        message = isEnglish
                            ? "Your ride has been cancelled. If this was an error please call back and we will fix it."
                            : "Su viaje ha sido cancelado. Si esto fue un error, por favor llame de nuevo y lo solucionaremos.";
                        break;
                }

                // Send the SMS
                client.messages.create({
                    to: phoneNumber, 
                    messagingServiceSid: context.MESSENGER_SID,
                    body: message
                }, (err, result) => {
                    if (err) {
                        console.error('SMS sending error:', err);
                        return callback(err);
                    }
                    callback(null, "SMS sent successfully");
                });
            } else {
                // If event type does not match any case, do not send an SMS and just end the function
                callback(null, "No SMS sent due to unmatched event type");
            }
        });
    });
};
