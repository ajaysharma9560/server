const express = require('express');
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 10000;

// 🔥 YOUR CLOUDINARY CREDENTIALS (Added) 🔥
cloudinary.config({
    cloud_name: 'dypwj2dhh',
    api_key: '564619366162332',
    api_secret: 'SOT0Ig91c_ZKU9cZQ4tEYjYDJYs'
});

// ========== API ROUTE FOR VIDEOS ==========
app.get('/api/videos', async (req, res) => {
    try {
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'live_cams',
            resource_type: 'video',
            max_results: 20
        });
        res.json({ videos: result.resources || [] });
    } catch (err) {
        console.error('Cloudinary error:', err.message);
        res.json({ videos: [], error: err.message });
    }
});

// Health check
app.get('/', (req, res) => res.send('Ludo Cam Server Running ✅'));

// ========== WEBSOCKET (ONLINE STATUS) ==========
let onlineDevices = {};

io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('register', (deviceId, deviceName) => {
        onlineDevices[deviceId] = { name: deviceName, socketId: socket.id };
        io.emit('status', { deviceId, online: true, deviceName });
        console.log(`📱 ${deviceName} is ONLINE`);
    });

    socket.on('disconnect', () => {
        let disconnectedId = null;
        for (const [id, data] of Object.entries(onlineDevices)) {
            if (data.socketId === socket.id) disconnectedId = id;
        }
        if (disconnectedId) {
            const deviceName = onlineDevices[disconnectedId].name;
            delete onlineDevices[disconnectedId];
            io.emit('status', { deviceId: disconnectedId, online: false });
            console.log(`❌ ${deviceName} is OFFLINE`);
        }
    });
});

http.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📹 API: /api/videos`);
    console.log(`💚 Cloudinary configured with cloud: dypwj2dhh`);
});
