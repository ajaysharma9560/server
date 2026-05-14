const WebSocket = require('ws');

// Store active cameras and viewers
let cameras = new Map();      // cameraId -> { ws, name }
let viewers = new Map();      // viewerId -> { ws }
let frameQueue = new Map();   // cameraId -> last frame

const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('🚀 WebSocket Server running on port ' + (process.env.PORT || 8080));

server.on('connection', (ws, req) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const type = url.searchParams.get('type');
        const id = url.searchParams.get('id');
        
        console.log(`📡 New connection: type=${type}, id=${id}`);
        
        // ============ CAMERA (PHONE) ============
        if (type === 'camera') {
            cameras.set(id, {
                ws: ws,
                name: `Camera ${id.substring(0, 6)}`,
                connectedAt: Date.now()
            });
            
            console.log(`📱 Camera connected: ${id} (Total: ${cameras.size})`);
            
            // Send camera list to all viewers
            broadcastCameraList();
            
            // Handle incoming frames
            ws.on('message', (data) => {
                // Store last frame for this camera
                frameQueue.set(id, data);
                
                // Broadcast to all viewers
                viewers.forEach((viewer, viewerId) => {
                    if (viewer.ws.readyState === WebSocket.OPEN) {
                        viewer.ws.send(data);
                    }
                });
            });
            
            // Handle close
            ws.on('close', () => {
                cameras.delete(id);
                frameQueue.delete(id);
                console.log(`📱 Camera disconnected: ${id} (Total: ${cameras.size})`);
                broadcastCameraList();
            });
        }
        
        // ============ VIEWER (WEBSITE) ============
        else if (type === 'viewer') {
            viewers.set(id, { ws: ws, connectedAt: Date.now() });
            
            console.log(`👁️ Viewer connected: ${id} (Total: ${viewers.size})`);
            
            // Send current camera list immediately
            const cameraList = Array.from(cameras.keys()).map(cameraId => ({
                id: cameraId,
                name: cameras.get(cameraId).name,
                online: true
            }));
            
            ws.send(JSON.stringify({
                type: 'cameraList',
                cameras: cameraList,
                timestamp: Date.now()
            }));
            
            // Handle viewer commands
            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data);
                    
                    if (msg.type === 'watch') {
                        const cameraId = msg.cameraId;
                        const camera = cameras.get(cameraId);
                        
                        if (camera) {
                            console.log(`👁️ Viewer ${id} watching camera ${cameraId}`);
                            
                            // Send last frame if available
                            const lastFrame = frameQueue.get(cameraId);
                            if (lastFrame) {
                                ws.send(lastFrame);
                            }
                        }
                    }
                    
                    if (msg.type === 'setQuality') {
                        console.log(`📐 Quality set: ${msg.quality}p for viewer ${id}`);
                        // Store quality preference for this viewer
                        if (!viewers.get(id).quality) {
                            viewers.get(id).quality = {};
                        }
                        viewers.get(id).quality = msg.quality;
                    }
                    
                    if (msg.type === 'command') {
                        console.log(`🎮 Command from viewer ${id}: ${msg.action}`);
                        // Forward command to camera if needed
                        const cameraId = msg.cameraId;
                        const camera = cameras.get(cameraId);
                        if (camera && camera.ws.readyState === WebSocket.OPEN) {
                            camera.ws.send(JSON.stringify({
                                type: 'command',
                                action: msg.action,
                                timestamp: Date.now()
                            }));
                        }
                    }
                    
                } catch (e) {
                    // Binary data - ignore
                }
            });
            
            // Handle close
            ws.on('close', () => {
                viewers.delete(id);
                console.log(`👁️ Viewer disconnected: ${id} (Total: ${viewers.size})`);
            });
        }
        
        // ============ HEARTBEAT (Keep connection alive) ============
        ws.on('pong', () => {
            // Connection alive
        });
        
        // Send ping every 30 seconds
        const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            } else {
                clearInterval(pingInterval);
            }
        }, 30000);
        
        ws.on('close', () => {
            clearInterval(pingInterval);
        });
        
    } catch (error) {
        console.error('❌ Error in connection:', error.message);
    }
});

// Broadcast camera list to all viewers
function broadcastCameraList() {
    const cameraList = Array.from(cameras.keys()).map(cameraId => ({
        id: cameraId,
        name: cameras.get(cameraId).name,
        online: true,
        viewers: 0
    }));
    
    const message = JSON.stringify({
        type: 'cameraList',
        cameras: cameraList,
        timestamp: Date.now()
    });
    
    viewers.forEach((viewer, id) => {
        if (viewer.ws.readyState === WebSocket.OPEN) {
            viewer.ws.send(message);
        }
    });
}

// Clean up disconnected clients every minute
setInterval(() => {
    const now = Date.now();
    const timeout = 60000; // 1 minute
    
    // Clean old viewers
    viewers.forEach((viewer, id) => {
        if (viewer.ws.readyState !== WebSocket.OPEN) {
            viewers.delete(id);
        }
    });
    
    // Clean old cameras
    cameras.forEach((camera, id) => {
        if (camera.ws.readyState !== WebSocket.OPEN) {
            cameras.delete(id);
            frameQueue.delete(id);
        }
    });
    
    console.log(`🧹 Cleanup complete - Cameras: ${cameras.size}, Viewers: ${viewers.size}`);
}, 60000);

// Error handling
server.on('error', (error) => {
    console.error('❌ Server error:', error.message);
});

console.log('✅ Server ready to accept connections');
