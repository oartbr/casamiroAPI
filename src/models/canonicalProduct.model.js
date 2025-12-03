const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const synonymStatSchema = mongoose.Schema({
  synonym: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    default: 1,
  },
}, { _id: false });

const canonicalProductSchema = mongoose.Schema(
  {
    canonical_name: {
      type: String,
      required: true,
      index: true,
    },
    canonical_name_normalized: {
      type: String,
      required: true,
      index: true,
    },
    brand: {
      type: String,
      default: null,
    },
    brand_normalized: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      default: null,
    },
    subcategory: {
      type: String,
      default: null,
    },
    category_key: {
      type: String,
      default: null,
      index: true,
    },
    package_size: {
      type: String,
      default: null,
    },
    unit: {
      type: String,
      default: null,
    },
    quantity: {
      type: Number,
      default: null,
    },
    package_description: {
      type: String,
      default: null,
    },
    gtin: {
      type: String,
      default: null,
      index: true,
    },
    ncm: {
      type: String,
      default: null,
    },
    origin: {
      type: String,
      default: null,
    },
    synonyms: {
      type: [String],
      default: [],
    },
    synonyms_normalized: {
      type: [String],
      default: [],
    },
    synonyms_stats: {
      type: [synonymStatSchema],
      default: [],
    },
    is_alcoholic: {
      type: Boolean,
      default: null,
    },
    is_fresh_produce: {
      type: Boolean,
      default: null,
    },
    is_bulk: {
      type: Boolean,
      default: null,
    },
    confidence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
    source: {
      type: String,
      required: true,
      default: 'system',
    },
    embedding: {
      type: [Number],
      default: null,
    },
    scope: {
      type: String,
      enum: ['global', 'group'],
      default: 'global',
    },
    group_id: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Group',
      default: null,
    },
    created_by: {
      type: String,
      required: true,
      default: 'system',
    },
    updated_by: {
      type: String,
      required: true,
      default: 'system',
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
canonicalProductSchema.plugin(toJSON);
canonicalProductSchema.plugin(paginate);

// Compound index for efficient lookups
canonicalProductSchema.index({ canonical_name_normalized: 1, scope: 1 });
canonicalProductSchema.index({ group_id: 1, scope: 1 });
canonicalProductSchema.index({ category_key: 1, scope: 1 });

/**
 * @typedef CanonicalProduct
 */
const CanonicalProduct = mongoose.model('CanonicalProduct', canonicalProductSchema);

module.exports = CanonicalProduct;

