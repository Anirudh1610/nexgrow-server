// Simple Express server to serve the React production build
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing, return all requests to React app
// Use a regex pattern instead of '*' for compatibility with newer Express versions
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🌐 Serving React app from: ${path.join(__dirname, 'build')}`);
});
