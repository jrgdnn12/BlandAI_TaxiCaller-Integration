exports.handler = function(context, event, callback) {
    const accountSid = context.ACCOUNT-SID;
    const authToken = context.AUTH_TOKEN;  // It's better to use environment variables for sensitive data
    const client = require('twilio')(accountSid, authToken);

    const toNumbers = event.To.split(','); // Assume 'To' is a comma-separated list of numbers
    const messagingServiceSid = context.MESSENGER_SID;

    // Replace \n with literal line breaks
    const body = event.Body.replace(/\\n/g, '\n').trim();

    console.log('Attempting to send:', body); // Log to check the message content

    let promises = [];

    // Sending a message to each number in the list
    toNumbers.forEach(to => {
        promises.push(
            client.messages.create({
                to: to.trim(),
                body: body,
                messagingServiceSid: messagingServiceSid
            })
        );
    });

    // Wait for all messages to be sent
    Promise.all(promises)
        .then(messages => {
            console.log('All messages sent successfully');
            callback(null, 'All messages sent successfully');
        })
        .catch(error => {
            console.error('Failed to send one or more messages:', error);
            callback(error);
        });
};
