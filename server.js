/**
 * KinoVibes Server
 * A simple Node.js Express server for serving static files
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access KinoVibes`);
    console.log(`Using localStorage for authentication (client-side only)`);
}); 