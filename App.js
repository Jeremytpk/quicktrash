import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider } from './contexts/UserContext';

// Screens & Components
import RoleSelection from './screens/RoleSelection';
import Login from './screens/Login';
import Signup from './screens/Signup';
import Transit from './screens/Transit'; 
import CustomerDashboard from './screens/CustomerDashboard';
import ContractorDashboard from './screens/ContractorDashboard';
import EmployeeDashboard from './screens/EmployeeDashboard';
import CreateOrder from './screens/CreateOrder';
import OrderHistory from './screens/OrderHistory';
import FirebaseTest from './components/FirebaseTest';
import SplashScreen from './screens/SplashScreen';
import Profile from './screens/Profile';
import Notifications from './screens/Notifications';
import Settings from './screens/Settings';
import PrivacyPolicy from './screens/PrivacyPolicy';
import TermsConditions from './screens/TermsConditions';
import About from './screens/About';
import HelpFAQ from './screens/HelpFAQ';
import ContactSupport from './screens/ContactSupport';
import ErrorScreen from './screens/ErrorScreen';
import LocationDebugScreen from './components/LocationDebugScreen';
import LocationTestSimple from './components/LocationTestSimple';
import LocationVerification from './components/LocationVerification';
import WithdrawModal from './screens/WithdrawModal';

// Customer screens
import PaymentMethods from './screens/PaymentMethods';

// Contractor screens
import MyJobs from './screens/MyJobs';
import Earnings from './screens/Earnings';
import VehicleInfo from './screens/VehicleInfo';
import SafetyToolkit from './screens/SafetyToolkit';
import WithdrawToDebit from './screens/WithdrawToDebit';

// Employee screens
import UserManagement from './screens/UserManagement';
import SignupDriver from './screens/SignupDriver';
import JobMonitoring from './screens/JobMonitoring';
import Analytics from './screens/Analytics';
import MyRatings from './screens/MyRatings';
import Disputes from './screens/Disputes';
import AdminTools from './screens/AdminTools';
import Activities from './screens/Activities';
import ActivityDetails from './screens/ActivityDetails';
import ContractorActivities from './screens/ContractorActivities';
import ContractorDetails from './screens/ContractorDetails';
import FinancialOperations from './screens/FinancialOperations';
import TransactionDetails from './screens/TransactionDetails';
import RatingsInsights from './screens/RatingsInsights';


// Create the stack navigator
const Stack = createNativeStackNavigator();

function App() {
  return (
    <UserProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Transit">
          <Stack.Screen 
            name="FirebaseTest" 
            component={FirebaseTest} 
            options={{ title: 'Firebase Connection Test', headerTitleAlign: 'center' }} 
          />
          <Stack.Screen 
            name="LocationDebug" 
            component={LocationDebugScreen} 
            options={{ title: 'Location Debug', headerTitleAlign: 'center' }} 
          />
          <Stack.Screen 
            name="LocationTestSimple" 
            component={LocationTestSimple} 
            options={{ title: 'Simple Location Test', headerTitleAlign: 'center' }} 
          />
          <Stack.Screen 
            name="LocationVerification" 
            component={LocationVerification} 
            options={{ title: 'Location Verification', headerTitleAlign: 'center' }} 
          />
          <Stack.Screen 
            name="RoleSelection" 
            component={RoleSelection} 
            options={{ title: '' }} 
          />
          <Stack.Screen 
            name="Login" 
            component={Login} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Signup" 
            component={Signup} 
            options={{ title: 'Sign Up', headerTitleAlign: 'center' }} 
          />
          <Stack.Screen 
            name="SignupDriver" 
            component={SignupDriver} 
            options={{ title: "", headerTitleAlign: 'center' }} 
          />
          <Stack.Screen
            name="Transit"
            component={Transit}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="CustomerDashboard" 
            component={CustomerDashboard} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="ContractorDashboard" 
            component={ContractorDashboard} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="EmployeeDashboard" 
            component={EmployeeDashboard} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="CreateOrder" 
            component={CreateOrder} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="OrderHistory" 
            component={OrderHistory} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="SplashScreen" 
            component={SplashScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Profile" 
            component={Profile} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Notifications" 
            component={Notifications} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Settings" 
            component={Settings} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="PrivacyPolicy" 
            component={PrivacyPolicy} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="TermsConditions" 
            component={TermsConditions} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="About" 
            component={About} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="HelpFAQ" 
            component={HelpFAQ} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="ContactSupport" 
            component={ContactSupport} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="ErrorScreen" 
            component={ErrorScreen} 
            options={{ headerShown: false }} 
          />
          
          {/* Customer Screens */}
          <Stack.Screen 
            name="PaymentMethods" 
            component={PaymentMethods} 
            options={{ headerShown: false }} 
          />
          
          {/* Contractor Screens */}
          <Stack.Screen 
            name="MyJobs" 
            component={MyJobs} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Earnings" 
            component={Earnings} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="WithdrawToDebit"
            component={WithdrawToDebit}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="VehicleInfo" 
            component={VehicleInfo} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="SafetyToolkit" 
            component={SafetyToolkit} 
            options={{ headerShown: false }} 
          />
          
          {/* Employee Screens */}
          <Stack.Screen 
            name="UserManagement" 
            component={UserManagement} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="JobMonitoring" 
            component={JobMonitoring} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Analytics" 
            component={Analytics} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Disputes" 
            component={Disputes} 
            options={{ headerShown: false }} 
          />
              <Stack.Screen
                name="AdminTools"
                component={AdminTools}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Activities"
                component={Activities}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ActivityDetails"
                component={ActivityDetails}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ContractorActivities"
                component={ContractorActivities}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ContractorDetails"
                component={ContractorDetails}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="FinancialOperations"
                component={FinancialOperations}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="TransactionDetails"
                component={TransactionDetails}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="RatingsInsights"
                component={RatingsInsights}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MyRatings"
                component={MyRatings}
                options={{ headerShown: false }}
              />
          <Stack.Screen 
            name="WithdrawModal"
            component={WithdrawModal}
            options={{ presentation: 'modal', headerShown: false }} 
          />
          <Stack.Screen 
            name="PaymentModal"
            component={require('./components/PaymentModal').default}
            options={{ headerShown: false }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </UserProvider>
  );
}

export default App;