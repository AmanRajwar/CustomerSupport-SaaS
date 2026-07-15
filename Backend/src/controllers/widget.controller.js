import WidgetConfig from '../models/widget.model.js';

export const getWidgetById = async (req, res) =>{
    try {
        const { tenantId } = req.params;
        const widgetConfig = await WidgetConfig.findOne({ tenantId });
        if (!widgetConfig) {
            return res.status(404).json({ message: 'Widget configuration not found' });
        }
        res.json(widgetConfig);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

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