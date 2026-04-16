import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { initializeFirebase } from '../api/firebase-init.js';

dotenv.config();

const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET;

if (!bucketName) {
  console.error('VITE_FIREBASE_STORAGE_BUCKET missing in .env');
  process.exit(1);
}

async function setCors() {
  try {
    // Use the shared initialization logic
    initializeFirebase();

    if (!admin.apps.length) {
      console.error('Failed to initialize Firebase Admin.');
      process.exit(1);
    }

    const bucket = admin.storage().bucket();
    
    const cors = [
      {
        origin: ['*'],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
        maxAgeSeconds: 3600,
        responseHeader: ['Content-Type', 'Authorization', 'X-Requested-With']
      }
    ];

    console.log(`Setting CORS for bucket: ${bucketName}...`);
    await bucket.setCorsConfiguration(cors);
    console.log('Successfully set CORS configuration!');
    
  } catch (err) {
    console.error('Failed to set CORS:', err.message);
    process.exit(1);
  }
}

setCors();
