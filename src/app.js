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


import userRouter from './routes/admin.routes.js'

// app.use("/api/v1/", adminRouter)
app.use("/api/users", userRouter)


app.get('/', (req, res) => {
    res.send("hello world")
})


export { app }