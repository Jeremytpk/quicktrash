/**
 * Script to manually mark a contractor's completed jobs as paid out
 * Usage: node mark-contractor-paid.js <contractorUserId>
 * Example: node mark-contractor-paid.js abc123xyz
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin using application default credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'quicktrash-1cdff'
});

const db = admin.firestore();

async function markContractorPaid(contractorId) {
  console.log(`Marking completed jobs as paid for contractor: ${contractorId}`);
  
  try {
    // Get contractor name
    const userDoc = await db.collection('users').doc(contractorId).get();
    if (!userDoc.exists) {
      console.error(`ERROR: Contractor ${contractorId} not found in users collection`);
      process.exit(1);
    }
    
    const userData = userDoc.data();
    const contractorName = userData.displayName || userData.email || contractorId;
    console.log(`Found contractor: ${contractorName}`);
    
    // Find all completed jobs for this contractor that haven't been paid out
    const jobsSnapshot = await db.collection('jobs')
      .where('contractorId', '==', contractorId)
      .where('status', '==', 'completed')
      .get();
    
    console.log(`Found ${jobsSnapshot.size} completed jobs`);
    
    if (jobsSnapshot.empty) {
      console.log('No completed jobs found for this contractor');
      process.exit(0);
    }
    
    // Filter to only unpaid jobs
    const unpaidJobs = [];
    let totalAmount = 0;
    
    jobsSnapshot.forEach((doc) => {
      const job = doc.data();
      if (!job.contractorPaidOut) {
        const amount = job.pricing?.contractorPayout || 0;
        unpaidJobs.push({
          id: doc.id,
          amount: amount,
          customerId: job.customerId,
          wasteType: job.wasteType
        });
        totalAmount += amount;
      }
    });
    
    console.log(`\nFound ${unpaidJobs.length} unpaid jobs:`);
    unpaidJobs.forEach((job) => {
      console.log(`  - ${job.id}: $${job.amount.toFixed(2)} (${job.wasteType || 'N/A'})`);
    });
    console.log(`\nTotal amount to mark as paid: $${totalAmount.toFixed(2)}`);
    
    // Confirm with user
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('\nMark these jobs as paid out? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('Operation cancelled');
        readline.close();
        process.exit(0);
      }
      
      // Update all unpaid jobs
      const batch = db.batch();
      unpaidJobs.forEach((job) => {
        const jobRef = db.collection('jobs').doc(job.id);
        batch.update(jobRef, {
          contractorPaidOut: true,
          contractorPaidOutAt: admin.firestore.FieldValue.serverTimestamp(),
          contractorPaidOutAmount: job.amount,
          transferId: 'manual_payout',
          manualPayout: true,
          manualPayoutNote: 'Manually marked as paid via script'
        });
      });
      
      await batch.commit();
      console.log(`\n✅ Successfully marked ${unpaidJobs.length} jobs as paid out`);
      console.log(`Total: $${totalAmount.toFixed(2)}`);
      
      readline.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get contractor ID from command line arguments
const contractorId = process.argv[2];

if (!contractorId) {
  console.error('ERROR: Please provide a contractor user ID');
  console.log('Usage: node mark-contractor-paid.js <contractorUserId>');
  process.exit(1);
}

markContractorPaid(contractorId);
