const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3020;

app.use(express.static(__dirname + '/public'));

// Load previous chats from file
const chatFile = path.join(__dirname, 'chats.json');
let chatHistory = [];

if (fs.existsSync(chatFile)) {
    try {
      chatHistory = JSON.parse(fs.readFileSync(chatFile));
    } catch (err) {
      console.error('Error reading chat file:', err.message);
      chatHistory = [];
    }
  }
  
// Save chat to file
function saveChat(message) {
  chatHistory.push(message);
  fs.writeFileSync(chatFile, JSON.stringify(chatHistory, null, 2));
}

let users = [];

io.on('connection', (socket) => {
  if (users.length >= 4) {
    socket.emit('room_full', 'Only 4 users allowed in this chat.');
    socket.disconnect();
    return;
  }

  socket.on('register', (username) => {
    socket.username = username;
    users.push(username);
    io.emit('user_joined', `${username} joined`);
    
    // Send chat history to the newly connected user
    chatHistory.forEach(msg => {
      socket.emit('chat message', msg);
    });
  });

  socket.on('chat message', (msg) => {
    const messageObj = {
      sender: socket.username,
      msg,
      timestamp: new Date().toISOString()
    };
    io.emit('chat message', messageObj);
    saveChat(messageObj);
  });

  socket.on('disconnect', () => {
    users = users.filter(u => u !== socket.username);
    io.emit('user_left', `${socket.username} left`);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
