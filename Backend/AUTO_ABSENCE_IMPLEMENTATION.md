# Auto-Absence Marking System - Implementation Guide

## 🎯 Overview

This system automatically marks all active employees as "Absent" at the start of the attendance window (6:00 PM PKT) and updates their status to "Present" when they clock in during the allowed time (6:00 PM - 5:30 AM PKT).

---

## 📋 What Was Implemented

### 1. **Database Changes**
- **File**: `Backend/models/Attendance.js`
- **Changes**:
  - Made `clockIn` and `clockOut` optional (default: `null`)
  - Changed default `status` from `'Present'` to `'Absent'`
  - Added `autoMarked` field (Boolean) to track auto-generated records
  - Added `notes` field for tracking record history

### 2. **Scheduled Jobs**
- **File**: `Backend/jobs/attendanceJobs.js` (NEW)
- **Functions**:
  - `markAbsentEmployees()`: Creates "Absent" records for all active employees at 6:00 PM
  - `finalizeAttendance()`: Logs attendance summary at 5:30 AM (end of shift)
  - `scheduleAttendanceJobs()`: Initializes cron jobs

### 3. **Updated Clock-In Logic**
- **File**: `Backend/controllers/attendance.controller.js`
- **Changes**:
  - Clock-in now checks for existing "Absent" record
  - Updates existing record instead of creating new one
  - Changes status from "Absent" → "Present"
  - Sets `autoMarked` to `false` when employee clocks in

### 4. **Admin Trigger Endpoint**
- **Route**: `POST /api/attendance/admin/mark-absences`
- **Purpose**: Manual trigger for testing/emergency use
- **Access**: Admin only

### 5. **Server Initialization**
- **File**: `Backend/server.js`
- **Changes**:
  - Imported and initialized `scheduleAttendanceJobs()`
  - Jobs start automatically when server starts

---

## ⏰ Schedule Timeline

### **Daily Cycle (Pakistan Standard Time)**

```
6:00 PM (18:00 PKT)
├─ Scheduled Job #1 Runs
├─ System creates "Absent" records for ALL active employees
├─ Admin dashboard shows everyone as "Absent"
└─ Attendance window OPENS

6:00 PM - 5:30 AM
├─ Employees can clock in
├─ When employee clocks in:
│  ├─ System finds existing "Absent" record
│  ├─ Updates status to "Present"
│  ├─ Sets clockIn time
│  └─ Sets autoMarked to false
└─ Admin sees real-time status updates

5:30 AM (05:30 PKT)
├─ Scheduled Job #2 Runs
├─ System logs final attendance summary
├─ Attendance window CLOSES
└─ Final status recorded for reporting
```

---

## 🔧 How It Works

### **Step 1: Auto-Mark Absent (6:00 PM)**
```javascript
// System runs at 6:00 PM daily
1. Query all employees with status = "Active"
2. Check who already has attendance record for today
3. Create "Absent" records for employees without records
4. Set autoMarked = true, clockIn = null, status = "Absent"
```

### **Step 2: Employee Clocks In**
```javascript
// When employee clicks "Clock In"
1. Check if attendance window is open (6 PM - 5:30 AM)
2. Find existing attendance record for today
3. If record exists and is marked "Absent":
   - Update clockIn = current time
   - Update status = "Present"
   - Set autoMarked = false
4. If no record exists (shouldn't happen):
   - Create new record with status = "Present"
```

### **Step 3: Finalize (5:30 AM)**
```javascript
// System runs at 5:30 AM daily
1. Query all attendance records for yesterday's shift
2. Count Present, Absent, Late, Half-day
3. Log summary to console
4. Anyone still marked "Absent" stays absent
```

---

## 🧪 Testing the Implementation

### **Method 1: Manual Trigger (Recommended for Testing)**
```bash
# Using curl
curl -X POST https://nextelemployees-1.onrender.com/api/attendance/admin/mark-absences \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Using Postman
POST https://nextelemployees-1.onrender.com/api/attendance/admin/mark-absences
Headers:
  Authorization: Bearer YOUR_ADMIN_TOKEN
```

### **Method 2: Wait for Scheduled Time**
- Wait until 6:00 PM PKT
- Check server logs for: "⏰ Scheduled job triggered: Mark absences at shift start"
- Check admin dashboard - all employees should show as "Absent"

### **Method 3: Test Clock-In Flow**
1. Manually trigger absence marking (Method 1)
2. Have an employee log in between 6:00 PM - 5:30 AM
3. Employee clicks "Clock In"
4. Check admin dashboard - employee status should change to "Present"

