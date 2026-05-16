const express = require('express');
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 10000;

// 🔥 APNA CLOUDINARY CREDENTIALS 🔥
cloudinary.config({
    cloud_name: 'dypwj2dhh',
    api_key: 'YOUR_API_KEY',       // 🔥 Naya API key daal
    api_secret: 'YOUR_API_SECRET'  // 🔥 Naya secret daal
});

// Store online devices
let onlineDevices = {};

// ========== API ROUTES ==========
app.get('/', (req, res) => res.send('Status Server Running ✅'));

// Get latest videos from Cloudinary
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
        res.json({ videos: [], error: err.message });
    }
});

// ========== WEBSOCKET (ONLINE STATUS) ==========
io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Device registers itself
    socket.on('register', (deviceId, deviceName) => {
        onlineDevices[deviceId] = { name: deviceName, socketId: socket.id };
        io.emit('status', { deviceId, online: true, deviceName });
        console.log(`📱 ${deviceName} is ONLINE`);
    });

    // Handle disconnect
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
    console.log(`📊 WebSocket: wss://...`);
    console.log(`📹 API: /api/videos`);
});
