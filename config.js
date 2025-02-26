// config.js
const os = require('os');

function getLocalIpAddress() {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    for (const address of networkInterfaces[interfaceName]) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
  return 'localhost';
}

module.exports = {
  MONGO_URI: 'mongodb://127.0.0.1:27017/campusplay',
  JWT_SECRET: '4gM8XkFz9pVnR2hQ7wLrY5aC0uJbH3eZ',
  FRONTEND_URL: `http://${getLocalIpAddress()}:3002`,
};
