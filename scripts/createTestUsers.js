// Script to create test users for QuickTrash Firebase project
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJJ02DW6WSpnAr04PWRLh243VGBtUaGvY",
  authDomain: "quicktrash-1cdff.firebaseapp.com",
  projectId: "quicktrash-1cdff",
  storageBucket: "quicktrash-1cdff.firebasestorage.app",
  messagingSenderId: "255447451336",
  appId: "1:255447451336:web:8a6025a6e63b0ddac2c7fd",
  measurementId: "G-T7WD3D3EZ0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Test users data
const testUsers = [
  // 5 Customers
  {
    email: "customer.sarah.restaurant@quicktrash.com",
    password: "TestPass123!",
    displayName: "Sarah Martinez",
    role: "customer",
    businessType: "restaurant",
    address: "123 Main St, Atlanta, GA 30309",
    phone: "+1-404-555-0101"
  },
  {
    email: "customer.mike.homeowner@quicktrash.com", 
    password: "TestPass123!",
    displayName: "Mike Johnson",
    role: "customer",
    businessType: "residential",
    address: "456 Oak Ave, Marietta, GA 30060",
    phone: "+1-404-555-0102"
  },
  {
    email: "customer.lisa.office@quicktrash.com",
    password: "TestPass123!",
    displayName: "Lisa Chen",
    role: "customer", 
    businessType: "office",
    address: "789 Business Blvd, Sandy Springs, GA 30328",
    phone: "+1-404-555-0103"
  },
  {
    email: "customer.david.retail@quicktrash.com",
    password: "TestPass123!",
    displayName: "David Rodriguez",
    role: "customer",
    businessType: "retail",
    address: "321 Commerce Dr, Roswell, GA 30075",
    phone: "+1-404-555-0104"
  },
  {
    email: "customer.emma.construction@quicktrash.com",
    password: "TestPass123!",
    displayName: "Emma Thompson",
    role: "customer",
    businessType: "construction",
    address: "654 Industrial Way, Alpharetta, GA 30009", 
    phone: "+1-404-555-0105"
  },

  // 2 Trash Pickers (Contractors)
  {
    email: "picker.greg.student@quicktrash.com",
    password: "TestPass123!",
    displayName: "Greg Wilson",
    role: "contractor",
    vehicleType: "pickup_truck",
    vehicleModel: "2018 Ford F-150",
    licensePlate: "GA-QT001",
    availability: "part_time",
    experience: "6_months"
  },
  {
    email: "picker.maria.fulltime@quicktrash.com",
    password: "TestPass123!",
    displayName: "Maria Garcia",
    role: "contractor",
    vehicleType: "cargo_van", 
    vehicleModel: "2020 Ford Transit 250",
    licensePlate: "GA-QT002",
    availability: "full_time",
    experience: "2_years"
  },

  // 2 Employees (Tech Support + Manager)
  {
    email: "support.alex.tech@quicktrash.com",
    password: "TestPass123!",
    displayName: "Alex Kumar",
    role: "employee",
    department: "technical_support",
    jobTitle: "Tech Support Specialist",
    employeeId: "QT-EMP-001",
    permissions: ["customer_support", "contractor_support", "basic_analytics"]
  },
  {
    email: "manager.olivia.ops@quicktrash.com",
    password: "TestPass123!",
    displayName: "Olivia Roberts",
    role: "employee",
    department: "operations",
    jobTitle: "Operations Manager", 
    employeeId: "QT-EMP-002",
    permissions: ["full_admin", "user_management", "dispute_resolution", "analytics", "financial_reports"]
  },

  // 1 Random User (Beta Tester)
  {
    email: "beta.tester.john@quicktrash.com",
    password: "TestPass123!",
    displayName: "John Doe",
    role: "customer",
    businessType: "testing",
    notes: "Beta tester account for app testing",
    address: "999 Test Lane, Testing, GA 30000",
    phone: "+1-404-555-9999"
  }
];

async function createTestUsers() {
  console.log('🚀 Starting to create test users...\n');
  
  const createdUsers = [];
  const failedUsers = [];

  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    
    try {
      console.log(`Creating user ${i + 1}/10: ${user.displayName} (${user.email})`);
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        user.email, 
        user.password
      );
      
      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: user.displayName
      });

      // Create user document in Firestore
      const userDoc = {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        ...user // Spread the rest of user properties
      };
      
      // Remove password from Firestore document
      delete userDoc.password;
      
      await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);
      
      createdUsers.push({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        role: user.role,
        uid: userCredential.user.uid
      });
      
      console.log(`✅ Successfully created: ${user.displayName}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Failed to create ${user.displayName}:`, error.message);
      failedUsers.push({
        user: user.displayName,
        email: user.email,
        error: error.message
      });
    }
  }
  
  console.log('\n📊 RESULTS SUMMARY:');
  console.log('='.repeat(50));
  console.log(`✅ Successfully created: ${createdUsers.length} users`);
  console.log(`❌ Failed to create: ${failedUsers.length} users`);
  
  if (createdUsers.length > 0) {
    console.log('\n👥 CREATED USERS CREDENTIALS:');
    console.log('='.repeat(50));
    createdUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.displayName} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   UID: ${user.uid}`);
      console.log('');
    });
  }
  
  if (failedUsers.length > 0) {
    console.log('\n❌ FAILED USERS:');
    console.log('='.repeat(50));
    failedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.user} (${user.email})`);
      console.log(`   Error: ${user.error}`);
      console.log('');
    });
  }
  
  console.log('\n🎉 User creation process completed!');
  process.exit(0);
}

// Run the script
createTestUsers().catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
