# QuickTrash - On-Demand Waste Management Platform

QuickTrash is a comprehensive cross-platform mobile application that revolutionizes the trash pickup industry by connecting customers needing immediate waste removal with a network of vetted independent contractors ("Pickers"). Built with React Native and Expo SDK 53, the app supports three distinct user roles in a single, unified application.

## 🚀 Features

### Multi-Role Architecture
- **Customer**: Request on-demand trash pickup services
- **Contractor (Picker)**: Earn money by completing pickup jobs
- **Employee (Admin)**: Manage operations, disputes, and platform oversight

### Core Functionality

#### For Customers
- ✅ **Role-based onboarding** with intuitive interface
- ✅ **Place pickup orders** with multiple waste types (household, bulk, yard, construction, recyclables)
- ✅ **Volume selection** with visual guides (1-5 bags, pickup load, trailer load)
- ✅ **Instant pricing calculation** based on volume, type, and distance
- ✅ **ASAP or scheduled pickup** options
- ✅ **Photo upload** for trash location documentation
- ✅ **GPS location services** for accurate pickup addresses
- 🔄 Real-time tracking of assigned contractor
- 🔄 Secure chat with contractors
- 🔄 Payment processing (Stripe integration)
- 🔄 Order history and rewards system

#### For Contractors
- ✅ **Verification system** for background checks and vehicle information
- ✅ **Online/offline toggle** for job availability
- ✅ **Interactive map** showing available jobs nearby
- ✅ **Job offer system** with 40-second countdown timer
- ✅ **Performance dashboard** with earnings, ratings, and statistics
- 🔄 Route navigation via Google Maps
- 🔄 Photo workflow (before/after pickup, disposal confirmation)
- 🔄 Real-time earnings tracking
- 🔄 Safety toolkit with emergency features

#### For Employees
- ✅ **Master dashboard** with live job monitoring
- ✅ **User management** for customers and contractors
- ✅ **Dispute resolution center** with ticketing system
- ✅ **Live map tracking** of all active jobs and contractors
- ✅ **Performance analytics** and reporting
- 🔄 Broadcast messaging to contractors
- 🔄 Disposal partner management

### Technology Stack

- **Frontend**: React Native with Expo SDK 53
- **Backend**: Firebase (Firestore, Authentication, Storage, Cloud Functions)
- **Maps & Location**: React Native Maps, Expo Location
- **Notifications**: Expo Notifications with Firebase Cloud Messaging
- **Image Handling**: Expo Image Picker
- **Navigation**: React Navigation v7
- **State Management**: React Hooks and Context
- **Real-time Features**: Firestore real-time listeners

## 📱 Screens & Navigation

### Authentication Flow
1. **Role Selection** - Choose between Customer, Contractor, or Employee
2. **Login/Signup** - Role-specific authentication
3. **Dashboard** - Role-based interface after login

### Customer Flow
- **Customer Dashboard** - Overview, quick order, recent pickups
- **Create Order** - Detailed order creation with pricing
- **Order Tracking** - Real-time contractor tracking
- **Chat** - Communication with assigned contractor
- **Order History** - Past pickups and receipts

### Contractor Flow
- **Contractor Dashboard** - Performance stats, available jobs
- **Job Offers** - Accept/decline jobs with countdown
- **Active Job** - Step-by-step pickup workflow
- **Earnings** - Daily/weekly payout tracking
- **Navigation** - Integrated GPS routing

### Employee Flow
- **Admin Dashboard** - System overview and monitoring
- **Job Management** - Monitor all active pickups
- **User Management** - Approve contractors, manage customers
- **Dispute Resolution** - Handle customer/contractor issues
- **Analytics** - Business metrics and reporting

## 🗄️ Database Schema

### Firestore Collections

#### Users Collection
```javascript
users: {
  [userId]: {
    email: string,
    displayName: string,
    role: "customer" | "contractor" | "employee",
    customerData: { /* customer-specific fields */ },
    contractorData: { /* contractor-specific fields */ },
    employeeData: { /* employee-specific fields */ }
  }
}
```

#### Jobs Collection
```javascript
jobs: {
  [jobId]: {
    customerId: string,
    contractorId: string | null,
    status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled",
    wasteType: string,
    volume: string,
    pickupAddress: object,
    pricing: object,
    photos: object,
    createdAt: timestamp
  }
}
```

### Additional Collections
- **Chat Messages** (subcollection under jobs)
- **Disputes** - Customer/contractor issue tracking
- **Ratings** - Mutual rating system
- **Notifications** - Push notification management
- **App Configuration** - Pricing, service areas, disposal partners

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- Expo CLI
- iOS Simulator or Android Emulator
- Firebase project

### Installation Steps

