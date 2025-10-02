#!/usr/bin/env node

/**
 * Migration script to fix groups that don't have memberships for their creators
 * Run this script once to fix existing groups
 */

const mongoose = require('mongoose');
const config = require('../src/config/config');

const runMigration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    // Import the service
    const { groupService } = require('../src/services');

    console.log('Starting migration to fix group memberships...');
    
    // Run the migration
    const fixedCount = await groupService.fixGroupsWithoutCreatorMemberships();
    
    console.log(`Migration completed successfully! Fixed ${fixedCount} groups.`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the migration
runMigration();
