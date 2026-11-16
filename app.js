import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAKYHT7H2fiixbgrvadNEj10yz5HlIEI1U",
  authDomain: "tharsos-af07d.firebaseapp.com",
  projectId: "tharsos-af07d",
  storageBucket: "tharsos-af07d.firebasestorage.app",
  messagingSenderId: "229266745261",
  appId: "1:229266745261:web:57b90fc331b098f1bda324"
};
const cloudinaryConfig = { cloudName: "YOUR_CLOUD_NAME", uploadPreset: "tharsos_preset" }; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- AUTH & TABS ---
const loginView = document.getElementById('login-view'), adminView = document.getElementById('admin-view');
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  signInWithEmailAndPassword(auth, document.getElementById('email').value.trim(), document.getElementById('password').value.trim())
    .then(() => document.getElementById('login-form').reset())
    .catch((err) => document.getElementById('login-error').innerText = err.message);
});
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
onAuthStateChanged(auth, (user) => {
  if (user) { loginView.style.display = 'none'; adminView.style.display = 'block'; initDashboard(); }
  else { loginView.style.display = 'flex'; adminView.style.display = 'none'; }
});
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

document.getElementById('toggle-hero').addEventListener('change', (e) => {
  document.getElementById('hero-settings-wrapper').style.display = e.target.checked ? 'block' : 'none';
});
document.getElementById('hero-type').addEventListener('change', (e) => {
  document.getElementById('hero-collection-settings').style.display = e.target.value === 'collection' ? 'block' : 'none';
  document.getElementById('hero-carousel-settings').style.display = e.target.value === 'carousel' ? 'block' : 'none';
});
document.getElementById('banner-show-btn').addEventListener('change', (e) => {
  document.getElementById('banner-btn-settings').style.display = e.target.checked ? 'block' : 'none';
});

async function uploadImage(file) {
  if (!file) return '';
  const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', cloudinaryConfig.uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, { method: 'POST', body: formData });
  return (await res.json()).secure_url;
}

// --- DATA STORES ---
let allCollections = [];
let allProducts = [];

// --- PRODUCTS ---
// (Product logic remains exactly the same as previous version)
const productForm = document.getElementById('product-form');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
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
      submitBtn.innerText = 'Uploading...';
      for (const file of files) imageUrls.push(await uploadImage(file));
    }
    if (imageUrls.length === 0) throw new Error("Image required.");

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
      isBestseller: document.getElementById('prod-bestseller').checked,
      description: document.getElementById('prod-desc').value,
      details: document.getElementById('prod-details').value,
      status: document.getElementById('prod-status').value,
      sizes: sizes,
      images: imageUrls
    };

    if (editId) await updateDoc(doc(db, "products", editId), data);
    else await addDoc(collection(db, "products"), { ...data, created_at: new Date().toISOString() });
    
    cancelEditBtn.click();
    alert("Product saved!");
  } catch (err) { alert(err.message); } finally { submitBtn.disabled = false; submitBtn.innerText = 'Publish Product'; }
});

