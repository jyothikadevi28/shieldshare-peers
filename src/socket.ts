import { io } from "socket.io-client";

const socket = io("https://shieldshare-signal.onrender.com");

export default socket;
