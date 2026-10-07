import WidgetConfig from '../models/widget.model.js';
import redisClient from '../configs/redis.js';

export const getWidgetById = async (req, res) => {
  const { tenantId } = req.params;
  const cacheKey = `widget:${tenantId}`;

  try {
    // 1. CHECK REDIS FIRST (Cache Hit check)
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      console.log(`[CACHE HIT] Serving tenant ${tenantId} from Redis`);
      // Parse the JSON string back into an object
      return res.status(200).json(JSON.parse(cachedData));
    }

    // 2. CACHE MISS -> Query MongoDB
    console.log(`[CACHE MISS] Fetching tenant ${tenantId} from MongoDB`);
    const widgetConfig = await WidgetConfig.findOne({ tenantId }).lean();

    if (!widgetConfig) {
      return res.status(404).json({ error: 'Tenant configuration not found' });
    }

    // 3. STORE IN REDIS WITH A TTL (24 Hours = 86,400 seconds)
    // Stringify the object because Redis stores strings
    await redisClient.setEx(
      cacheKey,
      86400,
      JSON.stringify(widgetConfig)
    );

    // 4. Return response to user
    return res.status(200).json(widgetConfig);

  } catch (error) {
    console.error('Error fetching widget config:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export const createWidget = async (req, res) => {
    try {
        const { tenantId, primaryColor, welcomeMessage, botAvatarUrl } = req.body;
        const widgetConfig = new WidgetConfig({ tenantId, primaryColor, welcomeMessage, botAvatarUrl });
        await widgetConfig.save();
        res.status(201).json(widgetConfig);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};
