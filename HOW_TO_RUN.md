# 🚀 How to Run OrderPrep

## Quick Start (Windows)

Simply **double-click** one of these files:

### 📱 **start-orderprep.bat** (Main File)
**Use this to run the app normally**

What it does:
1. ✅ Checks if Node.js is installed
2. ✅ Installs dependencies automatically (first time only)
3. ✅ Starts the development server
4. ✅ Opens your browser automatically to http://localhost:3000

**Just double-click and wait!** The app will open in your browser.

---

### 🏗️ **build-production.bat**
**Use this to create a production build**

What it does:
1. ✅ Builds optimized version for deployment
2. ✅ Creates a `dist` folder with production files
3. ✅ Optionally previews the production build
4. ✅ Shows build statistics

Use this when you're ready to deploy the app to a web server.

---

## 💡 First Time Setup

### Prerequisites
You need **Node.js** installed on your computer.

**Don't have Node.js?**
1. Download from: https://nodejs.org/
2. Install the LTS (Long Term Support) version
3. Restart your computer
4. Then run `start-orderprep.bat`

---

## 🎯 Using the App

### Starting the App
1. Double-click **`start-orderprep.bat`**
2. Wait for the browser to open (about 5-10 seconds)
3. The app will load at `http://localhost:3000`

### Stopping the App
- Press **Ctrl + C** in the black terminal window
- Or just close the terminal window

### Restarting the App
- Close the terminal window (Ctrl + C)
- Double-click `start-orderprep.bat` again

---

## 📱 Access on Your Phone

When the app is running, you can access it on your phone:

1. Make sure your phone is on the **same WiFi** as your computer
2. Look for the "Network" URL in the terminal (something like `http://192.168.x.x:3000`)
3. Open that URL on your phone's browser
4. **Bookmark it** for easy access!

Best experience: Use on mobile in portrait mode.

---

## 🐛 Troubleshooting

### "Node.js is not installed" error
**Solution:** Download and install Node.js from https://nodejs.org/

### "Port 3000 is already in use"
**Solution:**
- Another instance is running - close it first
- Or check if another app is using port 3000

### App won't open in browser
**Solution:**
- Manually open your browser
- Go to: `http://localhost:3000`

### Changes not showing up
**Solution:**
- Hard refresh: Press **Ctrl + Shift + R**
- Or clear browser cache

### "npm install failed"
**Solution:**
- Make sure you have internet connection
- Try running as Administrator (right-click → Run as Administrator)
- Close any antivirus that might be blocking

---

## 💾 Your Data

All your orders, customers, and settings are saved in **browser LocalStorage**:
- ✅ Persists after closing browser
- ✅ Works offline
- ⚠️ Specific to each browser/device
- ⚠️ Clearing browser data will delete everything

**Tip:** Use the same browser each time to keep your data.

---

## 🔄 Updating the App

If you get a new version:
1. Replace the files
2. Double-click `start-orderprep.bat`
3. It will update dependencies automatically

---

## 📞 Need Help?

- Check the browser console (Press F12) for errors
- Read the **ENHANCEMENTS_SUMMARY.md** for feature documentation
- Check **README.md** for technical details

---

## 🎉 That's It!

Just double-click **`start-orderprep.bat`** and you're good to go!

The first run takes 30-60 seconds to install dependencies.
After that, it starts in 2-3 seconds.

**Happy cooking!** 🍳
