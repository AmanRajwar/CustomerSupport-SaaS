import { getChannel } from "../configs/rabbitmq.js";

export const createMessage = async (req, res) => {
const { tenantId, customerId, text } = req.body;

  try {
    const channel = getChannel();
    if (!channel) throw new Error('RabbitMQ channel not initialized');

    // 1. Construct the payload
    const messagePayload = {
      tenantId,
      customerId,
      text,
      timestamp: new Date().toISOString()
    };

    // 2. Publish to the RabbitMQ queue
    // Convert the JSON object to a Buffer (RabbitMQ only accepts Buffers/Bytes)
    channel.sendToQueue(
      'chat_messages', 
      Buffer.from(JSON.stringify(messagePayload)), 
      { persistent: true } // Ensures messages are saved to disk in case RabbitMQ crashes
    );

    // 3. Return instantly
    // HTTP 202 Accepted means "I got it, but I haven't finished processing it yet"
    return res.status(202).json({ status: 'Message queued for delivery' });

  } catch (error) {
    console.error('Error queuing message:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};