import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

// Single shared socket instance
const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

export default socket;
