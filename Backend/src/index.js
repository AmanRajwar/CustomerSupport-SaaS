import dotenv from "dotenv";
dotenv.config();
import connectDB from "./utils/db.js";
import express from "express";
// const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "Server is running!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  connectDB();
});

export default app;
