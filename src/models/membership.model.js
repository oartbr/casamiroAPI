const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const membershipSchema = mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the Users collection
      default: null, // Null for pending invitations
    },
    group_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group', // Reference to the Groups collection
      required: [true, 'Group ID is required'],
    },
    invitee_phone: {
      type: String,
      trim: true,
      validate: {
        validator(value) {
          // Optional validation for phone format (basic check for length)
          if (!value) {
            return true;
          }
          return value.length >= 10 && value.length <= 15;
        },
        message: 'Valid phone number is required when provided',
      },
    },
    invited_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User who sent the invitation
      required: [true, 'Invited by user ID is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'declined', 'removed'],
      default: 'pending',
      required: [true, 'Status is required'],
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'contributor'],
      default: 'contributor', // Default role for new invitations
    },
    token: {
      type: String,
      trim: true,
      required() {
        return this.status === 'pending'; // Required only for pending invitations
      },
    },
    expiration_date: {
      type: Date,
      default() {
        // Set expiration 7 days from now for pending invitations
        if (this.status === 'pending') {
          return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
        return null;
      },
    },
    accepted_at: {
      type: Date,
      default: null, // Set when invitation is accepted
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Indexes for performance
membershipSchema.index({ group_id: 1, status: 1 }); // For querying members/invitations by group
membershipSchema.index({ user_id: 1 }); // For querying memberships by user
membershipSchema.index({ invitee_phone: 1 }, { sparse: true }); // For pending invitations
membershipSchema.index({ token: 1 }, { unique: true, sparse: true }); // For invitation token lookups
membershipSchema.index({ expiration_date: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired invitations

// Validation middleware to ensure data consistency
membershipSchema.pre('validate', function (next) {
  // Ensure user_id is set for active memberships
  if (this.status === 'active' && !this.user_id) {
    next(new Error('User ID is required for active memberships'));
  }
  next();
});
// add plugin that converts mongoose to json
membershipSchema.plugin(toJSON);

// Export the model
const Membership = mongoose.model('Membership', membershipSchema);

module.exports = Membership;
