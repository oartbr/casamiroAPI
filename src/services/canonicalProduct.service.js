const httpStatus = require('http-status');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');
const { CanonicalProduct } = require('../models');

// Utility function to normalize text (remove accents, lowercase)
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// Load category taxonomy for mapping
let categoryTaxonomy = null;
const loadCategoryTaxonomy = () => {
  if (!categoryTaxonomy) {
    try {
      const taxonomyPath = path.join(__dirname, '../../scripts/category_taxonomy.json');
      const taxonomyData = fs.readFileSync(taxonomyPath, 'utf8');
      categoryTaxonomy = JSON.parse(taxonomyData);
    } catch (error) {
      console.warn('Could not load category taxonomy:', error);
      categoryTaxonomy = { categories: {} };
    }
  }
  return categoryTaxonomy;
};

// Map category_key and subcategory_key to Portuguese labels
const mapCategoryToPortuguese = (categoryKey, subcategoryKey) => {
  const taxonomy = loadCategoryTaxonomy();
  const category = taxonomy.categories[categoryKey];

  if (!category) {
    return { category: null, subcategory: null };
  }

  const categoryLabel = category.label || null;
  const subcategoryLabel = subcategoryKey && category.subcategories ? category.subcategories[subcategoryKey] || null : null;

  return {
    category: categoryLabel,
    subcategory: subcategoryLabel,
  };
};

