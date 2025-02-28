// import { Location, OrderLocation } from '../types/delivery';

// class Graph {
//   private vertices: number;
//   private matrix: number[][];

//   constructor(vertices: number) {
//     this.vertices = vertices;
//     this.matrix = Array(vertices).fill(0).map(() => Array(vertices).fill(0));
//   }

//   addEdge(src: number, dest: number, weight: number) {
//     this.matrix[src][dest] = weight;
//     this.matrix[dest][src] = weight;
//   }

//   // Prim's algorithm for Minimum Spanning Tree
//   primMST(): number[][] {
//     const parent: number[] = Array(this.vertices).fill(-1);
//     const key: number[] = Array(this.vertices).fill(Number.MAX_SAFE_INTEGER);
//     const mstSet: boolean[] = Array(this.vertices).fill(false);
    
//     key[0] = 0;
    
//     for (let count = 0; count < this.vertices - 1; count++) {
//       const u = this.minKey(key, mstSet);
//       mstSet[u] = true;
      
//       for (let v = 0; v < this.vertices; v++) {
//         if (this.matrix[u][v] && !mstSet[v] && this.matrix[u][v] < key[v]) {
//           parent[v] = u;
//           key[v] = this.matrix[u][v];
//         }
//       }
//     }

//     const mst: number[][] = Array(this.vertices).fill(0).map(() => Array(this.vertices).fill(0));
//     for (let i = 1; i < this.vertices; i++) {
//       mst[parent[i]][i] = this.matrix[parent[i]][i];
//       mst[i][parent[i]] = this.matrix[i][parent[i]];
//     }
//     return mst;
//   }

//   private minKey(key: number[], mstSet: boolean[]): number {
//     let min = Number.MAX_SAFE_INTEGER;
//     let minIndex = -1;
    
//     for (let v = 0; v < this.vertices; v++) {
//       if (!mstSet[v] && key[v] < min) {
//         min = key[v];
//         minIndex = v;
//       }
//     }
//     return minIndex;
//   }
// }

// export class ChristofidesAlgorithm {
//   optimize(locations: OrderLocation[]): OrderLocation[] {
//     const n = locations.length;
//     const graph = new Graph(n);
    
//     // Create distance matrix
//     for (let i = 0; i < n; i++) {
//       for (let j = 0; j < n; j++) {
//         if (i !== j) {
//           const distance = this.calculateDistance(
//             locations[i].location,
//             locations[j].location
//           );
//           graph.addEdge(i, j, distance);
//         }
//       }
//     }
    
//     // Get MST
//     const mst = graph.primMST();
    
//     // Find odd degree vertices
//     const oddVertices = this.findOddDegreeVertices(mst);
    
//     // Perfect matching
//     const matching = this.perfectMatching(oddVertices, graph);
    
//     // Combine MST and matching
//     const multigraph = this.combineMSTAndMatching(mst, matching);
    
//     // Find Eulerian circuit
//     const circuit = this.findEulerianCircuit(multigraph);
    
//     // Convert to Hamiltonian cycle
//     const route = this.makeHamiltonianCycle(circuit);
    
//     // Return optimized route
//     return route.map(index => locations[index]);
//   }

//   private calculateDistance(loc1: Location, loc2: Location): number {
//     const R = 6371; // Earth's radius in km
//     const dLat = this.toRad(loc2.lat - loc1.lat);
//     const dLon = this.toRad(loc2.lng - loc1.lng);
//     const lat1 = this.toRad(loc1.lat);
//     const lat2 = this.toRad(loc2.lat);

//     const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
//               Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//     return R * c;
//   }

//   private toRad(degrees: number): number {
//     return degrees * Math.PI / 180;
//   }

//   private findOddDegreeVertices(mst: number[][]): number[] {
//     const oddVertices: number[] = [];
//     for (let i = 0; i < mst.length; i++) {
//       let degree = 0;
//       for (let j = 0; j < mst.length; j++) {
//         if (mst[i][j] > 0) degree++;
//       }
//       if (degree % 2 === 1) oddVertices.push(i);
//     }
//     return oddVertices;
//   }

//   private perfectMatching(oddVertices: number[], graph: Graph): number[][] {
//     // Simplified greedy matching for demo
//     const matching: number[][] = Array(graph.vertices).fill(0).map(() => Array(graph.vertices).fill(0));
//     const used = new Set<number>();
    
//     for (let i = 0; i < oddVertices.length; i++) {
//       if (used.has(oddVertices[i])) continue;
      
//       let minDist = Infinity;
//       let matchVertex = -1;
      
//       for (let j = i + 1; j < oddVertices.length; j++) {
//         if (!used.has(oddVertices[j])) {
//           const dist = graph.matrix[oddVertices[i]][oddVertices[j]];
//           if (dist < minDist) {
//             minDist = dist;
//             matchVertex = oddVertices[j];
//           }
//         }
//       }
      
//       if (matchVertex !== -1) {
//         matching[oddVertices[i]][matchVertex] = minDist;
//         matching[matchVertex][oddVertices[i]] = minDist;
//         used.add(oddVertices[i]);
//         used.add(matchVertex);
//       }
//     }
    
//     return matching;
//   }

//   private combineMSTAndMatching(mst: number[][], matching: number[][]): number[][] {
//     const result = mst.map(row => [...row]);
//     for (let i = 0; i < matching.length; i++) {
//       for (let j = 0; j < matching.length; j++) {
//         if (matching[i][j] > 0) {
//           result[i][j] += matching[i][j];
//         }
//       }
//     }
//     return result;
//   }

//   private findEulerianCircuit(graph: number[][]): number[] {
//     const circuit: number[] = [];
//     const stack: number[] = [0];
//     const n = graph.length;
//     const tempGraph = graph.map(row => [...row]);
    
//     while (stack.length > 0) {
//       const v = stack[stack.length - 1];
//       let found = false;
      
//       for (let u = 0; u < n; u++) {
//         if (tempGraph[v][u] > 0) {
//           stack.push(u);
//           tempGraph[v][u]--;
//           tempGraph[u][v]--;
//           found = true;
//           break;
//         }
//       }
      
//       if (!found) {
//         circuit.push(stack.pop()!);
//       }
//     }
    
//     return circuit.reverse();
//   }

//   private makeHamiltonianCycle(circuit: number[]): number[] {
//     const visited = new Set<number>();
//     const result: number[] = [];
    
//     for (const vertex of circuit) {
//       if (!visited.has(vertex)) {
//         result.push(vertex);
//         visited.add(vertex);
//       }
//     }
    
//     result.push(result[0]); // Complete the cycle
//     return result;
//   }
// }
