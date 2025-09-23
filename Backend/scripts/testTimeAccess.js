import { 
  timeAccessControl, 
  isWithinAccessWindow, 
  getCurrentPKTTime, 
  getNextAccessTime 
} from '../middlewares/timeAccess.js';

// Test the time access functionality
const testTimeAccess = () => {
  console.log('🕐 Time Access Control Test\n');
  
  const currentPKT = getCurrentPKTTime();
  const isAllowed = isWithinAccessWindow();
  const nextAccess = getNextAccessTime();
  
  console.log(`Current PKT Time: ${currentPKT.toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}`);
  console.log(`Access Allowed: ${isAllowed ? '✅ YES' : '❌ NO'}`);
  console.log(`Access Window: 6:15 PM - 5:15 AM PKT`);
  
  if (nextAccess) {
    console.log(`Next Access: ${nextAccess.toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}`);
  } else {
    console.log('Next Access: Currently within access window');
  }
  
  console.log('\n🧪 Testing different times:');
  
  // Test various times
  const testTimes = [
    { hour: 6, minute: 0, description: '6:00 AM' },
    { hour: 5, minute: 15, description: '5:15 AM (boundary)' },
    { hour: 5, minute: 16, description: '5:16 AM' },
    { hour: 12, minute: 0, description: '12:00 PM (noon)' },
    { hour: 18, minute: 14, description: '6:14 PM' },
    { hour: 18, minute: 15, description: '6:15 PM (boundary)' },
    { hour: 22, minute: 0, description: '10:00 PM' },
    { hour: 2, minute: 0, description: '2:00 AM' }
  ];
  
  testTimes.forEach(time => {
    const testDate = new Date();
    testDate.setHours(time.hour, time.minute, 0, 0);
    
    const timeInMinutes = (time.hour * 60) + time.minute;
    const startTime = (18 * 60) + 15; // 6:15 PM
    const endTime = (5 * 60) + 15;    // 5:15 AM
    
    // Test the logic
    let allowed = false;
    if (startTime > endTime) {
      allowed = (timeInMinutes >= startTime) || (timeInMinutes <= endTime);
    } else {
      allowed = (timeInMinutes >= startTime) && (timeInMinutes <= endTime);
    }
    
    console.log(`  ${time.description}: ${allowed ? '✅ Allowed' : '❌ Blocked'}`);
  });
  
  console.log('\n📝 Summary:');
  console.log('✅ Allowed times: 6:15 PM to 5:15 AM');
  console.log('❌ Blocked times: 5:16 AM to 6:14 PM');
};

// Mock request/response for testing middleware
const testMiddleware = () => {
  console.log('\n🔧 Testing Middleware Function:');
  
  const mockReq = {};
  const mockRes = {
    status: (code) => ({
      json: (data) => {
        console.log(`Response Status: ${code}`);
        console.log('Response Data:', JSON.stringify(data, null, 2));
        return mockRes;
      }
    })
  };
  const mockNext = () => console.log('✅ Middleware passed - access granted');
  
  try {
    timeAccessControl(mockReq, mockRes, mockNext);
  } catch (error) {
    console.error('❌ Middleware error:', error);
  }
};

// Run tests
testTimeAccess();
testMiddleware();