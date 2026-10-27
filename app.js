import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. CONFIGURATION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyAKYHT7H2fiixbgrvadNEj10yz5HlIEI1U",
  authDomain: "tharsos-af07d.firebaseapp.com",
  projectId: "tharsos-af07d",
  storageBucket: "tharsos-af07d.firebasestorage.app",
  messagingSenderId: "229266745261",
  appId: "1:229266745261:web:57b90fc331b098f1bda324"
};

const cloudinaryConfig = {
  cloudName: "fsfaie7d", // ⚠️ PASTE YOUR CLOUDINARY CLOUD NAME HERE
  uploadPreset: "tharsos_preset" // Or whatever you named your unsigned preset
};

// ==========================================
// 2. INITIALIZATION
// ==========================================
let app, auth, db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("Firebase Initialized");
} catch (error) {
  console.error("Initialization error:", error);
}

// DOM Elements
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const productForm = document.getElementById('product-form');
const submitBtn = document.getElementById('submit-btn');
const statusMsg = document.getElementById('status-msg');

// ==========================================
// 3. AUTHENTICATION LOGIC
// ==========================================
loginForm.addEventListener('submit', (e) => {
  e.preventDefault(); 
  const emailInput = document.getElementById('email').value.trim();
  const passwordInput = document.getElementById('password').value.trim();
  
  if (!emailInput || !passwordInput) {
    loginError.innerText = "Please enter both email and password.";
    return;
  }

  loginBtn.innerText = 'Logging in...';
  loginBtn.disabled = true;
  loginError.innerText = '';
  
  signInWithEmailAndPassword(auth, emailInput, passwordInput)
    .then(() => {
      loginForm.reset();
      loginBtn.innerText = 'Login';
      loginBtn.disabled = false;
    })
    .catch((error) => {
      let msg = error.message.replace("Firebase: ", "");
      loginError.innerText = msg;
      loginBtn.innerText = 'Login';
      loginBtn.disabled = false;
    });
});

logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginView.style.display = 'none';
    adminView.style.display = 'block';
  } else {
    loginView.style.display = 'flex';
    adminView.style.display = 'none';
    loginBtn.innerText = 'Login';
    loginBtn.disabled = false;
  }
});

// ==========================================
// 4. PRODUCT SUBMISSION (Cloudinary + Firestore)
// ==========================================
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.innerText = 'Publishing...';
  statusMsg.innerText = '';
  statusMsg.style.color = 'var(--muted)';

  try {
    const imageFile = document.getElementById('prod-image').files[0];
    let imageUrl = '';
    
    // A. Upload Image to Cloudinary (No backend needed!)
    if (imageFile) {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('upload_preset', cloudinaryConfig.uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error("Failed to upload image to Cloudinary. Check your Cloud Name and Unsigned Preset.");
      }

      const data = await response.json();
      imageUrl = data.secure_url; 
    }

    // B. Prepare JSON Data
    const salePriceVal = document.getElementById('prod-sale').value;
    const productData = {
      name: document.getElementById('prod-name').value,
      price: Number(document.getElementById('prod-price').value),
      sale_price: salePriceVal ? Number(salePriceVal) : null,
      description: document.getElementById('prod-desc').value,
      status: document.getElementById('prod-status').value,
      stripe_price_id: document.getElementById('prod-stripe').value,
      printful_sync_variant_id: document.getElementById('prod-printful').value,
      image_url: imageUrl,
      created_at: new Date().toISOString()
    };

    // C. Write to Firestore
    await addDoc(collection(db, "products"), productData);

    // D. Success
    statusMsg.style.color = "green";
    statusMsg.innerText = "Product published successfully!";
    productForm.reset();
    
  } catch (error) {
    console.error(error);
    statusMsg.style.color = "var(--red)";
    statusMsg.innerText = "Error: " + error.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Publish Product';
  }
});
