/**
 * Test subcategory mapping with a new product
 */

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const config = require('../src/config/config');
const { canonicalProductService } = require('../src/services');

async function testSubcategory() {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');

    // Test with a product that should have a subcategory
    const testProduct = {
      product: 'Iogurte Natural Nestlé 170g',
      code: '7891234567891',
      quantity: 1,
      unitPrice: 3.50,
      totalPrice: 3.50,
    };

    console.log('🧪 Testing subcategory with:', testProduct.product);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const result = await canonicalProductService.createOrUpdateFromNotaItem(testProduct, {
      userId: 'test-user',
      groupId: null,
      useOpenAI: true,
    });

    console.log('\n✅ Result:');
    console.log(`Category: ${result.category} (${result.category_key})`);
    console.log(`Subcategory: ${result.subcategory || 'NULL'}`);
    console.log(`Source: ${result.source}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

testSubcategory();

