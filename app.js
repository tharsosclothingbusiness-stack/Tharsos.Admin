import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAKYHT7H2fiixbgrvadNEj10yz5HlIEI1U",
  authDomain: "tharsos-af07d.firebaseapp.com",
  projectId: "tharsos-af07d",
  storageBucket: "tharsos-af07d.firebasestorage.app",
  messagingSenderId: "229266745261",
  appId: "1:229266745261:web:57b90fc331b098f1bda324"
};
const cloudinaryConfig = { cloudName: "fsfaie7d", uploadPreset: "tharsos_preset" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- AUTH ---
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault(); 
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  loginBtn.innerText = 'Logging in...'; loginBtn.disabled = true;
  signInWithEmailAndPassword(auth, email, password)
    .then(() => { loginForm.reset(); loginBtn.innerText = 'Login'; loginBtn.disabled = false; })
    .catch((err) => { loginError.innerText = err.message; loginBtn.innerText = 'Login'; loginBtn.disabled = false; });
});
logoutBtn.addEventListener('click', () => signOut(auth));
onAuthStateChanged(auth, (user) => {
  if (user) { loginView.style.display = 'none'; adminView.style.display = 'block'; initDashboard(); }
  else { loginView.style.display = 'flex'; adminView.style.display = 'none'; }
});

// --- TABS ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- HELPERS ---
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, { method: 'POST', body: formData });
  const data = await res.json();
  return data.secure_url;
}

// --- PRODUCTS LOGIC ---
const productForm = document.getElementById('product-form');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const prodList = document.getElementById('admin-product-list');
let existingImageUrls = [];

cancelEditBtn.addEventListener('click', () => {
  productForm.reset();
  document.getElementById('edit-product-id').value = '';
  document.getElementById('product-form-title').innerText = 'Add New Product';
  submitBtn.innerText = 'Publish Product';
  cancelEditBtn.style.display = 'none';
  existingImageUrls = [];
  document.getElementById('existing-images').innerHTML = '';
});

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true; submitBtn.innerText = 'Saving...';
  const editId = document.getElementById('edit-product-id').value;
  
  try {
    const files = document.getElementById('prod-image').files;
    let imageUrls = [...existingImageUrls];
    if (files.length > 0) {
      submitBtn.innerText = 'Uploading Images...';
      for (const file of files) {
        const url = await uploadImage(file);
        imageUrls.push(url);
      }
    }

    if (imageUrls.length === 0) throw new Error("At least one image is required.");

    const sizes = {};
    if (document.getElementById('var-s').value) sizes['S'] = document.getElementById('var-s').value;
    if (document.getElementById('var-m').value) sizes['M'] = document.getElementById('var-m').value;
    if (document.getElementById('var-l').value) sizes['L'] = document.getElementById('var-l').value;
    if (document.getElementById('var-xl').value) sizes['XL'] = document.getElementById('var-xl').value;

    const saleVal = document.getElementById('prod-sale').value;
    const data = {
      name: document.getElementById('prod-name').value,
      price: Number(document.getElementById('prod-price').value),
      sale_price: saleVal ? Number(saleVal) : null,
      collection: document.getElementById('prod-collection').value,
      description: document.getElementById('prod-desc').value,
      details: document.getElementById('prod-details').value,
      status: document.getElementById('prod-status').value,
      sizes: sizes,
      images: imageUrls
    };

    if (editId) {
      await updateDoc(doc(db, "products", editId), data);
      alert("Product updated!");
    } else {
      data.created_at = new Date().toISOString();
      await addDoc(collection(db, "products"), data);
      alert("Product published!");
    }
    cancelEditBtn.click();
  } catch (err) { alert(err.message); } 
  finally { submitBtn.disabled = false; submitBtn.innerText = 'Publish Product'; }
});

