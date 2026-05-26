const mongoose = require('mongoose');
const validator = require('validator');

const ticketSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    lowercase: true,
    trim: true,
    validate: {
      validator: (v) => validator.isEmail(v),
      message: (props) => `${props.value} is not a valid email address`,
    },
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    required: [true, 'Priority is required'],
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
  },
});

const SLA_MINUTES = {
  urgent: 60,
  high: 240,
  medium: 1440,
  low: 4320,
};

ticketSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  const now = Date.now();
  const created = new Date(this.createdAt).getTime();
  obj.ageMinutes = Math.floor((now - created) / 60000);
  obj.slaBreached = obj.ageMinutes > SLA_MINUTES[this.priority];
  return obj;
};

module.exports = mongoose.model('Ticket', ticketSchema);
module.exports.SLA_MINUTES = SLA_MINUTES;