---

## 📊 Expected Results

### **Before 6:00 PM**
- Admin dashboard may be empty or show previous day's records
- Employees cannot clock in (time restriction)

### **At 6:00 PM (After Scheduled Job)**
- Admin dashboard shows ALL active employees
- All employees show status: "Absent"
- clockIn and clockOut are empty/null

### **When Employee Clocks In**
- Employee's record updates immediately
- Status changes from "Absent" → "Present"
- clockIn shows current timestamp
- autoMarked changes to false

### **At 5:30 AM (End of Shift)**
- Console logs attendance summary
- Final status locked for reporting
- Anyone who didn't clock in remains "Absent"

---

## 🔍 Monitoring & Debugging

### **Check Server Logs**
```bash
# Look for these messages:
✅ Attendance scheduling initialized:
   - Absence marking: 6:00 PM PKT daily (shift start)
   - Attendance finalization: 5:30 AM PKT daily (shift end)

⏰ Scheduled job triggered: Mark absences at shift start (6:00 PM PKT)
🔄 Running auto-absence marking job...
👥 Found X active employees
✅ Successfully marked Y employees as absent
```

### **Check Database**
```javascript
// In MongoDB/Compass
db.attendances.find({
  date: ISODate("2025-10-01T00:00:00Z"),
  autoMarked: true
})

// Should show all auto-marked absent records
```

### **Common Issues & Solutions**

#### Issue 1: Jobs Not Running
**Solution**: Check server logs for scheduler initialization message

#### Issue 2: Duplicate Records
**Solution**: Check unique index on (employee, date) - already configured

#### Issue 3: Wrong Timezone
**Solution**: Jobs use "Asia/Karachi" timezone in cron schedule

#### Issue 4: Old Records Not Updated
**Solution**: Clock-in logic checks for existing record before creating new one

---

## 🚀 Deployment Steps

### **Step 1: Install Dependencies**
```bash
cd Backend
npm install node-cron
```

### **Step 2: Deploy to Render**
```bash
git add .
git commit -m "Implement auto-absence marking system"
git push origin main
```

### **Step 3: Verify Deployment**
1. Check Render logs for scheduler initialization
2. Test manual trigger endpoint
3. Wait for 6:00 PM PKT or trigger manually
4. Verify admin dashboard shows all employees as absent

### **Step 4: Monitor First Cycle**
1. Watch logs at 6:00 PM for absence marking
2. Test clock-in functionality with test employee
3. Watch logs at 5:30 AM for finalization
4. Review attendance records in database

---

## 📝 Admin Dashboard Features

### **What Admin Sees**
- **Before**: Empty dashboard or incomplete attendance
- **After**: Complete attendance list for all active employees
- **Real-time**: Status updates as employees clock in
- **Filters**: Can filter by Present/Absent/Late/Half-day

### **Admin Actions**
- View all attendance records (including auto-marked)
- Manually update status if needed
- Export attendance reports
- Trigger manual absence marking (emergency use)

---

## 🔐 Security & Permissions

- Manual trigger endpoint requires:
  - Valid authentication token
  - Admin role
- Scheduled jobs run automatically (no authentication needed)
- Auto-marked records have `autoMarked: true` flag for auditing

---

## 📈 Benefits

✅ **Proactive Tracking**: See who's absent immediately at shift start
✅ **No Missing Records**: Every employee gets a record every day
✅ **Real-time Visibility**: Admin sees live attendance status
✅ **Automatic Process**: No manual intervention needed
✅ **Accurate Reports**: Complete data for payroll and HR
✅ **Audit Trail**: autoMarked flag tracks system-generated vs manual records

---

## 🎓 Summary in Simple Words

**What happens:**
1. At **6:00 PM**: System marks everyone "Absent"
2. **During shift**: Employees clock in, status changes to "Present"
3. At **5:30 AM**: System logs final attendance
4. **Result**: Complete attendance data for every employee, every day

**Benefits for Admin:**
- See attendance status immediately at 6:00 PM
- Don't wait for employees to clock in to know who's missing
- Complete daily reports without gaps

**Benefits for System:**
- Automatic operation, no manual work needed
- Consistent data structure
- Easy reporting and analytics

---

## 📞 Support

If issues arise:
1. Check server logs for error messages
2. Verify timezone settings (Asia/Karachi)
3. Test manual trigger endpoint
4. Check database for duplicate records
5. Review attendance controller logs

**Note**: The system is designed to be fault-tolerant. If a scheduled job fails, you can always trigger it manually using the admin endpoint.