// Utility function to call OpenAI Agent for product classification
const classifyProductWithOpenAI = async (productData) => {
  // Check if OPENAI_API_KEY is set
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured, using fallback classification');
    return null; // Return null to trigger fallback
  }

  // Try to load OpenAI Agents package
  let agents;
  try {
    agents = require('@openai/agents');
  } catch (error) {
    console.warn('@openai/agents package not installed, using fallback classification');
    return null; // Return null to trigger fallback
  }

  // Try to load zod
  let z;
  try {
    z = require('zod');
  } catch (error) {
    console.warn('zod package not installed, using fallback classification');
    return null; // Return null to trigger fallback
  }

  try {
    const { Agent, Runner, withTrace } = agents;

    // Define the schema matching the agent's expected output
    // Using proper Zod types instead of z.any() for OpenAI Agents compatibility
    const CanonicalProductAgentSchema = z.object({
      canonical_name: z.string(),
      brand: z.string().nullable(),
      category: z.string().nullable(),
      subcategory: z.string().nullable(),
      category_key: z.string().nullable(),
      package_size: z.string().nullable(),
      unit: z.string().nullable(),
      quantity: z.number().nullable(),
      package_description: z.string().nullable(),
      gtin: z.string().nullable(),
      ncm: z.string().nullable(),
      origin: z.string().nullable(),
      synonyms: z.array(z.string()),
      is_alcoholic: z.boolean().nullable(),
      is_fresh_produce: z.boolean().nullable(),
      is_bulk: z.boolean().nullable(),
      confidence: z.number(),
    });

    // Create the agent (same configuration as provided)
    const canonicalProductAgent = new Agent({
      name: 'Canonical Product Agent',
      instructions: `Você é um motor de normalização de produtos para o aplicativo brasileiro Casamiro.

Sua função é receber descrições brutas de produtos de notas fiscais (NFe) e gerar um objeto de produto canônico estruturado.

Responda sempre apenas em JSON válido, usando português brasileiro em canonical_name, category, subcategory e synonyms. 

Marcas devem ser capitalizadas; demais palavras devem ser minúsculas. 

Preserve detalhes como marca, sabor, tamanho, peso e tipo. 

Se não tiver certeza sobre um campo, retorne null e nunca invente gtin, ncm ou origin. Inclua de 2 a 4 sinônimos úteis e mais 2 a 4 coloquiais. 

Você deve classificar o produto usando APENAS as categorias e subcategorias listadas abaixo. Nunca crie novas categorias ou subcategorias.  

Taxonomia permitida (category_key → subcategory_key):

{
  "dairy": ["milk_uht", "milk_fresh", "yogurt", "cheese", "butter_margarine", "cream", "milk_powder", "desserts_dairy"],
  "beverages": ["soda", "water", "juices", "beer", "wine", "spirits", "energy_drinks", "tea", "coffee"],
  "bakery": ["bread", "cakes", "cookies", "toasts", "sweet_bread", "pastry"],
  "grocery": ["rice", "beans", "pasta", "flour", "sugar", "oil", "canned_food", "snacks", "condiments", "sauces", "breakfast_items"],
  "produce": ["fruits", "vegetables", "greens", "roots", "herbs"],
  "meat": ["beef", "pork", "poultry", "fish", "seafood", "processed_meat"],
  "cleaning": ["laundry", "dishwashing", "multiuse", "disinfectants", "paper_products"],
  "personal_care": ["oral_care", "hair_care", "body_care", "deodorants", "female_care", "shaving", "soap"],
  "baby": ["diapers", "baby_food", "baby_hygiene", "baby_care"],
  "pet": ["dog_food", "cat_food", "pet_hygiene", "pet_care"],
  "frozen": ["frozen_meals", "frozen_vegetables", "frozen_meat", "ice_cream"],
  "canned": ["canned_vegetables", "canned_fish", "canned_meat", "pickles", "preserves"]
}

Se o produto for perecível ou de hortifruti, defina is_fresh_produce = true; se for vendido a granel, defina is_bulk = true; se for alcoólico, defina is_alcoholic = true.

O campo unit deve usar apenas abreviações como L, mL, kg, g, un. 

O campo quantity representa a quantidade por unidade (normalmente 1) e nunca deve copiar a quantidade comprada na nota; em caso de dúvida, use 1 ou null. 

Defina confidence entre 0 e 1 conforme seu nível de certeza.`,
      model: 'o4-mini',
      outputType: CanonicalProductAgentSchema,
      modelSettings: {
        reasoning: {
          effort: 'medium',
        },
        store: true,
      },
    });

    // Prepare input as JSON string (the agent expects input_as_text)
    const inputJson = {
      product: productData.product || productData.name || 'Unknown',
      gtin: productData.code || null,
      quantity: productData.quantity || null,
      unitPrice: productData.unitPrice || null,
      totalPrice: productData.totalPrice || null,
    };
    const inputAsText = JSON.stringify(inputJson);

    // Run the agent
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: 'agent-builder',
        workflow_id: 'wf_692f507177208190aca0beaed9135e0b02d2ae4fc7eceaae',
      },
    });

    const result = await withTrace('Canonical_products', async () => {
      const agentResult = await runner.run(canonicalProductAgent, [
        { role: 'user', content: [{ type: 'input_text', text: inputAsText }] },
      ]);

      if (!agentResult.finalOutput) {
        throw new Error('Agent result is undefined');
      }

      return agentResult.finalOutput;
    });

    // Map category_key and subcategory to Portuguese labels using taxonomy
    // The agent returns category_key (e.g., "dairy") and subcategory as a key (e.g., "milk_uht")
    // NOTE: The agent might return subcategory as Portuguese text OR as a key - we need to handle both
    const categoryMapping = mapCategoryToPortuguese(result.category_key, result.subcategory);

    // If subcategory mapping failed but agent returned a subcategory value, check if it's already Portuguese
    // or if we need to try reverse lookup
    let finalSubcategory = categoryMapping.subcategory;
    if (!finalSubcategory && result.subcategory) {
      // Agent returned a subcategory but mapping failed - might be Portuguese text already
      // Try to find it in the taxonomy by value (reverse lookup with case-insensitive matching)
      const taxonomy = loadCategoryTaxonomy();
      const category = taxonomy.categories[result.category_key];
      if (category && category.subcategories) {
        // Normalize both for comparison (case-insensitive, remove accents)
        const normalizedAgentSubcategory = normalizeText(result.subcategory);

        // Search for the subcategory value in the Portuguese labels (case-insensitive)
        // Also check if the agent subcategory is contained in the taxonomy label or vice versa
        const foundKey = Object.keys(category.subcategories).find((key) => {
          const taxonomyLabel = category.subcategories[key];
          const normalizedTaxonomyLabel = normalizeText(taxonomyLabel);
          // Exact match after normalization
          if (normalizedTaxonomyLabel === normalizedAgentSubcategory) return true;
          // Check if one contains the other (handles singular/plural variations)
          if (
            normalizedTaxonomyLabel.includes(normalizedAgentSubcategory) ||
            normalizedAgentSubcategory.includes(normalizedTaxonomyLabel)
          ) {
            // Make sure it's a meaningful match (at least 4 characters to avoid false matches)
            if (normalizedAgentSubcategory.length >= 4 || normalizedTaxonomyLabel.length >= 4) {
              return true;
            }
          }
          return false;
        });

        if (foundKey) {
          // Found it - use the Portuguese label from taxonomy (properly formatted)
          finalSubcategory = category.subcategories[foundKey];
        } else {
          // Not found in taxonomy - might be Portuguese text from agent, use it directly
          // But capitalize it properly (first letter uppercase)
          finalSubcategory = result.subcategory.charAt(0).toUpperCase() + result.subcategory.slice(1).toLowerCase();
        }
      } else if (result.subcategory) {
        // No subcategories in taxonomy for this category, but agent returned one - use it
        finalSubcategory = result.subcategory.charAt(0).toUpperCase() + result.subcategory.slice(1).toLowerCase();
      }
    }

    // Prepare the classification result
    const classification = {
      canonical_name: result.canonical_name || productData.product || productData.name,
      canonical_name_normalized: normalizeText(result.canonical_name || productData.product || productData.name),
      brand: result.brand || null,
      brand_normalized: result.brand ? normalizeText(result.brand) : null,
      category: categoryMapping.category || null, // Portuguese label from taxonomy
      subcategory: finalSubcategory || null, // Portuguese label from taxonomy or agent
      category_key: result.category_key || null,
      package_size: result.package_size || null,
      unit: result.unit || null,
      quantity: result.quantity !== undefined ? result.quantity : productData.quantity || null,
      package_description: result.package_description || null,
      gtin: result.gtin || productData.code || null,
      ncm: result.ncm || null,
      origin: result.origin || 'BR',
      is_alcoholic: result.is_alcoholic !== undefined ? result.is_alcoholic : null,
      is_fresh_produce: result.is_fresh_produce !== undefined ? result.is_fresh_produce : null,
      is_bulk: result.is_bulk !== undefined ? result.is_bulk : null,
      confidence: result.confidence || 0.5,
      source: 'openai-v1',
      // Store OpenAI synonyms separately - we'll merge them with usage-based synonyms
      openai_synonyms: result.synonyms || [],
    };

    return classification;
  } catch (error) {
    // Fallback to basic classification if OpenAI fails
    console.error('OpenAI Agent classification error:', error);
    return null; // Return null to trigger fallback
  }
};

