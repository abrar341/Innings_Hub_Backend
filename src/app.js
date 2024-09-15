import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())


import userRouter from './routes/user.routes.js'
import tournamentRouter from './routes/tournament.routes.js'
import teamRouter from './routes/team.routes.js'
import playerRouter from './routes/player.routes.js'
import clubRouter from './routes/club.routes.js'
import { verifyJWT } from "./middlewares/auth.middleware.js"

// app.use("/api/v1/", adminRouter)
app.use("/api/users", userRouter)
app.use("/api/tournament", tournamentRouter)
app.use("/api/player", playerRouter)
app.use("/api/team", teamRouter)
app.use("/api/club", clubRouter)

app.get('/', (req, res) => {
    res.send("hello world")
})


export { app }