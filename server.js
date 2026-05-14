const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;
const server = new WebSocket.Server({ port: PORT });

console.log(`🚀 Server starting on port ${PORT}`);

// Store all connected clients
const clients = new Set();

server.on('connection', (ws, req) => {
    console.log(`✅ New client connected! Total: ${clients.size + 1}`);
    clients.add(ws);
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to camera server',
        timestamp: Date.now()
    }));
    
    // Handle incoming messages (camera frames)
    ws.on('message', (data) => {
        // Broadcast to all OTHER clients (web viewers)
        clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    });
    
    // Handle disconnect
    ws.on('close', () => {
        clients.delete(ws);
        console.log(`❌ Client disconnected. Total: ${clients.size}`);
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error(`WebSocket error: ${error.message}`);
        clients.delete(ws);
    });
});

// Keep server alive
console.log(`✅ WebSocket server is running on port ${PORT}`);
console.log(`📡 Waiting for connections...`);
