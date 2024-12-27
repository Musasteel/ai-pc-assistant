import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDAKwEYsL8KFPBf2QlhzUA4oYm1WQvNsrY",
  authDomain: "ai-pc-builder-assistant.firebaseapp.com",
  projectId: "ai-pc-builder-assistant",
  storageBucket: "ai-pc-builder-assistant.firebasestorage.app",
  messagingSenderId: "145257818199",
  appId: "1:145257818199:web:a9f58124f62ed793111b12",
  measurementId: "G-6FCHGELJS3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Remove or keep analytics based on whether you're using it
// const analytics = getAnalytics(app); 