// Fallback classification function
const getFallbackClassification = (productData) => {
  return {
    canonical_name: productData.product || productData.name || 'Unknown Product',
    canonical_name_normalized: normalizeText(productData.product || productData.name || 'Unknown Product'),
    brand: null,
    brand_normalized: null,
    category: null,
    subcategory: null,
    category_key: null,
    package_size: null,
    unit: null,
    quantity: productData.quantity || null,
    package_description: null,
    gtin: productData.code || null,
    ncm: null,
    origin: 'BR',
    is_alcoholic: null,
    is_fresh_produce: null,
    is_bulk: null,
    confidence: 0.3,
    source: 'system-fallback',
  };
};

/**
 * Create or update a canonical product from a nota item
 * @param {Object} productData - Product data from nota item
 * @param {Object} options - Options with userId, groupId, etc.
 * @returns {Promise<CanonicalProduct>}
 */
const createOrUpdateFromNotaItem = async (productData, options = {}) => {
  const { userId = 'system', groupId = null, useOpenAI = true } = options;

  // Normalize the product name for lookup
  const productNameNormalized = normalizeText(productData.product || productData.name);

  // Try to find existing canonical product by normalized name
  let existingProduct = await CanonicalProduct.findOne({
    canonical_name_normalized: productNameNormalized,
    scope: groupId ? 'group' : 'global',
    ...(groupId ? { group_id: groupId } : { group_id: null }),
  });

  // If not found, try to find by GTIN/code
  if (!existingProduct && productData.code) {
    existingProduct = await CanonicalProduct.findOne({
      gtin: productData.code,
      scope: groupId ? 'group' : 'global',
      ...(groupId ? { group_id: groupId } : { group_id: null }),
    });
  }

  // Determine if OpenAI analysis is needed
  // Analyze if:
  // 1. Product doesn't exist yet (new product)
  // 2. Existing product has low confidence (< 0.7) or was classified by fallback
  // 3. OpenAI is explicitly enabled
  const needsOpenAIAnalysis =
    useOpenAI &&
    (!existingProduct ||
      (existingProduct && (existingProduct.confidence < 0.7 || existingProduct.source === 'system-fallback')));

  // Get classification from OpenAI if needed
  let classification = {};
  if (needsOpenAIAnalysis) {
    const openAIClassification = await classifyProductWithOpenAI(productData);
    if (openAIClassification) {
      classification = openAIClassification;
    } else {
      // Fallback if OpenAI is not available or fails
      classification = getFallbackClassification(productData);
    }
  } else if (existingProduct) {
    // Use existing classification if product exists with good confidence
    classification = {
      canonical_name: existingProduct.canonical_name,
      canonical_name_normalized: existingProduct.canonical_name_normalized,
      brand: existingProduct.brand,
      brand_normalized: existingProduct.brand_normalized,
      category: existingProduct.category,
      subcategory: existingProduct.subcategory,
      category_key: existingProduct.category_key,
      package_size: existingProduct.package_size,
      unit: existingProduct.unit,
      quantity: productData.quantity || existingProduct.quantity,
      package_description: existingProduct.package_description,
      gtin: productData.code || existingProduct.gtin,
      ncm: existingProduct.ncm,
      origin: existingProduct.origin,
      is_alcoholic: existingProduct.is_alcoholic,
      is_fresh_produce: existingProduct.is_fresh_produce,
      is_bulk: existingProduct.is_bulk,
      confidence: existingProduct.confidence,
      source: existingProduct.source,
    };
  } else {
    // Basic classification without OpenAI for new products when OpenAI is disabled
    classification = getFallbackClassification(productData);
  }

  const rawProductName = productData.product || productData.name || 'Unknown Product';
  const normalizedProductName = normalizeText(rawProductName);

  // Update synonyms - merge OpenAI synonyms with usage-based synonyms
  const synonyms = existingProduct ? [...existingProduct.synonyms] : [];
  const synonymsNormalized = existingProduct ? [...existingProduct.synonyms_normalized] : [];
  const synonymsStats = existingProduct ? [...existingProduct.synonyms_stats] : [];

  // Add OpenAI synonyms if available (from new classification)
  if (classification.openai_synonyms && Array.isArray(classification.openai_synonyms)) {
    classification.openai_synonyms.forEach((synonym) => {
      const normalizedSynonym = normalizeText(synonym);
      if (!synonymsNormalized.includes(normalizedSynonym)) {
        synonyms.push(synonym);
        synonymsNormalized.push(normalizedSynonym);
        synonymsStats.push({ synonym, count: 1 });
      }
    });
  }

  // Add the raw product name from this nota item
  if (!synonymsNormalized.includes(normalizedProductName)) {
    synonyms.push(rawProductName);
    synonymsNormalized.push(normalizedProductName);
    synonymsStats.push({ synonym: rawProductName, count: 1 });
  } else {
    // Update count for existing synonym
    const statIndex = synonymsStats.findIndex((stat) => normalizeText(stat.synonym) === normalizedProductName);
    if (statIndex >= 0) {
      synonymsStats[statIndex].count += 1;
    }
  }

  // Remove openai_synonyms from classification before saving (it's not part of the model)
  delete classification.openai_synonyms;

  if (existingProduct) {
    // Update existing product
    existingProduct.canonical_name = classification.canonical_name || existingProduct.canonical_name;
    existingProduct.canonical_name_normalized =
      classification.canonical_name_normalized || existingProduct.canonical_name_normalized;
    existingProduct.brand = classification.brand || existingProduct.brand;
    existingProduct.brand_normalized = classification.brand_normalized || existingProduct.brand_normalized;
    existingProduct.category = classification.category || existingProduct.category;
    existingProduct.subcategory = classification.subcategory || existingProduct.subcategory;
    existingProduct.category_key = classification.category_key || existingProduct.category_key;
    existingProduct.package_size = classification.package_size || existingProduct.package_size;
    existingProduct.unit = classification.unit || existingProduct.unit;
    existingProduct.quantity = classification.quantity || existingProduct.quantity;
    existingProduct.package_description = classification.package_description || existingProduct.package_description;
    existingProduct.gtin = classification.gtin || existingProduct.gtin;
    existingProduct.ncm = classification.ncm || existingProduct.ncm;
    existingProduct.origin = classification.origin || existingProduct.origin;
    existingProduct.is_alcoholic =
      classification.is_alcoholic !== undefined ? classification.is_alcoholic : existingProduct.is_alcoholic;
    existingProduct.is_fresh_produce =
      classification.is_fresh_produce !== undefined ? classification.is_fresh_produce : existingProduct.is_fresh_produce;
    existingProduct.is_bulk = classification.is_bulk !== undefined ? classification.is_bulk : existingProduct.is_bulk;
    existingProduct.confidence = Math.max(classification.confidence || 0, existingProduct.confidence);
    existingProduct.source = classification.source || existingProduct.source;
    existingProduct.synonyms = synonyms;
    existingProduct.synonyms_normalized = synonymsNormalized;
    existingProduct.synonyms_stats = synonymsStats;
    existingProduct.updated_by = userId;

    await existingProduct.save();
  } else {
    // Create new product
    const newProduct = await CanonicalProduct.create({
      ...classification,
      synonyms,
      synonyms_normalized: synonymsNormalized,
      synonyms_stats: synonymsStats,
      scope: groupId ? 'group' : 'global',
      group_id: groupId,
      created_by: userId,
      updated_by: userId,
    });
    return newProduct;
  }
  return existingProduct;
};

