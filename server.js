app.get('/api/photos', async (req, res) => {
    try {
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'live_cams',
            resource_type: 'image',
            max_results: 50
        });
        res.json({ photos: result.resources || [] });
    } catch (err) {
        res.json({ photos: [], error: err.message });
    }
});
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
