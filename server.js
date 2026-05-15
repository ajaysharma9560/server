const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('WebRTC Signal Server Running ✅'));

const rooms = {};

io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        rooms[socket.id] = roomId;
        socket.to(roomId).emit('user-joined', userId);
    });

    socket.on('signal', (data) => {
        socket.to(data.room).emit('signal', { from: data.from, signal: data.signal });
    });

    socket.on('disconnect', () => {
        const roomId = rooms[socket.id];
        if (roomId) socket.to(roomId).emit('user-left', socket.id);
        delete rooms[socket.id];
    });
});

http.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
