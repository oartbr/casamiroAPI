const Joi = require('joi');

const createCanonicalProduct = {
  body: Joi.object().keys({
    canonical_name: Joi.string().required(),
    canonical_name_normalized: Joi.string(),
    brand: Joi.string().allow(null),
    brand_normalized: Joi.string().allow(null),
    category: Joi.string().allow(null),
    subcategory: Joi.string().allow(null),
    category_key: Joi.string().allow(null),
    package_size: Joi.string().allow(null),
    unit: Joi.string().allow(null),
    quantity: Joi.number().allow(null),
    package_description: Joi.string().allow(null),
    gtin: Joi.string().allow(null),
    ncm: Joi.string().allow(null),
    origin: Joi.string().allow(null),
    synonyms: Joi.array().items(Joi.string()),
    synonyms_normalized: Joi.array().items(Joi.string()),
    synonyms_stats: Joi.array().items(
      Joi.object().keys({
        synonym: Joi.string().required(),
        count: Joi.number().default(1),
      })
    ),
    is_alcoholic: Joi.boolean().allow(null),
    is_fresh_produce: Joi.boolean().allow(null),
    is_bulk: Joi.boolean().allow(null),
    confidence: Joi.number().min(0).max(1).default(0),
    source: Joi.string().default('system'),
    embedding: Joi.array().items(Joi.number()).allow(null),
    scope: Joi.string().valid('global', 'group').default('global'),
    group_id: Joi.string().allow(null),
    created_by: Joi.string().default('system'),
    updated_by: Joi.string().default('system'),
  }),
};

const getAll = {
  query: Joi.object().keys({
    filters: Joi.string(),
    sort: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getCanonicalProduct = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const updateCanonicalProduct = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    canonical_name: Joi.string(),
    canonical_name_normalized: Joi.string(),
    brand: Joi.string().allow(null),
    brand_normalized: Joi.string().allow(null),
    category: Joi.string().allow(null),
    subcategory: Joi.string().allow(null),
    category_key: Joi.string().allow(null),
    package_size: Joi.string().allow(null),
    unit: Joi.string().allow(null),
    quantity: Joi.number().allow(null),
    package_description: Joi.string().allow(null),
    gtin: Joi.string().allow(null),
    ncm: Joi.string().allow(null),
    origin: Joi.string().allow(null),
    synonyms: Joi.array().items(Joi.string()),
    synonyms_normalized: Joi.array().items(Joi.string()),
    synonyms_stats: Joi.array().items(
      Joi.object().keys({
        synonym: Joi.string().required(),
        count: Joi.number().default(1),
      })
    ),
    is_alcoholic: Joi.boolean().allow(null),
    is_fresh_produce: Joi.boolean().allow(null),
    is_bulk: Joi.boolean().allow(null),
    confidence: Joi.number().min(0).max(1),
    source: Joi.string(),
    embedding: Joi.array().items(Joi.number()).allow(null),
    scope: Joi.string().valid('global', 'group'),
    group_id: Joi.string().allow(null),
    updated_by: Joi.string(),
  }).min(1),
};

const deleteCanonicalProduct = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const search = {
  query: Joi.object().keys({
    q: Joi.string().required(),
    groupId: Joi.string().allow(null),
  }),
};

const createFromNotaItem = {
  body: Joi.object().keys({
    productData: Joi.object().keys({
      product: Joi.string(),
      name: Joi.string(),
      code: Joi.string().allow(null),
      quantity: Joi.number().allow(null),
      unitPrice: Joi.number().allow(null),
      totalPrice: Joi.number().allow(null),
    }).required(),
    userId: Joi.string(),
    groupId: Joi.string().allow(null),
    useOpenAI: Joi.boolean().default(true),
  }),
};

module.exports = {
  createCanonicalProduct,
  getAll,
  getCanonicalProduct,
  updateCanonicalProduct,
  deleteCanonicalProduct,
  search,
  createFromNotaItem,
};