/**
 * Create a canonical product
 * @param {Object} productBody
 * @returns {Promise<CanonicalProduct>}
 */
const createCanonicalProduct = async (productBody) => {
  // Normalize canonical name
  if (productBody.canonical_name) {
    productBody.canonical_name_normalized = normalizeText(productBody.canonical_name);
  }
  if (productBody.brand) {
    productBody.brand_normalized = normalizeText(productBody.brand);
  }

  return CanonicalProduct.create(productBody);
};

/**
 * Query for canonical products
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryCanonicalProducts = async (filter, options) => {
  const parsedFilter = filter.filters ? JSON.parse(filter.filters) : {};
  const parsedSort =
    'sort' in options && options.sort ? JSON.parse(options.sort) : '[{"orderBy": "createdAt", "order": "desc"}]';

  const adjustedOptions = {
    limit: parseInt(options.limit, 10) || 10,
    page: parseInt(options.page, 10) || 1,
    sortBy:
      parsedSort && parsedSort[0] && parsedSort[0].orderBy
        ? `${parsedSort[0].orderBy}:${parsedSort[0].order || 'desc'}`
        : 'createdAt:desc',
  };

  const products = await CanonicalProduct.paginate(parsedFilter, adjustedOptions);
  products.hasNextPage = products.page < products.totalPages;
  return products;
};

/**
 * Get canonical product by id
 * @param {ObjectId} id
 * @returns {Promise<CanonicalProduct>}
 */
