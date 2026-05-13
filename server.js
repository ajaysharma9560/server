const WebSocket = require('ws');

const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

let cameras = new Map();
let viewers = new Map();

server.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    
    console.log(`New connection: ${type} - ${id}`);
    
    if (type === 'camera') {
        cameras.set(id, { ws: ws, name: `Camera ${id.slice(0,6)}` });
        console.log(`📱 Camera online! Total: ${cameras.size}`);
        broadcastCameraList();
        
        ws.on('message', (data) => {
            if (data instanceof Buffer) {
                const viewersList = viewers.get(id) || [];
                viewersList.forEach(viewer => {
                    if (viewer.readyState === WebSocket.OPEN) {
                        viewer.send(data);
                    }
                });
            }
        });
        
        ws.on('close', () => {
            cameras.delete(id);
            broadcastCameraList();
        });
    } else if (type === 'viewer') {
        viewers.set(id, { ws: ws, watching: null });
        
        const cameraList = Array.from(cameras.keys()).map(cid => ({
            id: cid,
            name: cameras.get(cid).name
        }));
        
        ws.send(JSON.stringify({ type: 'cameraList', cameras: cameraList }));
        
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'watch') {
                    if (!viewers.has(msg.cameraId)) {
                        viewers.set(msg.cameraId, []);
                    }
                    viewers.get(msg.cameraId).push(ws);
                }
            } catch(e) {}
        });
    }
});

function broadcastCameraList() {
    const cameraList = Array.from(cameras.keys()).map(id => ({
        id: id,
        name: cameras.get(id).name
    }));
    
    viewers.forEach((viewer, id) => {
        if (viewer.ws.readyState === WebSocket.OPEN) {
            viewer.ws.send(JSON.stringify({ type: 'cameraList', cameras: cameraList }));
        }
    });
}

console.log(`🚀 Server running on port ${process.env.PORT || 8080}`);
