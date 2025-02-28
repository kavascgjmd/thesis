// import { WebSocket, WebSocketServer } from 'ws';
// import { Server } from 'http';
// import redisClient from '../redisClient';

// export class TrackingServer {
//   private wss: WebSocketServer;
//   private clients: Map<string, WebSocket> = new Map();

//   constructor(server: Server) {
//     this.wss = new WebSocketServer({ server });
//     this.initialize();
//   }

//   private initialize() {
//     this.wss.on('connection', (ws: WebSocket) => {
//       const clientId = Math.random().toString(36).substring(7);
//       this.clients.set(clientId, ws);

//       ws.on('message', async (message: string) => {
//         const data = JSON.parse(message);
        
//         switch (data.type) {
//           case 'subscribe':
//             await this.handleSubscription(clientId, data.orderId);
//             break;
//           case 'location-update':
//             await this.handleLocationUpdate(data.orderId, data.location);
//             break;
//         }
//       });

//       ws.on('close', () => {
//         this.clients.delete(clientId);
//       });
//     });
//   }

//   private async handleSubscription(clientId: string, orderId: string) {
//     await redisClient.sadd(`order:${orderId}:subscribers`, clientId);
//   }

//   private async handleLocationUpdate(orderId: string, location: Location) {
//     // Update location in Redis
//     await redisClient.set(`order:${orderId}:location`, JSON.stringify(location));
    
//     // Get all subscribers for this order
//     const subscribers = await redisClient.smembers(`order:${orderId}:subscribers`);
    
//     // Broadcast to subscribers
//     for (const clientId of subscribers) {
//       const client = this.clients.get(clientId);
//       if (client?.readyState === WebSocket.OPEN) {
//         client.send(JSON.stringify({
//           type: 'location-update',
//           orderId,
//           location
//         }));
//       }
//     }
//   }
// }
