// src/workers/messageWorker.js
// const amqp = require('amqplib');
// const mongoose = require('mongoose');
import amqp from 'amqplib';
import mongoose from 'mongoose';
import Message from '../models/Messages.js';
import dotenv from "dotenv";
dotenv.config();

// Ensure MongoDB is connected (use your actual DB URI)
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/saas_db');

const startWorker = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    const channel = await connection.createChannel();
    const queue = 'chat_messages';
    
    await channel.assertQueue(queue, { durable: true });
    
    // QUALITY OF SERVICE: Tell RabbitMQ to only give this worker 10 messages at a time.
    // This prevents the worker from being overwhelmed if there are 1,000,000 messages in the queue.
    channel.prefetch(10); 
    
    console.log(`👷 Worker listening for messages in queue: ${queue}`);
    
    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          // 1. Parse the payload (RabbitMQ sends Data Buffers, not JSON)
          const messageData = JSON.parse(msg.content.toString());
          
          // 2. Save it to MongoDB
          await Message.create({
            tenantId: messageData.tenantId,
            customerId: messageData.customerId,
            text: messageData.text,
            timestamp: messageData.timestamp
          });
          
          console.log(`✅ Processed & Saved: ${messageData.text.substring(0, 20)}...`);
          
          // 3. ACKNOWLEDGE THE MESSAGE (Crucial)
          // This tells RabbitMQ: "I successfully saved it to DB, you can delete it from the queue now."
          channel.ack(msg);
          
        } catch (error) {
          console.error('❌ Failed to process message:', error);
          
          // If the database write fails, DO NOT acknowledge. 
          // Nack (Negative Acknowledgement) puts the message back in the queue to try again later.
          channel.nack(msg);
        }
      }
    });
  } catch (error) {
    console.error('Worker startup error:', error);
  }
};

startWorker();