function loadProducts() {
  onSnapshot(collection(db, "products"), (snapshot) => {
    allProducts = [];
    const list = document.getElementById('admin-product-list'); list.innerHTML = '';
    const bannerLink = document.getElementById('banner-link'); 
    
    // Reset banner links, keep generic options
    bannerLink.innerHTML = '<option value="index.html">Shop All (Homepage)</option>';

    snapshot.forEach(docSnap => {
      const p = docSnap.data();
      allProducts.push({ id: docSnap.id, ...p });
      
      // Add to banner link dropdown
      bannerLink.innerHTML += `<option value="product.html?id=${docSnap.id}">Product: ${p.name}</option>`;

      const div = document.createElement('div'); div.className = 'admin-item';
      div.innerHTML = `
        <div class="admin-item-info">
          <img src="${p.images[0]}" class="admin-item-img">
          <div><div class="admin-item-title">${p.name} ${p.isBestseller ? '⭐' : ''}</div><div class="admin-item-price">$${p.price}</div></div>
        </div>
        <div class="admin-item-actions">
          <button class="btn btn-ghost edit-btn">Edit</button>
          <button class="btn btn-danger delete-btn">Delete</button>
        </div>`;
      div.querySelector('.delete-btn').onclick = async () => { if (confirm("Delete?")) await deleteDoc(doc(db, "products", docSnap.id)); };
      div.querySelector('.edit-btn').onclick = () => {
        document.getElementById('edit-product-id').value = docSnap.id;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-sale').value = p.sale_price || '';
        document.getElementById('prod-collection').value = p.collection || '';
        document.getElementById('prod-bestseller').checked = p.isBestseller || false;
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
      list.appendChild(div);
    });
  });
}

// --- COLLECTIONS ---
document.getElementById('collection-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('col-submit-btn'); btn.disabled = true; btn.innerText = 'Creating...';
  try {
    const deskFile = document.getElementById('col-banner').files[0];
    const mobFile = document.getElementById('col-banner-mobile').files[0];
    const bannerUrl = await uploadImage(deskFile);
    const mobileBannerUrl = mobFile ? await uploadImage(mobFile) : bannerUrl;

    await addDoc(collection(db, "collections"), {
      name: document.getElementById('col-name').value,
      description: document.getElementById('col-desc').value,
      banner_image: bannerUrl,
      banner_image_mobile: mobileBannerUrl
    });
    document.getElementById('collection-form').reset();
    alert("Collection created!");
  } catch (err) { alert(err.message); } finally { btn.disabled = false; btn.innerText = 'Create Collection'; }
});

function loadCollections() {
  onSnapshot(collection(db, "collections"), (snapshot) => {
    allCollections = [];
    const list = document.getElementById('admin-collection-list'); list.innerHTML = '';
    const select = document.getElementById('prod-collection'); select.innerHTML = '<option value="">None (Standalone)</option>';
    const heroSelect = document.getElementById('hero-collection-select'); heroSelect.innerHTML = '';
    const bannerLink = document.getElementById('banner-link'); 
    
    snapshot.forEach(docSnap => {
      const c = docSnap.data();
      allCollections.push({ id: docSnap.id, ...c });
      
      select.innerHTML += `<option value="${c.name}">${c.name}</option>`;
      heroSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
      bannerLink.innerHTML += `<option value="collection.html?name=${encodeURIComponent(c.name)}">Collection: ${c.name}</option>`;
      
      const div = document.createElement('div'); div.className = 'admin-item';
      div.innerHTML = `<div class="admin-item-info"><img src="${c.banner_image}" class="admin-item-img" style="width:80px;"><div class="admin-item-title">${c.name}</div></div><div class="admin-item-actions"><button class="btn btn-danger delete-btn">Delete</button></div>`;
      div.querySelector('.delete-btn').onclick = async () => { if (confirm("Delete?")) await deleteDoc(doc(db, "collections", docSnap.id)); };
      list.appendChild(div);
    });
  });
}

// --- BANNERS ---
document.getElementById('banner-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('banner-submit-btn'); btn.disabled = true; btn.innerText = 'Uploading...';
  try {
    const deskFile = document.getElementById('banner-desk').files[0];
    const mobFile = document.getElementById('banner-mob').files[0];
    const deskUrl = await uploadImage(deskFile);
    const mobUrl = mobFile ? await uploadImage(mobFile) : deskUrl;

    const showBtn = document.getElementById('banner-show-btn').checked;

    await addDoc(collection(db, "banners"), {
      internalName: document.getElementById('banner-name').value,
      showBtn: showBtn,
      btnText: showBtn ? document.getElementById('banner-btn-text').value : '',
      link: showBtn ? document.getElementById('banner-link').value : '',
      desktopImage: deskUrl,
      mobileImage: mobUrl
    });
    document.getElementById('banner-form').reset();
    document.getElementById('banner-btn-settings').style.display = 'none';
    alert("Banner created!");
  } catch (err) { alert(err.message); } finally { btn.disabled = false; btn.innerText = 'Create Banner'; }
});

