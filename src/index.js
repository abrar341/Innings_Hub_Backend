import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from './app.js';
import { errorHandler } from "./middlewares/errorMiddleware.js";
import { Server } from "socket.io";
import http from "http";
import { setupSocketHandlers } from './socketHandlers.js'
dotenv.config({
  path: './.env'
});
app.use(errorHandler);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this according to your CORS needs
    methods: ["GET", "POST"]
  }
});

global.io = io;

//socket here ignore the comment

setupSocketHandlers(io)
connectDB()
  .then(() => {
    server.listen(process.env.PORT || 8000, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
