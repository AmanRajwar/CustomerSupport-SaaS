import dotenv from "dotenv";
dotenv.config();
import mongoose from 'mongoose';

const dbURI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(dbURI).then(() => {
      console.log("MongoDB connected successfully");
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;