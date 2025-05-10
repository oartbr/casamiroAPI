const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
// const { roles, enumRoles } = require('../config/roles');
// const ApiError = require('../utils/ApiError');
// const httpStatus = require('http-status');

const userSchema = mongoose.Schema(
  {
    checkPhoneNumber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CheckPhoneNumber',
      // to-do: make this required: true,
    },
    phoneNumber: {
      type: Number,
      // to-do: make this required: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    photo: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: false,
    },
    number: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    zipcode: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      validate(value) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
      private: true, // used by the toJSON plugin
    },
    role: {
      type: {
        id: {
          type: Number,
          required: true,
        },
        name: {
          type: String,
          enum: ['USER', 'ADMIN', 'CARRIER', 'SALES', 'QA', 'MAINTENANCE'],
        },
      },
      default: {
        id: 2,
        name: 'USER',
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    policy: {
      type: Object,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Check if phoneNumber is taken
 * @param {string} phoneNumber - The user's phoneNumber
 * @returns {Promise<boolean>}
 */
userSchema.statics.isPhoneNumberTaken = async function (phoneNumber) {
  const user = await this.findOne({ phoneNumber });
  return !!user;
};

/**
 * Get if email is taken
 * @param {string} email - The user's email
 * @returns {Promise<boolean>}
 */
userSchema.statics.getUserByEmail = async function (email) {
  const user = await this.findOne({ email });

  if (user === null) {
    return false;
  }
  return user;
};

/**
 * Get user by phoneNumber
 * @param {string} phoneNumber - The user's phoneNumber
 * @returns {Promise<User>}
 */
userSchema.statics.getUserByPhoneNumber = async function (phoneNumber) {
  const user = await this.findOne({ phoneNumber }).select('-policy -password -checkPhoneNumber');
  // console.log({ phoneNumber });
  if (user === null) {
    return null;
  }
  return user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
