import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. CONFIGURATION (PASTE YOUR KEYS HERE)
// ==========================================

// Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyAKYHT7H2fiixbgrvadNEj10yz5HlIEI1U",
    authDomain: "tharsos-af07d.firebaseapp.com",
    projectId: "tharsos-af07d",
    storageBucket: "tharsos-af07d.firebasestorage.app",
    messagingSenderId: "229266745261",
    appId: "1:229266745261:web:57b90fc331b098f1bda324"
  };


const imagekitConfig = {
  publicKey: "public_nc8JLio9ktfuErRfQQcRFJN95nE=",
  urlEndpoint: "https://ik.imagekit.io/tharsos",
};


// ==========================================
// 2. INITIALIZATION
// ==========================================
let app, auth, db, imagekit;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  imagekit = new ImageKit(imagekitConfig);
} catch (error) {
  console.error("Initialization error:", error);
  alert("Failed to initialize Firebase/ImageKit. Check your config keys in app.js");
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
  e.preventDefault(); // Stop page reload
  
  // Get values and trim accidental spaces
  const emailInput = document.getElementById('email').value.trim();
  const passwordInput = document.getElementById('password').value.trim();
  
  // Check if fields are empty before hitting Firebase
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
      console.error(error);
      // Clean up error message for the user
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
    loginView.classList.remove('active');
    adminView.classList.add('active');
  } else {
    adminView.classList.remove('active');
    loginView.classList.add('active');
    loginBtn.innerText = 'Login';
    loginBtn.disabled = false;
  }
});

// ==========================================
// 4. PRODUCT SUBMISSION (ImageKit + Firestore)
// ==========================================
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.innerText = 'Publishing...';
  statusMsg.innerText = '';
  statusMsg.style.color = 'var(--muted)';

  try {
    // A. Upload Image to ImageKit
    const imageFile = document.getElementById('prod-image').files[0];
    let imageUrl = '';
    
    if (imageFile) {
      // This requires "Allow Unsigned Uploads" to be enabled in your ImageKit dashboard
      const uploadResponse = await imagekit.upload({
        file: imageFile,
        fileName: Date.now() + "_" + imageFile.name.replace(/[^a-zA-Z0-9.]/g, "")
      });
      imageUrl = uploadResponse.url;
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
      printful_variant_id: document.getElementById('prod-printful').value,
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
