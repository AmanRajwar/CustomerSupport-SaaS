import amqp from 'amqplib';

let channel;

const connectRabbitMQ = async () => {
  try {
    // Connect to the RabbitMQ server
    const connection = await amqp.connect('amqp://localhost:5672');
    
    // Create a channel (where the actual work happens)
    channel = await connection.createChannel();
    
    // Declare the queue. 'durable: true' means the queue survives if RabbitMQ restarts.
    await channel.assertQueue('chat_messages', { durable: true });
    
    console.log('🐇 Connected to RabbitMQ successfully');
  } catch (error) {
    console.error('RabbitMQ Connection Error:', error);
  }
};

const getChannel = () => channel;

export { connectRabbitMQ, getChannel };