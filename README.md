# 📅 GroupSync - Serverless Friend Group Planner

GroupSync is a lightweight, responsive Doodle-clone optimized for groups of ~10 friends coordinating weekend trips (cabins, beach trips, camping, etc.). It runs completely free as static files on **GitHub Pages** and uses a single **Google Sheet** as its backend database via **Google Apps Script**.

---

## ⚡ Key Features

* **Serverless Architecture:** No server hosting fees, databases, or complex configurations. Runs 100% in the browser.
* **Modern Dark Glassmorphism Theme:** Beautiful, responsive design optimized for mobile and desktop screens.
* **12-Weekend Select Card Grid:** Easy poll creation using quick-select weekend blocks.
* **Invitees Dropdown with Status Tracking:** Friends can select their names from a pre-defined dropdown, see who has already voted, and easily edit/update their responses.
* **Live Heat Map Dashboard:** Visual analytics that automatically highlight the group's best weekend choice.
* **Doodle-Style Grid Board:** Full matrix view of everyone's availability, including comment tooltips explaining why a friend can't make a date.

---

## 🛠️ Step-by-Step Setup Guide

Follow these steps to connect your frontend to a Google Sheet database.

### Step 1: Set Up the Google Sheet
1. Create a new, empty spreadsheet at [Google Sheets](https://sheets.new).
2. Give it a title (e.g., `GroupSync Database`). *Note: You do not need to create any columns or tabs manually; the script will initialize them automatically.*

### Step 2: Paste the Apps Script Backend
1. In your spreadsheet, open **Extensions** -> **Apps Script**.
2. Delete any default code in the editor (`Code.gs`).
3. Open the file `apps-script-backend.js` from this codebase, copy its entire contents, and paste it into the Apps Script editor.
4. Click the **Save** (floppy disk) icon or press `Ctrl + S`.

### Step 3: Deploy as a Web App
1. Click the blue **Deploy** button in the top right and select **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill out the deployment configuration:
   * **Description:** `GroupSync API`
   * **Execute as:** `Me (your-email@gmail.com)`
   * **Who has access:** `Anyone` *(This is required so your friends can submit votes without needing a Google login)*
4. Click **Deploy**.
5. Google will ask you to **Authorize Access**. Click **Authorize access**, select your Google account, click **Advanced** (bottom left), click **Go to GroupSync Database (unsafe)**, and select **Allow**.
6. Copy the **Web App URL** shown under "URL" (it ends in `/exec`).

### Step 4: Link Frontend to the Database
1. Open the file `app.js` in your text editor.
2. Locate the line:
   ```javascript
   export const API_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL";
   ```
3. Replace `"YOUR_GOOGLE_APPS_SCRIPT_URL"` with the Web App URL you copied in Step 3. E.g.:
   ```javascript
   export const API_URL = "https://script.google.com/macros/s/AKfycbxExampleUrlKey.../exec";
   ```
4. Save the file.

---

## 💻 Local Testing & Mock Mode

To make development and testing easy, GroupSync includes a built-in **Mock Mode**:
* If `API_URL` is left as `"YOUR_GOOGLE_APPS_SCRIPT_URL"` (or is empty), the app will automatically fall back to using browser `localStorage` as a mock database.
* This allows you to immediately open `create.html` or `index.html` in your browser, create polls, vote, and test the heatmap/grid offline without setting up a Google Sheet first!

---

## 🚀 Deploying to GitHub Pages

Once your `app.js` is updated with your Google Apps Script Web App URL, you can publish the web app to GitHub Pages completely free:

1. Create a new public repository on GitHub.
2. Push your files (`index.html`, `create.html`, `app.js`, `style.css`, and `README.md`) to your repository.
3. On GitHub, go to your repository's **Settings** -> **Pages** (in the left sidebar).
4. Under "Build and deployment":
   * **Source:** Select `Deploy from a branch`
   * **Branch:** Select `main` (or `master`) and folder `/ (root)`
5. Click **Save**.
6. In a few seconds, GitHub will display your live site URL (e.g., `https://yourusername.github.io/your-repo-name/`).

Share the URL with your friends and start planning!