const getCanonicalProductById = async (id) => {
  return CanonicalProduct.findById(id);
};

/**
 * Update canonical product by id
 * @param {ObjectId} productId
 * @param {Object} updateBody
 * @returns {Promise<CanonicalProduct>}
 */
const updateCanonicalProductById = async (productId, updateBody) => {
  const product = await getCanonicalProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CanonicalProduct not found');
  }

  // Normalize fields if they're being updated
  if (updateBody.canonical_name) {
    updateBody.canonical_name_normalized = normalizeText(updateBody.canonical_name);
  }
  if (updateBody.brand) {
    updateBody.brand_normalized = normalizeText(updateBody.brand);
  }

  Object.assign(product, updateBody);
  await product.save();
  return product;
};

/**
 * Delete canonical product by id
 * @param {ObjectId} productId
 * @returns {Promise<CanonicalProduct>}
 */
const deleteCanonicalProductById = async (productId) => {
  const product = await getCanonicalProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CanonicalProduct not found');
  }
  await product.remove();
  return product;
};

/**
 * Search canonical products by name or synonym
 * @param {string} searchTerm
 * @param {Object} options - Options with groupId, scope, etc.
 * @returns {Promise<CanonicalProduct[]>}
 */
const searchCanonicalProducts = async (searchTerm, options = {}) => {
  const { groupId = null, limit = 20 } = options;
  const normalizedSearch = normalizeText(searchTerm);

  const filter = {
    $or: [
      { canonical_name_normalized: { $regex: normalizedSearch, $options: 'i' } },
      { synonyms_normalized: { $in: [normalizedSearch] } },
      { brand_normalized: normalizedSearch },
    ],
    scope: groupId ? 'group' : 'global',
    ...(groupId ? { group_id: groupId } : { group_id: null }),
  };

  return CanonicalProduct.find(filter).limit(limit).sort({ confidence: -1, createdAt: -1 });
};

module.exports = {
  createCanonicalProduct,
  createOrUpdateFromNotaItem,
  queryCanonicalProducts,
  getCanonicalProductById,
  updateCanonicalProductById,
  deleteCanonicalProductById,
  searchCanonicalProducts,
  classifyProductWithOpenAI,
};
