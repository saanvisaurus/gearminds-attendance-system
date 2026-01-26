import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAuVs-SErZSgMCTeSpOED99JzVaeONnRnA",
  authDomain: "gearminds-attendance.firebaseapp.com",
  projectId: "gearminds-attendance",
  storageBucket: "gearminds-attendance.firebasestorage.app",
  messagingSenderId: "907387826178",
  appId: "1:907387826178:web:ef8ef72a12f112a835771b",
  measurementId: "G-MFHDGSFHSM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
