const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios'); // Import axios for making HTTP requests

const app = express();
const port = process.env.PORT || 3000;


const secretFromConfiguration = "6721F8BF054AE14B37B191B0CC1F7C250940B59B22D47DA21804002EEBC7396C";

// Middleware to handle URL-encoded bodies
app.use(bodyParser.json({ limit: '100kb' }));
app.use(bodyParser.raw({ type: 'text/plain', limit: '100kb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/pp-hosted/secure/webhook', async (req, res) => {
  try {
    console.log(req.body);
    
    // Extracting the necessary values from the headers and body
    const ivfromHttpHeader = req.headers['x-initialization-vector'];
    const authTagFromHttpHeader = req.headers['x-authentication-tag'];
    const httpBody = req.body.encryptedBody;

    // Log the extracted values to ensure they are correct
    console.log('IV:', ivfromHttpHeader);
    console.log('Auth Tag:', authTagFromHttpHeader);
    console.log('Encrypted Data:', httpBody);

    // Ensure none of the values are undefined
    if (!ivfromHttpHeader || !authTagFromHttpHeader || !httpBody) {
      throw new Error('Missing required decryption parameters');
    }

    // Convert data to Buffers
    const key = Buffer.from(secretFromConfiguration, "hex");
    const iv = Buffer.from(ivfromHttpHeader, "hex");
    const authTag = Buffer.from(authTagFromHttpHeader, "hex");
    const cipherText = Buffer.from(httpBody, "hex");

    // Prepare decryption
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const result = decipher.update(cipherText, 'hex', 'utf8') + decipher.final('utf8');
    console.log('Decrypted result:', result);

    // Parse the decrypted result as JSON
    const decryptedPayload = JSON.parse(result);

    // Check if the paymentType is "DB"
    if (decryptedPayload.payload.paymentType === "DB") {
      // Extracting necessary fields
      const holder = decryptedPayload.payload.card.holder; // Extract holder from card
      const paymentType = decryptedPayload.payload.paymentType; // Extract paymentType from payload
      const amount = decryptedPayload.payload.amount; // Extract amount from payload
      const code = decryptedPayload.payload.result.code; // Extract code from result
      const description = decryptedPayload.payload.result.description; // Extract description from result
      const timestamp = decryptedPayload.payload.timestamp; // Extract timestamp from payload

      // Log the required information
      console.log(`Holder: ${holder}`);
      console.log(`Payment Type: ${paymentType}`);
      console.log(`Amount: ${amount}`);
      console.log(`Code: ${code}`);
      console.log(`Description: ${description}`);
      console.log(`Timestamp: ${timestamp}`);

      // Make the POST request to Clappia API
      const clappiaApiKey = 'emt052658999e58772f1d44b7a920796d0863a90b'; // Your Clappia API Key

      const postData = {
        appId: "FQF635764",
        workplaceId: "EMT052658",
        requestingUserEmailAddress: "vikas.khanna@emtel.com",
        data: {
          name: holder,
          paymenttyp: paymentType,
          amount: amount,
          outcomecod: code,
          codedescri: description,
          datetime: timestamp
        }
      };

      // Send the POST request
      const response = await axios.post('https://api-public-v3.clappia.com/submissions/create', postData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': clappiaApiKey
        }
      });

      console.log('Clappia API response:', response.data);

      // Respond with a 200 status code
      res.status(200).send('Webhook received, decrypted, and data submitted to Clappia successfully.');
    } else {
      console.log('Payment type is not "DB", skipping logging and submission.');
      res.status(200).send('Payment type is not "DB", no further action taken.');
    }
  } catch (error) {
    console.error('Failed to decrypt webhook or submit data:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
