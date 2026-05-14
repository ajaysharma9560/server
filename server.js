const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 10000 });

let cameras = new Map();
let viewers = new Map();

server.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    
    console.log(`📡 New connection: ${type} - ${id}`);
    
    if (type === 'camera') {
        cameras.set(id, ws);
        console.log(`📷 Camera connected: ${id}`);
        
        ws.on('message', (data) => {
            // Broadcast to all web viewers
            viewers.forEach((viewer, viewerId) => {
                if (viewer.readyState === WebSocket.OPEN) {
                    viewer.send(data);
                }
            });
        });
        
        ws.on('close', () => {
            cameras.delete(id);
            console.log(`📷 Camera disconnected: ${id}`);
        });
        
    } else if (type === 'web') {
        viewers.set(id, ws);
        console.log(`🌐 Web viewer connected: ${id}`);
        
        ws.on('close', () => {
            viewers.delete(id);
            console.log(`🌐 Web viewer disconnected: ${id}`);
        });
    }
    
    ws.send(JSON.stringify({ type: 'connected', id, timestamp: Date.now() }));
});

console.log(`✅ WebSocket server running on port ${process.env.PORT || 10000}`);
