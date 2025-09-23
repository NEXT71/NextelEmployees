# Git Commands to Secure Your Repository

## Step 1: Navigate to your project directory
```bash
cd "c:\Users\Nextel BPO\OneDrive\Documents\GitHub\NextelEmployeesWebsite"
```

## Step 2: Remove .env from Git tracking (if it was previously tracked)
```bash
git rm --cached Backend/.env
git rm --cached .env
```

## Step 3: Add the .gitignore files
```bash
git add .gitignore
git add Backend/.gitignore
```

## Step 4: Commit the .gitignore files
```bash
git commit -m "Add .gitignore files to secure environment variables"
```

## Step 5: Push to remove .env from GitHub
```bash
git push origin main
```

## Step 6: Verify .env is now ignored
```bash
git status
```
# You should see that .env is no longer tracked

## Step 7: Add other changes (if any)
```bash
git add .
git commit -m "Update project structure and secure configuration"
git push origin main
```

## ✅ Your .env file is now secure!

After running these commands:
- ✅ .env will be removed from GitHub
- ✅ Future .env changes won't be tracked
- ✅ Your secrets are now secure
- ✅ Other developers can use .env.example as a template

## 🔒 Security Notes:
1. The .env file is now only on your local machine
2. GitHub will no longer track or show your environment variables
3. For deployment, you'll set environment variables directly in your hosting platform
4. Other developers will copy .env.example to .env and add their own values