import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ==========================================
// ⚠️ REPLACE WITH YOUR FIREBASE CONFIG
// ==========================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ==========================================
// DOM ELEMENTS
// ==========================================
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const productForm = document.getElementById('product-form');
const submitBtn = document.getElementById('submit-btn');
const statusMsg = document.getElementById('status-msg');

// ==========================================
// AUTHENTICATION
// ==========================================
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  submitBtn.innerText = 'Logging in...';
  
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      loginError.innerText = '';
      loginForm.reset();
    })
    .catch((error) => {
      loginError.innerText = error.message;
      submitBtn.innerText = 'Login';
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
    submitBtn.innerText = 'Login';
  }
});

// ==========================================
// PRODUCT SUBMISSION
// ==========================================
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.innerText = 'Uploading...';
  statusMsg.innerText = '';

  try {
    // 1. Upload Image to Firebase Storage
    const imageFile = document.getElementById('prod-image').files[0];
    let imageUrl = '';
    
    if (imageFile) {
      const storageRef = ref(storage, 'products/' + Date.now() + '_' + imageFile.name);
      await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }

    // 2. Prepare JSON Data
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

    // 3. Write to Firestore
    await addDoc(collection(db, "products"), productData);

    // 4. Success
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
