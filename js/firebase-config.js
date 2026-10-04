/* ==========================================================================
   Firebase project settings for the visit counter.

   Leave this as `null` and the counter stays switched off (the site works
   normally, with no numbers shown). To switch it on, paste the config object
   from Firebase console → Project settings → General → Your apps → Web app.
   See FIREBASE_SETUP.md for the full steps.

   These values are not secrets: Firebase web config is public by design.
   What protects the data is the Firestore security rules in firestore.rules.
   ========================================================================== */
export const firebaseConfig = null;

/* Example of what it should look like once filled in:
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
*/
