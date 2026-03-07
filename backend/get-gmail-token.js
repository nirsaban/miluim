const { google } = require('googleapis');
const http = require('http');
const url = require('url');

// Your Google OAuth credentials
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3333/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://mail.google.com/'];

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n===========================================');
console.log('Gmail API Token Generator');
console.log('===========================================\n');
console.log('1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Sign in with your Gmail account');
console.log('3. Grant permissions');
console.log('4. You will be redirected back here\n');
console.log('Waiting for authorization...\n');

// Start local server to receive callback
const server = http.createServer(async (req, res) => {
  const queryParams = url.parse(req.url, true).query;

  if (queryParams.code) {
    try {
      const { tokens } = await oauth2Client.getToken(queryParams.code);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html dir="rtl">
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1 style="color: #4a5d23;">✅ הצלחה!</h1>
            <p>הטוקנים נוצרו בהצלחה. בדוק את הטרמינל.</p>
            <p>אפשר לסגור את החלון הזה.</p>
          </body>
        </html>
      `);

      console.log('===========================================');
      console.log('SUCCESS! Copy these values to your .env file:');
      console.log('===========================================\n');
      console.log(`GMAIL_REFRESH_TOKEN="${tokens.refresh_token}"`);
      console.log('\n===========================================\n');

      server.close();
      process.exit(0);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error getting tokens: ' + error.message);
      console.error('Error:', error.message);
    }
  }
}).listen(3333, () => {
  console.log('Local server listening on http://localhost:3333');
});
