import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from './app.js';
import { errorHandler } from "./middlewares/errorMiddleware.js";
import { Server } from "socket.io";
import http from "http";

// Load environment variables
dotenv.config({
  path: './.env'
});

// Use error handler middleware
app.use(errorHandler);

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.io with the HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this according to your needs for CORS
    methods: ["GET", "POST"]
  }
});

// WebSocket event handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handling joining a specific match room
  socket.on('joinMatch', (matchId) => {
    console.log(matchId);

    socket.join(matchId); // Join the specific room for a match
    console.log(`User joined match room: ${matchId}`);
  });

  // Handling scorer updates (ball-by-ball updates)
  socket.on('ballUpdate', (data) => {
    console.log(data);

    const { matchId, ...ballData } = data;
    io.to(matchId).emit('newBall', ballData); // Emit ball updates to users in the room
  });

  // Handling disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Connect to the MongoDB database
connectDB()
  .then(() => {
    // Start the server after DB connection is established
    server.listen(process.env.PORT || 8000, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