1. **Clone the repository**
   ```bash
   cd /Users/mabele/aResume/aResume/aResume/QT/QuickTrash
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure Firebase**
   - Update `firebaseConfig.js` with your Firebase project credentials
   - Enable Firestore, Authentication, and Storage in Firebase console
   - Set up security rules using the template in `config/firebaseSchema.js`

4. **Configure app.json**
   - Add your Google Maps API key for Android
   - Update bundle identifiers for iOS/Android

5. **Run the application**
   ```bash
   npm start
   # or
   expo start
   ```

### Development Environment Setup

1. **Install Expo tools**
   ```bash
   npm install -g @expo/cli
   ```

2. **Set up environment variables**
   - Create `.env` file with API keys
   - Configure Firebase environment

3. **Enable development build**
   ```bash
   expo install expo-dev-client
   ```

## 🎨 Design System

### Color Palette
- **Primary Green**: #34A853 (Customer theme)
- **Contractor Blue**: #1E88E5 (Contractor theme)
- **Employee Orange**: #FF8F00 (Employee theme)
- **Neutral Colors**: Various grays for backgrounds and text

### Typography
- **Headers**: Bold, 18-24px
- **Body Text**: Regular, 14-16px
- **Captions**: 12-14px
- **System Font**: San Francisco (iOS), Roboto (Android)

### Component Library
- Reusable UI components in `/components` directory
- Consistent styling with StyleSheet
- Platform-specific adaptations where needed

## 🚦 App Flow

### Customer Journey
1. Select "Get Trash Picked Up" → Login/Signup
2. Customer Dashboard → "Request Pickup"
3. Select waste type → Choose volume → Add location/photos
4. Review pricing → Create order
5. Track contractor → Chat if needed
6. Pickup completion → Rate experience

### Contractor Journey
1. Select "Become a Picker" → Complete verification
2. Toggle online → View available jobs on map
3. Accept job offer → Navigate to location
4. Complete pickup workflow with photos
5. Drive to disposal facility → Confirm disposal
6. Receive payment → Rate customer

### Employee Journey
1. Employee login → Admin dashboard
2. Monitor live jobs and contractors
3. Manage disputes and approvals
4. Generate reports and analytics
5. Broadcast messages to contractors

## 📊 Business Model

### Revenue Streams
- **Service Fee**: 15% of total job value
- **Premium Services**: "We-Load" assistance, urgent pickup
- **Subscription Plans**: Recurring pickups for businesses
- **Disposal Partner Fees**: Revenue sharing with facilities

### Pricing Structure
- **Base Fees**: Varies by waste type and volume
- **Service Fee**: 15% to QuickTrash
- **Contractor Payout**: 80% of total fee
- **Dynamic Pricing**: Surge pricing during high demand

## 🔐 Security & Privacy

### Authentication
- Firebase Authentication with email/password
- Social login support (Google, Apple, Facebook)
- Role-based access control

### Data Protection
- Firestore security rules for data access
- Encrypted communication between users
- PII protection and GDPR compliance
- Secure payment processing

### Safety Features
- Background checks for contractors
- Vehicle verification and insurance
- Emergency assistance button
- Location sharing with trusted contacts

## 🚀 Deployment

### Build Configuration
```bash
# Development build
expo build:ios --type development
expo build:android --type development

# Production build
expo build:ios --type release
expo build:android --type release
```

### App Store Deployment
- iOS: Xcode + App Store Connect
- Android: Android Studio + Google Play Console

### Environment Management
- Development: Firebase test project
- Staging: Separate Firebase project
- Production: Production Firebase project

## 📈 Analytics & Monitoring

### Key Performance Indicators
- **User Acquisition**: New signups per role
- **Activation**: First completed job
- **Retention**: Monthly active users
- **Revenue**: Gross transaction value
- **Quality**: Average ratings and completion times

### Monitoring Tools
- Firebase Analytics for user behavior
- Crashlytics for error tracking
- Performance monitoring for app speed
- Custom dashboards for business metrics

## 🛠️ Development Status

### ✅ Completed Features
- Multi-role architecture and navigation
- Firebase integration and data structure
- Customer dashboard and order creation
- Contractor dashboard with job management
- Employee admin panel
- Chat system and notifications
- Location services and photo handling
- Comprehensive styling and UX

### 🔄 In Progress
- Real-time tracking and maps integration
- Payment processing with Stripe
- Photo upload to Firebase Storage
- Push notifications implementation

### 📋 Planned Features
- Social authentication (Google, Apple, Facebook)
- Advanced analytics and reporting
- Subscription management
- Multi-language support
- Performance optimizations

## 🤝 Contributing

### Development Guidelines
1. Follow React Native best practices
2. Use TypeScript for type safety
3. Implement proper error handling
4. Write unit tests for critical functions
5. Document new features and APIs

### Code Structure
```
/screens          # Main application screens
/components       # Reusable UI components
/config           # Configuration files
/services         # API and business logic
/utils            # Utility functions
/assets           # Images and static resources
```

## 📞 Support

For technical support or business inquiries:
- **Email**: support@quicktrash.com
- **Documentation**: Internal wiki and API docs
- **Issue Tracking**: GitHub Issues or internal ticketing

---

**QuickTrash** - Revolutionizing waste management, one pickup at a time! 🚛♻️