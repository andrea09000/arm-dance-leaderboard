import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgHsgl1Y0NgKubA77u6fsHtUORA8CzGE0",
  authDomain: "camporosso-3140d.firebaseapp.com",
  projectId: "camporosso-3140d",
  storageBucket: "camporosso-3140d.firebasestorage.app",
  messagingSenderId: "366784778430",
  appId: "1:366784778430:web:0e3d553ed0355462678eef",
  measurementId: "G-8T3Q7WSYE3",
};

export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db: Firestore = getFirestore(firebaseApp);

export const SCORES_COLLECTION = "scores";
