/**
 * Script to check nota status and recent canonical products
 */

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const config = require('../src/config/config');
const { Nota, CanonicalProduct } = require('../src/models');

async function checkStatus() {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');

    // Check most recent nota
    const recentNota = await Nota.findOne().sort({ updatedAt: -1 });
    if (recentNota) {
      console.log('📄 Most Recent Nota:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`ID: ${recentNota._id}`);
      console.log(`Status: ${recentNota.status}`);
      console.log(`URL: ${recentNota.url}`);
      console.log(`Items: ${recentNota.items ? recentNota.items.length : 0}`);
      console.log(`Total: R$ ${recentNota.total || 0}`);
      console.log(`Vendor: ${recentNota.vendorName || 'N/A'}`);
      console.log(`Updated: ${recentNota.updatedAt}`);
      
      if (recentNota.items && recentNota.items.length > 0) {
        console.log('\n📦 Items:');
        recentNota.items.slice(0, 5).forEach((item, i) => {
          console.log(`  ${i + 1}. ${item.product || item.name || 'Unknown'}`);
        });
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // Check recent canonical products
    const recentProducts = await CanonicalProduct.find().sort({ createdAt: -1 }).limit(5);
    console.log(`📦 Recent Canonical Products (${recentProducts.length}):`);
    if (recentProducts.length > 0) {
      recentProducts.forEach((p, i) => {
        console.log(`\n${i + 1}. ${p.canonical_name}`);
        console.log(`   Brand: ${p.brand || 'N/A'}`);
        console.log(`   Category: ${p.category || 'N/A'} (${p.category_key || 'N/A'})`);
        console.log(`   Source: ${p.source} | Confidence: ${p.confidence}`);
        console.log(`   Created: ${p.createdAt}`);
      });
    } else {
      console.log('   No canonical products found yet.');
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStatus();

