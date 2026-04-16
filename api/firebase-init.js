import admin from 'firebase-admin';

export function initializeFirebase() {
  const firebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!firebaseServiceAccount) {
    console.warn('FIREBASE_SERVICE_ACCOUNT missing. Secure features will be disabled.');
    return;
  }

  try {
    const decoded = Buffer.from(firebaseServiceAccount, 'base64').toString('utf8');
    let sa;
    try {
      sa = JSON.parse(decoded);
    } catch (e) {
      // Robust extraction for malformed JSON/Python-style strings
      const extract = (key) => {
        const regex = new RegExp(`["']${key}["']\\s*:\\s*["']([^"']+)["']`, 'i');
        const match = decoded.match(regex);
        return match ? match[1] : null;
      };
      
      const privateKeyRegex = /["']private_key["']\s*:\s*["']((?:[^"']|\\.)+)["']/i;
      const privateKeyMatch = decoded.match(privateKeyRegex);
      
      sa = {
        project_id: extract('project_id'),
        client_email: extract('client_email'),
        private_key: privateKeyMatch ? privateKeyMatch[1] : null
      };
    }
    
    const serviceAccount = {
      projectId: sa.project_id || sa.projectId,
      clientEmail: sa.client_email || sa.clientEmail,
      privateKey: (sa.private_key || sa.privateKey || '').replace(/\\n/g, '\n')
    };
    
    if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET
        });
        console.log('Firebase Admin initialized successfully');
      }
    } else {
      console.warn('Firebase Service Account extraction failed - extraction results:', {
        projectId: !!serviceAccount.projectId,
        clientEmail: !!serviceAccount.clientEmail,
        privateKey: !!serviceAccount.privateKey
      });
    }
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err.message);
  }
}
