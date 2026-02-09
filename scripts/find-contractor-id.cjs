/**
 * Script to find a contractor's user ID by email or name
 * Usage: node find-contractor-id.js <email_or_name>
 * Example: node find-contractor-id.js "Greg Wilson"
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin using application default credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'quicktrash-1cdff'
});

const db = admin.firestore();

async function findContractor(searchTerm) {
  console.log(`Searching for contractor: ${searchTerm}`);
  
  try {
    const usersSnapshot = await db.collection('users')
      .where('role', '==', 'contractor')
      .get();
    
    console.log(`Found ${usersSnapshot.size} contractors\n`);
    
    const matches = [];
    usersSnapshot.forEach((doc) => {
      const user = doc.data();
      const name = user.displayName || '';
      const email = user.email || '';
      
      if (name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          email.toLowerCase().includes(searchTerm.toLowerCase())) {
        matches.push({
          id: doc.id,
          name: name,
          email: email,
          phone: user.phoneNumber || 'N/A',
          stripeAccount: user.stripeConnectedAccountId || 'Not set'
        });
      }
    });
    
    if (matches.length === 0) {
      console.log('No contractors found matching that search term');
      process.exit(0);
    }
    
    console.log('Matching contractors:');
    console.log('='.repeat(80));
    matches.forEach((contractor) => {
      console.log(`\nID: ${contractor.id}`);
      console.log(`Name: ${contractor.name}`);
      console.log(`Email: ${contractor.email}`);
      console.log(`Phone: ${contractor.phone}`);
      console.log(`Stripe Account: ${contractor.stripeAccount}`);
      console.log('-'.repeat(80));
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get search term from command line arguments
const searchTerm = process.argv[2];

if (!searchTerm) {
  console.error('ERROR: Please provide a search term (email or name)');
  console.log('Usage: node find-contractor-id.js <email_or_name>');
  console.log('Example: node find-contractor-id.js "Greg Wilson"');
  process.exit(1);
}

findContractor(searchTerm);
