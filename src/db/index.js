import mongoose from "mongoose";
import {DB_NAME} from '../constants.js'

const connectDB=async()=>{
    try {
        const db=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}?authSource=admin`)
        console.log(`MongoDB connected Successfully....!`,db.connection.host);
        
    } catch (error) {
        console.log("MongoDB connetcion Failed ....!",error);
        process.exit(1);
    }
}

export default connectDB