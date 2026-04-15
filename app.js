// ============================================================
//  APP.JS — MediSense AI Core App Logic
// ============================================================

const API_BASE = 'http://localhost:5000/api';

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link[data-page]').forEach(a => a.classList.remove('active'));

  const page = document.getElementById('page-' + id);
  if (!page) return;
  page.classList.add('active');

  const link = document.querySelector('[data-page="' + id + '"]');
  if (link) link.classList.add('active');

  App.currentPage = id;

  if (id === 'chat') {
    if (typeof loadChatHistory === 'function') loadChatHistory();
  }
  if (id === 'symptoms') {
    if (typeof renderSymptomCategories === 'function') renderSymptomCategories();
  }

  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function quickSearch(symptomsText) {
  showPage('chat');
  setTimeout(() => processMsg('I have ' + symptomsText), 350);
}

function toggleMobileMenu() { document.getElementById('navLinks').classList.toggle('open'); }
function closeMobileMenu() { document.getElementById('navLinks').classList.remove('open'); }
function toggleDropdown() { document.getElementById('profileDropdown').classList.toggle('open'); }
function closeDropdown() { document.getElementById('profileDropdown').classList.remove('open'); }

document.addEventListener('click', function (e) {
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn && !profileBtn.contains(e.target)) closeDropdown();
});

// ===== PROFILE MODAL =====
function openProfileModal() {
  if (!App.user) return;
  const u = App.user;
  const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('profileBigAvatar').textContent = initials;
  document.getElementById('profileInfoName').textContent = u.name;
  document.getElementById('profileInfoEmail').textContent = u.email;
  document.getElementById('profileInfoAge').textContent = u.age || 'Not set';
  document.getElementById('profileInfoGender').textContent = u.gender ? capitalize(u.gender) : 'Not set';
  document.getElementById('profileInfoSince').textContent = 'Member since: Active Session';
  document.getElementById('profileInfoChats').textContent = 'Cloud saved';
  document.getElementById('profileModal').classList.add('open');
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.remove('open');
  const edit = document.getElementById('profileEditForm');
  if (edit && edit.style.display !== 'none') toggleProfileEdit();
}

function toggleProfileEdit() {
  const view = document.getElementById('profileDetailsView');
  const edit = document.getElementById('profileEditForm');
  const acts = document.getElementById('profileActionsRow');
  if (!view || !edit) return;
  if (edit.style.display === 'none') {
    view.style.display = 'none';
    acts.style.display = 'none';
    edit.style.display = 'block';
    const u = App.user;
    document.getElementById('editProfileName').value = u.name || '';
    document.getElementById('editProfileAge').value = u.age || '';
    document.getElementById('editProfileGender').value = u.gender || '';
  } else {
    edit.style.display = 'none';
    view.style.display = 'block';
    acts.style.display = 'flex';
  }
}

