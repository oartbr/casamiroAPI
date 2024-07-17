import twilio from 'twilio';

const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;
const commClient = twilio(accountSid, authToken);

commClient.messages
  .create({
    body: 'Your appointment is coming up on July 21 at 3PM',
    from: process.env.ACCOUNTSID,
    to: process.env.FROMWHATS,
  })
  .then((message) => console.log(message.sid));

export { commClient };
/* example
client.messages
    .create({
        body: 'Your appointment is coming up on July 21 at 3PM',
        from: process.env.ACCOUNTSID,
        to: process.env.FROMWHATS
    })
    .then(message => console.log(message.sid))
    .done(); */
