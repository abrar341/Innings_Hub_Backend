import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async () => {

    try {
        // const connectionInstance = await mongoose.connect(`${"mongodb+srv://muhammadabrar341:Abrar672526@cluster0.igl7cey.mongodb.net"}/${"cric"}`)
        // console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
        const connectionInstance = await mongoose.connect(`${"mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.10.1"}/${"cric"}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}

export default connectDB
