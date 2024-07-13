# Twilio WhatsApp Webhook Payload Examples

## Overview
When Twilio receives a WhatsApp message, it sends a POST request to your webhook URL with form-encoded data.

## Basic Message Example

When a user sends a WhatsApp message like: **"Add milk and bread to my list"**

Twilio will send a POST request to `/v1/whatsapp/webhook` with the following body:

```
From=whatsapp%3A%2B5511999999999
To=whatsapp%3A%2B14155238886
Body=Add+milk+and+bread+to+my+list
MessageSid=SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AccountSid=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NumMedia=0
```

After URL decoding, the `req.body` object will look like:

```javascript
{
  From: 'whatsapp:+5511999999999',
  To: 'whatsapp:+14155238886',
  Body: 'Add milk and bread to my list',
  MessageSid: 'SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  AccountSid: 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  NumMedia: '0',
  // ... other Twilio fields
}
```

## Complete Example Payload

Here's a more complete example with all common fields:

```javascript
{
  // Message identification
  MessageSid: 'SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  SmsSid: 'SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  SmsMessageSid: 'SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  
  // Account information
  AccountSid: 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  
  // Phone numbers
  From: 'whatsapp:+5511999999999',        // Sender (user's phone)
  To: 'whatsapp:+14155238886',             // Your Twilio WhatsApp number
  
  // Message content
  Body: 'Add milk and bread to my list',   // The actual message text
  NumMedia: '0',                            // Number of media attachments
  
  // Profile information (if available)
  ProfileName: 'John Doe',                 // WhatsApp profile name
  WaId: '5511999999999',                   // WhatsApp ID (phone without +)
  
  // Timestamp
  DateCreated: '2024-01-15T10:30:00Z',
  
  // Message type
  MessageType: 'text',                     // or 'media', 'location', etc.
  
  // Additional metadata
  ApiVersion: '2010-04-01',
  Direction: 'inbound'
}
```

## Different Message Types

### Text Message
```javascript
{
  From: 'whatsapp:+5511999999999',
  To: 'whatsapp:+14155238886',
  Body: 'Show me my shopping list',
  MessageSid: 'SM...',
  NumMedia: '0',
  MessageType: 'text'
}
```

### Media Message (Image/Video/Document)
```javascript
{
  From: 'whatsapp:+5511999999999',
  To: 'whatsapp:+14155238886',
  Body: '',  // May be empty or contain caption
  MessageSid: 'SM...',
  NumMedia: '1',
  MessageType: 'media',
  MediaContentType0: 'image/jpeg',
  MediaUrl0: 'https://api.twilio.com/2010-04-01/Accounts/.../Messages/.../Media/...'
}
```

### Location Message
```javascript
{
  From: 'whatsapp:+5511999999999',
  To: 'whatsapp:+14155238886',
  Body: '',
  MessageSid: 'SM...',
  NumMedia: '0',
  MessageType: 'location',
  Latitude: '-23.550520',
  Longitude: '-46.633308'
}
```

## How Our Code Handles It

In `whatsappWebhook.controller.js`, we extract:

```javascript
const messageData = req.body;
const messageBody = messageData.Body || messageData.body || '';
const fromNumber = messageData.From || messageData.from || '';
```

Then we process:
- Extract phone number: `whatsapp:+5511999999999` GÂ∆ `+5511999999999`
- Extract message: `Add milk and bread to my list`
- Pass to agent workflow
- Send response back via WhatsApp

## Testing the Webhook Locally

You can test the webhook using curl:

```bash
curl -X POST http://localhost:3000/v1/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp%3A%2B5511999999999" \
  -d "To=whatsapp%3A%2B14155238886" \
  -d "Body=Add+milk+to+my+list" \
  -d "MessageSid=SM1234567890abcdef"
```

Or using a tool like Postman:
- Method: POST
- URL: `http://localhost:3000/v1/whatsapp/webhook`
- Body type: `x-www-form-urlencoded`
- Fields:
  - `From`: `whatsapp:+5511999999999`
  - `To`: `whatsapp:+14155238886`
  - `Body`: `Add milk to my list`
  - `MessageSid`: `SM1234567890abcdef`

## Important Notes

1. **Phone Number Format**: Twilio sends phone numbers with `whatsapp:` prefix
   - We strip this prefix: `whatsapp:+5511999999999` GÂ∆ `+5511999999999`
   - Then remove `+` for database lookup: `+5511999999999` GÂ∆ `5511999999999`

2. **Form-Encoded Data**: Twilio sends data as `application/x-www-form-urlencoded`
   - Our route uses `express.urlencoded({ extended: true })` middleware
   - This is why we need it in the route file

3. **Response**: We always return `200 OK` to Twilio
   - This prevents Twilio from retrying failed requests
   - We handle errors internally and log them

4. **Async Processing**: The webhook processes messages asynchronously
   - We return `200 OK` immediately
   - Then process the message and send response in background



