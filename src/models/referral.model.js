const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const referralSchema = mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    referralCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
referralSchema.plugin(toJSON);

// Compound index for efficient queries
referralSchema.index({ referrer: 1, createdAt: -1 });

/**
 * @typedef Referral
 */
const Referral = mongoose.model('Referral', referralSchema);

module.exports = Referral;

