import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [6, 'Password must be at least 6 characters long']
  },
  businessName: {
    type: String,
    required: [true, 'Business name is required']
  }
}, { timestamps: true });


tenantSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Tenant = mongoose.model('Tenant', tenantSchema);