async function saveProfile() {
  const name = document.getElementById('editProfileName').value.trim();
  const age = document.getElementById('editProfileAge').value;
  const gender = document.getElementById('editProfileGender').value;
  if (!name) { alert('Name cannot be empty.'); return; }
  if (!auth.currentUser) { alert('Not logged in.'); return; }
  const uid = auth.currentUser.uid;

  try {
    const updatedData = { name, age, gender, updatedAt: new Date() };
    await db.collection("users").doc(uid).update(updatedData);

    // Update local state
    App.user.name = name;
    App.user.age = age;
    App.user.gender = gender;
    saveSession(App.user);

    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const navAv = document.getElementById('navAvatar');
    if (navAv) navAv.textContent = initials;
    const navNm = document.getElementById('navName');
    if (navNm) navNm.textContent = name.split(' ')[0];
    const ddNm = document.getElementById('ddName');
    if (ddNm) ddNm.textContent = name;

    toggleProfileEdit();
    openProfileModal();
    alert('Profile updated!');
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== HISTORY MODAL — loads real data from DB =====
async function openHistoryModal() {
  document.getElementById('historyModal').classList.add('open');
  const body = document.getElementById('historyModalBody');
  body.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:1rem;">Loading...</p></div>';

  try {
    if (!auth.currentUser) throw new Error('Not logged in');
    const uid = auth.currentUser.uid;

    const snapshot = await db.collection("chat_history")
      .where("userId", "==", uid)

      .limit(200)
      .get();

    if (snapshot.empty) {
      body.innerHTML = '<div class="history-empty"><i class="fas fa-comments"></i><p>No chat history yet.</p><button onclick="closeHistoryModal();showPage(\'chat\');" style="margin-top:1rem;padding:0.6rem 1.5rem;background:var(--primary);color:white;border:none;border-radius:50px;cursor:pointer;font-weight:600;">Start Chat</button></div>';
      return;
    }

    let html = '<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;">All Messages</p>';

    snapshot.forEach(doc => {
      const data = doc.data();

      const date = data.createdAt
        ? new Date(data.createdAt.seconds * 1000).toLocaleString()
        : 'N/A';

      const preview = data.message.length > 80
        ? data.message.slice(0, 80) + '...'
        : data.message;

      html += `
    <div style="cursor:pointer; margin-bottom:12px; border:1px solid var(--border); padding:1rem; border-radius:15px; background:var(--card-bg);">
      <div style="font-weight:600; font-size:0.85rem; color:var(--primary); margin-bottom:5px;">
        <i class="fas fa-clock"></i> ${date}
      </div>
      <div style="font-size:0.9rem; color:var(--text-main);">
        <i class="fas fa-comment-alt" style="margin-right:8px; opacity:0.5;"></i>
        ${data.role === 'user' ? '👤' : '🤖'} ${preview}
      </div>
    </div>
  `;
    });

    body.innerHTML = html;
  } catch (err) {   // 🔥 ये add करो
    console.error(err);
    body.innerHTML = '<p>Error loading history</p>';
  }
}
function closeHistoryModal() {
  document.getElementById('historyModal').classList.remove('open');
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeProfileModal();
    closeHistoryModal();
    closeDropdown();
  }
});

// ============================================================
//  CONTACT & FEEDBACK SYSTEM
// ============================================================
let selectedRating = 0;

// Star Rating Interaction for the new Contact Page
function initStarRating() {
  const stars = document.querySelectorAll('.star-rating i');
  stars.forEach(star => {
    star.addEventListener('mouseover', function () {
      const val = this.getAttribute('data-value');
      stars.forEach(s => s.classList.toggle('hover', s.getAttribute('data-value') <= val));
    });
    star.addEventListener('mouseout', () => stars.forEach(s => s.classList.remove('hover')));
    star.addEventListener('click', function () {
      selectedRating = this.getAttribute('data-value');
      stars.forEach(s => s.classList.toggle('active', s.getAttribute('data-value') <= selectedRating));
    });
  });
}

document.addEventListener('DOMContentLoaded', initStarRating);
// Also call it immediately in case DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initStarRating();
}

async function submitContactForm() {
  const name = document.getElementById('contact-name').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const type = document.getElementById('contact-type').value;
  const comment = document.getElementById('contact-message').value.trim();

  if (!name || !email || !comment) {
    alert('Please fill in all required fields.');
    return;
  }

  if (selectedRating === 0) {
    alert('Please provide a rating.');
    return;
  }

  try {
    await db.collection('contact_requests').add({
      name: name,
      email: email,
      type: type,
      rating: parseInt(selectedRating),
      message: comment,
      createdAt: new Date(),
      userId: auth.currentUser ? auth.currentUser.uid : 'anonymous'
    });

    alert('Message sent successfully! We will get back to you soon.');
    // Reset form
    document.getElementById('contact-message').value = '';
    selectedRating = 0;
    document.querySelectorAll('.star-rating i').forEach(s => s.classList.remove('active', 'hover'));
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  }
}

/** Specific loadSession function for grouping */
async function loadSession(sid) {
  closeHistoryModal();
  showPage('chat');
  App.sessionId = sid;

  const area = document.getElementById('chatMessages');
  if (area) {
    area.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i> Loading session...</div>';

    const snap = await db.collection("chat_history")
      .where("sessionId", "==", sid)
      .orderBy("createdAt", "asc")
      .get();

    area.innerHTML = '';
    App.convMsgs = [];
    snap.forEach(doc => {
      const m = doc.data();
      if (m.role === 'user') addUserMsg(m.message);
      else addBotMsg(formatBotText(m.message));
    });
  }
}
