const WebSocket = require('ws');
const port = process.env.PORT || 10000;

const server = new WebSocket.Server({ port });

const clients = new Set();

server.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);

    ws.on('message', (data) => {
        // APK se aaya data -> baaki sab clients ko bhejo
        clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data.toString());
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('Error:', error);
    });
});

console.log(`WebSocket server running on port ${port}`);
