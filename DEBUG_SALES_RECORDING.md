# Debug Guide: Sales Recording Not Showing in Pending Review

## Step 1: Check if records exist in database

**In your browser, visit (no login needed):**
```
http://localhost:5000/api/sales-submissions/debug/all-records
```

**Expected response:**
```json
{
  "success": true,
  "totalRecords": 5,
  "byStatus": {
    "pending": 5
  },
  "records": [
    {
      "_id": "xxx",
      "agent": {...},
      "agentName": "Wasif Shah",
      "status": "pending",
      "saleDate": "2026-04-01T00:00:00.000Z",
      "createdAt": "2026-04-01T12:30:45.000Z"
    }
  ]
}
```

### If you see the records:
✅ Data was created correctly. Problem is likely:
- Authentication issue (not logged in as admin)
- Component not fetching correctly
- Display/filtering bug in frontend

→ **Go to Step 2**

### If you DON'T see the records:
❌ The sales record was not created or was deleted. Problem is in:
- recordDailySales controller not creating records
- Event handler not calling the right endpoint

→ **Check Backend Logs** (npm run dev output)

---

## Step 2: Check admin authentication

**Open your browser Console (F12) and check the Network tab:**

1. Go to Dashboard → Sales → Pending Review
2. Look at the XHR/Fetch request to `/api/sales-submissions`
3. Check that response:
   - **Status should be: 200**
   - **Response should contain data array**
   - If you see 401 or 403: Authentication failed
   - If you see 404: Wrong endpoint

**Example successful response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "xxx",
      "agentName": "Wasif Shah",
      "status": "pending",
      "saleDate": "2026-04-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1
  }
}
```

### If you get 401/403:
- Log out and Log back in as admin
- Check cookies: `document.cookie` in console

### If you get 200 but no data:
- Check if the status filter is correct
- Try visiting: `http://localhost:5000/api/sales-submissions?status=pending`
  (This requires being logged in via the same cookie)

---

## Step 3: Check local backend logs

When you run `npm run dev`, you should see logs like:

```
=== recordDailySales ===
Body received: { employeeId: 'xxx', salesCount: 1, date: '2026-04-01' }
✅ Created sales record:{ _id: xxx, status: 'pending', ... }

=== GET /api/sales-submissions ===
User: { _id: xxx, role: 'admin', ... }
Query: { status: 'pending', limit: '100' }
Found submissions: 1 Total: 1
```

**If you don't see these logs:**
- The frontend might be calling the wrong endpoint
- The request might not be reaching the backend

---

## Troubleshooting Checklist

- [ ] Backend running: `npm run dev`
- [ ] Frontend running: `npm start` (with REACT_APP_API_URL=http://localhost:5000/api)
- [ ] Logged in as admin user
- [ ] Debug endpoint shows records exist
- [ ] Network tab shows 200 response
- [ ] Console logs appear in backend terminal

