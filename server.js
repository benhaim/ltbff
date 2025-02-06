const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();

// Serve static files from current directory
app.use(express.static('./'));

// Create HTTPS server with self-signed certificates
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(3000, () => {
    console.log('Server running on https://localhost:3000');
}); 