function loadBanners() {
  onSnapshot(collection(db, "banners"), (snapshot) => {
    const list = document.getElementById('admin-banner-list'); list.innerHTML = '';
    const carouselList = document.getElementById('carousel-banner-list'); carouselList.innerHTML = '';
    
    snapshot.forEach(docSnap => {
      const b = docSnap.data();

      // Admin list item
      const div = document.createElement('div'); div.className = 'admin-item';
      div.innerHTML = `<div class="admin-item-info"><img src="${b.desktopImage}" style="width:100px; height:56px; object-fit:cover;"><div class="admin-item-title">${b.internalName}</div></div><div class="admin-item-actions"><button class="btn btn-danger delete-btn">Delete</button></div>`;
      div.querySelector('.delete-btn').onclick = async () => { if (confirm("Delete?")) await deleteDoc(doc(db, "banners", docSnap.id)); };
      list.appendChild(div);

      // Settings checkbox item
      const chkDiv = document.createElement('div');
      chkDiv.style.display = 'flex';
      chkDiv.style.alignItems = 'center';
      chkDiv.style.gap = '12px';
      chkDiv.innerHTML = `
        <input type="checkbox" class="banner-chk" value="${docSnap.id}" style="width:16px;height:16px;">
        <img src="${b.desktopImage}" style="width:60px; height:34px; object-fit:cover;">
        <span style="flex:1; font-size:0.85rem;">${b.internalName}</span>
        <input type="number" class="banner-order" placeholder="Order" style="width:60px; padding:4px; font-size:0.8rem;">
      `;
      carouselList.appendChild(chkDiv);
    });
  });
}

// --- SETTINGS ---
document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('settings-btn'); btn.disabled = true; btn.innerText = 'Saving...';
  try {
    const carouselBannerIds = [];
    const checkboxes = document.querySelectorAll('.banner-chk');
    const orders = document.querySelectorAll('.banner-order');
    
    checkboxes.forEach((chk, index) => {
      if (chk.checked) carouselBannerIds.push({ id: chk.value, order: Number(orders[index].value) || 99 });
    });
    carouselBannerIds.sort((a, b) => a.order - b.order);

    const configData = {
      enableHero: document.getElementById('toggle-hero').checked,
      showClearance: document.getElementById('toggle-clearance').checked,
      heroType: document.getElementById('hero-type').value,
      heroCollection: document.getElementById('hero-collection-select').value,
      carouselBanners: carouselBannerIds.map(b => b.id)
    };

    await setDoc(doc(db, "config", "site"), configData, { merge: true });
    alert("Settings saved!");
  } catch (err) { alert(err.message); } finally { btn.disabled = false; btn.innerText = 'Save Settings'; }
});

function loadSettings() {
  onSnapshot(doc(db, "config", "site"), (docSnap) => {
    if (docSnap.exists()) {
      const d = docSnap.data();
      document.getElementById('toggle-hero').checked = d.enableHero !== false;
      document.getElementById('hero-settings-wrapper').style.display = d.enableHero !== false ? 'block' : 'none';
      document.getElementById('toggle-clearance').checked = d.showClearance || false;
      document.getElementById('hero-type').value = d.heroType || 'carousel';
      document.getElementById('hero-collection-select').value = d.heroCollection || '';
      document.getElementById('hero-collection-settings').style.display = d.heroType === 'collection' ? 'block' : 'none';
      document.getElementById('hero-carousel-settings').style.display = d.heroType === 'carousel' ? 'block' : 'none';

      setTimeout(() => {
        const savedIds = d.carouselBanners || [];
        const checkboxes = document.querySelectorAll('.banner-chk');
        const orders = document.querySelectorAll('.banner-order');
        
        checkboxes.forEach((chk, index) => {
          const savedIndex = savedIds.indexOf(chk.value);
          if (savedIndex > -1) {
            chk.checked = true;
            orders[index].value = savedIndex + 1;
          }
        });
      }, 500); 
    }
  });
}

function initDashboard() { loadProducts(); loadCollections(); loadBanners(); loadSettings(); }