function loadProducts() {
  onSnapshot(collection(db, "products"), (snapshot) => {
    prodList.innerHTML = '';
    snapshot.forEach(docSnap => {
      const p = docSnap.data();
      const div = document.createElement('div');
      div.className = 'admin-item';
      div.innerHTML = `
        <div class="admin-item-info">
          <img src="${p.images[0]}" class="admin-item-img">
          <div>
            <div class="admin-item-title">${p.name}</div>
            <div class="admin-item-price">$${p.price} | ${p.collection || 'No Collection'}</div>
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="btn btn-ghost edit-btn">Edit</button>
          <button class="btn btn-danger delete-btn">Delete</button>
        </div>
      `;
      div.querySelector('.delete-btn').onclick = async () => {
        if (confirm("Delete this product?")) await deleteDoc(doc(db, "products", docSnap.id));
      };
      div.querySelector('.edit-btn').onclick = () => {
        document.getElementById('edit-product-id').value = docSnap.id;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-sale').value = p.sale_price || '';
        document.getElementById('prod-collection').value = p.collection || '';
        document.getElementById('prod-desc').value = p.description;
        document.getElementById('prod-details').value = p.details || '';
        document.getElementById('prod-status').value = p.status;
        document.getElementById('var-s').value = p.sizes?.S || '';
        document.getElementById('var-m').value = p.sizes?.M || '';
        document.getElementById('var-l').value = p.sizes?.L || '';
        document.getElementById('var-xl').value = p.sizes?.XL || '';
        
        existingImageUrls = p.images || [];
        document.getElementById('existing-images').innerHTML = existingImageUrls.map(url => `<img src="${url}" style="width: 50px; height: 50px; object-fit: cover;">`).join('');
        
        document.getElementById('product-form-title').innerText = 'Edit Product';
        submitBtn.innerText = 'Update Product';
        cancelEditBtn.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      prodList.appendChild(div);
    });
  });
}

// --- COLLECTIONS LOGIC ---
const collectionForm = document.getElementById('collection-form');
const colList = document.getElementById('admin-collection-list');
const prodCollectionSelect = document.getElementById('prod-collection');

collectionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('col-submit-btn');
  btn.disabled = true; btn.innerText = 'Creating...';
  try {
    const file = document.getElementById('col-banner').files[0];
    let bannerUrl = '';
    if (file) bannerUrl = await uploadImage(file);

    await addDoc(collection(db, "collections"), {
      name: document.getElementById('col-name').value,
      description: document.getElementById('col-desc').value,
      banner_image: bannerUrl
    });
    collectionForm.reset();
    alert("Collection created!");
  } catch (err) { alert(err.message); }
  finally { btn.disabled = false; btn.innerText = 'Create Collection'; }
});

function loadCollections() {
  onSnapshot(collection(db, "collections"), (snapshot) => {
    colList.innerHTML = '';
    prodCollectionSelect.innerHTML = '<option value="">None (Standalone)</option>';
    
    snapshot.forEach(docSnap => {
      const c = docSnap.data();
      
      // Update product form dropdown
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.innerText = c.name;
      prodCollectionSelect.appendChild(opt);

      // Update list UI
      const div = document.createElement('div');
      div.className = 'admin-item';
      div.innerHTML = `
        <div class="admin-item-info">
          <img src="${c.banner_image}" class="admin-item-img" style="width: 80px;">
          <div><div class="admin-item-title">${c.name}</div></div>
        </div>
        <div class="admin-item-actions">
          <button class="btn btn-danger delete-btn">Delete</button>
        </div>
      `;
      div.querySelector('.delete-btn').onclick = async () => {
        if (confirm("Delete collection? Products in it will become standalone.")) await deleteDoc(doc(db, "collections", docSnap.id));
      };
      colList.appendChild(div);
    });
  });
}

// --- SETTINGS LOGIC ---
const settingsForm = document.getElementById('settings-form');
const toggleClearance = document.getElementById('toggle-clearance');

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('settings-btn');
  btn.disabled = true; btn.innerText = 'Saving...';
  try {
    const files = document.getElementById('carousel-images').files;
    let carouselImages = [];
    for (const file of files) {
      const url = await uploadImage(file);
      carouselImages.push(url);
    }

    const configData = {
      showClearance: toggleClearance.checked,
    };
    if (carouselImages.length > 0) configData.carouselImages = carouselImages;

    await setDoc(doc(db, "config", "site"), configData, { merge: true });
    alert("Settings saved!");
  } catch (err) { alert(err.message); }
  finally { btn.disabled = false; btn.innerText = 'Save Settings'; }
});

function loadSettings() {
  onSnapshot(doc(db, "config", "site"), (docSnap) => {
    if (docSnap.exists()) {
      toggleClearance.checked = docSnap.data().showClearance || false;
    }
  });
}

function initDashboard() {
  loadProducts();
  loadCollections();
  loadSettings();
}
