# UltraTech Word‑Search (50‑Clue, Timed, Live Leaderboard)

Mobile-first word-search for events. Strict **60s per clue** (auto-advance). Results post to **Firestore** for a live leaderboard.

---

## 1) Install & Run

```bash
npm install
npm run dev
```

> Requires Node 18+.

---

## 2) Add Firebase

1. Create a project at Firebase Console → Add Web App.
2. Enable **Firestore Database** (production mode).
3. Copy the web config and paste into `src/App.tsx` → `FIREBASE_CONFIG`.
4. Deploy Firestore **Rules** from this repo (see below).

### Firestore Rules
See `firestore.rules` in this repo. Apply them at **Firestore → Rules** or via CLI:

```bash
# optional: using Firebase CLI if you have it
firebase deploy --only firestore:rules
```

### Required Composite Index
The leaderboard subscribes with multiple `orderBy` fields.
Create a composite index in **Firestore → Indexes → Composite** for collection
`ultratech_wordsearch_results` with fields:

1. `score` **DESC**
2. `time` **ASC**
3. `at` **DESC**

(If you forget, Firestore will show an error with a one-click "Create index" link in your console.)

---

## 3) Build for Production

```bash
npm run build
```

This outputs static files in `dist/`.

---

## 4) Deploy (Netlify or Vercel)

### Netlify
- New site from Git → connect your GitHub repo.
- Build command: `npm run build`
- Publish directory: `dist`

### Vercel
- Import the repo in Vercel.
- Framework preset: **Vite**.
- Build command: `npm run build`
- Output: `dist`

> No server required.

---

## 5) Test the Leaderboard
- Open your deployed site.
- Enter a name → play a few clues → End.
- In Firestore → `ultratech_wordsearch_results`, you should see a new document with `{ name, score, time, at }`.
- Leaderboard will show it live on the homepage.

---

## 6) Event Day Tips
- Share the URL with a QR code (e.g., https://www.qr-code-generator.com/).
- Open the Firestore `ultratech_wordsearch_results` collection to watch entries appear live.
- If you want to reset results, you can temporarily rename the collection in the code or clear docs from the console.

---

## 7) Customize
- Edit the **50 clues** in `src/App.tsx` (array `CLUES`).
- Change colors and branding in the JSX (look for `BrandBar`).

Good luck with your event!