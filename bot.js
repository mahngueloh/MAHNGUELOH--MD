// Import required modules
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');

// Create a new client
const client = new Client({
    authStrategy: new LocalAuth() 
});

// Event when the client is ready
client.on('ready', () => {
    console.log('Client is ready!');
});

// Listen for messages
client.on('message', message => {
    if (message.body === '!ping') {
        message.reply('pong');
    }
});

// Start the client
client.initialize();