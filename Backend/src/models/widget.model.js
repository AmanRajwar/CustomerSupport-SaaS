import mongoose from 'mongoose';

const widgetConfigSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    primaryColor: {
      type: String,
      default: '#4F46E5',
    },
    welcomeMessage: {
      type: String,
      default: 'Hi! How can we help you today?',
    },
    botAvatarUrl: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Widget configs are fetched on every chat-widget load keyed by tenantId,
// so a dedicated B-tree index is required to keep those reads O(log n)
// instead of a full collection scan at multi-tenant scale.
widgetConfigSchema.index({ tenantId: 1 });

const WidgetConfig = mongoose.model('WidgetConfig', widgetConfigSchema);

export default WidgetConfig;
