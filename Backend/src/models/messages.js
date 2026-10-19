// src/models/Message.js
// const mongoose = require('mongoose');
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  customerId: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// 🚀 THE COMPOUND INDEX
// 1 = Ascending order, -1 = Descending order (newest messages first)
messageSchema.index({ tenantId: 1, customerId: 1, timestamp: -1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
