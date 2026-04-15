// ============================================================
//  CHAT.JS — MediSense AI Chat Module (Firebase Driven)
// ============================================================

if (!window.App) window.App = { convMsgs: [], chips: new Set(), isTyping: false, greetingShown: false, sessionId: null };

/** 
 * GEMINI AI INTEGRATION (OPTIONAL)
 * If you want to use Google Gemini AI instead of local rules:
 * 1. Get an API Key from: https://aistudio.google.com/
 * 2. In index.html, add: 
 *    <script type="importmap">
 *      { "imports": { "@google/generative-ai": "https://esm.run/@google/generative-ai" } }
 *    </script>
 * 3. Use the logic below in processMsg()
 */
const GEMINI_API_KEY = ""; // Paste your key here if you want to use Gemini

/** Generate a new unique session ID */
function generateSessionId() {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/** Reset Chat for a new session */
function startNewChat() {
  if (confirm("Start a new chat session? Previous messages will be saved in history.")) {
    App.sessionId = generateSessionId();
    App.convMsgs = [];
    App.greetingShown = false;
    const area = document.getElementById('chatMessages');
    if (area) area.innerHTML = '';
    initChat();
  }
}

/** Local Rule-Based Symptom Analysis (Moved from Backend) */
function analyzeSymptomsLocal(message) {
  const msg = message.toLowerCase();
  const conditions = [];
  let severity = '🟢 Mild';
  const remedies = [];
  const warnings = [];

  if (msg.includes('fever') || msg.includes('bukhaar') || msg.includes('bukhar') || msg.includes('temperature') || msg.includes('tez')) {
    conditions.push('**Viral Fever** — Most common cause, usually lasts 3-5 days');
    conditions.push('**Common Flu** — Accompanied by body ache and fatigue');
    remedies.push('Drink plenty of warm water and fluids');
    remedies.push('Take rest, avoid going out');
    remedies.push('Use a wet cloth on forehead to reduce temperature');
    remedies.push('Take Paracetamol (500mg) if temperature is above 101°F');
    warnings.push('Temperature above 103°F (39.4°C)');
    severity = '🟡 Moderate';
  }

  if (msg.includes('cold') || msg.includes('cough') || msg.includes('khansi') || msg.includes('zukam') || msg.includes('sneezing')) {
    conditions.push('**Common Cold** — Viral infection of upper respiratory tract');
    conditions.push('**Allergic Rhinitis** — If sneezing is frequent');
    remedies.push('Drink warm water with honey and ginger');
    remedies.push('Steam inhalation 2-3 times a day');
    remedies.push('Gargle with warm salt water');
    warnings.push('Cough with blood');
    warnings.push('Difficulty breathing');
  }

  if (msg.includes('headache') || msg.includes('sar dard') || msg.includes('sir dard') || msg.includes('migraine')) {
    conditions.push('**Tension Headache** — Caused by stress or screen time');
    conditions.push('**Migraine** — If headache is one-sided with nausea');
    remedies.push('Rest in a dark, quiet room');
    remedies.push('Apply cold compress on forehead');
    remedies.push('Stay hydrated');
    warnings.push('Sudden severe headache');
    warnings.push('Vision changes');
  }

  if (msg.includes('stomach') || msg.includes('pet') || msg.includes('vomit') || msg.includes('nausea') || msg.includes('diarrhea') || msg.includes('ulti')) {
    conditions.push('**Gastroenteritis** — Stomach infection');
    conditions.push('**Food Poisoning** — If symptoms started after eating');
    remedies.push('Drink ORS (Oral Rehydration Solution)');
    remedies.push('Eat light food (khichdi, bananas)');
    warnings.push('Severe abdominal pain');
    severity = '🟡 Moderate';
  }

  if (conditions.length === 0) {
    conditions.push('**General Discomfort** — Symptoms need more evaluation');
    remedies.push('Rest and stay hydrated');
    warnings.push('Symptoms worsen or persist for >3 days');
  }

  if (msg.includes('severe') || msg.includes('chest pain') || msg.includes('breathing')) {
    severity = '🔴 Serious';
  }

  const conditionsList = conditions.slice(0, 3).map(c => `- ${c}`).join('\n');
  const remediesList = remedies.slice(0, 5).map((r, i) => `${i + 1}. ${r}`).join('\n');
  const warningsList = warnings.slice(0, 4).map(w => `- ${w}`).join('\n');

  return `## 🩺 Symptom Analysis\n\n**Symptoms:** ${message}\n\n## 🔍 Possible Conditions\n${conditionsList}\n\n## 🚦 Severity Level\n${severity}\n\n## 💊 Precautions & Remedies\n${remediesList}\n\n## 🏥 When to See a Doctor\n${warningsList}\n\n---\n⚠️ *Educational guidance only. Not a medical substitute.*`;
}


// ============================================================
//  LOAD HISTORY
// ============================================================
async function loadChatHistory() {
  // Use a more reliable way to wait for auth
  if (!auth.currentUser) {
    // Wait up to 2 seconds for auth to initialize
    for (let i = 0; i < 20; i++) {
      if (auth.currentUser) break;
      await new Promise(r => setTimeout(r, 100));
    }
  }

  if (!auth.currentUser) {
    console.warn("loadChatHistory: No auth user available.");
    initChat();
    return;
  }

  const uid = auth.currentUser.uid;
  console.log("Loading history for UID:", uid);

  try {
    // REMOVED .orderBy() to avoid mandatory composite index requirement in Firebase
    const snapshot = await db.collection("chat_history")
      .where("userId", "==", uid)
      .get();

    const messageArea = document.getElementById('chatMessages');
    if (!messageArea) return;

    messageArea.innerHTML = '';
    App.convMsgs = [];

    if (snapshot.empty) {
      console.log("No history found in Firestore.");
      initChat();
    } else {
      // Sort in memory to bypass Firestore Index requirements
      const docs = snapshot.docs.sort((a, b) => {
        const timeA = a.data().createdAt?.seconds || 0;
        const timeB = b.data().createdAt?.seconds || 0;
        return timeA - timeB;
      });

      console.log("Found and sorted", docs.length, "messages.");
      const lastMsg = docs[docs.length - 1].data();
      App.sessionId = lastMsg.sessionId || generateSessionId();
      docs.forEach(doc => {
        const msg = doc.data();
        if (msg.role === 'user') addUserMsg(msg.message);
        else addBotMsg(formatBotText(msg.message));
      });
    }
  } catch (err) {
    console.error("History Error:", err);
    initChat();
  }
}

/**
 * Load chat history and scroll to a specific user message
 * Called when user clicks on a message in the history modal
 * @param {number} messageIndex - Index of the user message to scroll to
 */
/**
 * Unified function to load history and properly navigate + scroll
 * This ensures async operations complete in the right order
 */
async function loadAndScrollToMessage(messageIndex) {
  // Step 1: Close modal
  closeHistoryModal();

  // Step 2: Navigate to chat page if not there
  showPage('chat');

  // Step 3: Wait for DOM and transition
  await new Promise(resolve => setTimeout(resolve, 400));

  // Step 4: Load history and scroll to specific message
  // loadHistoryUpToMessage re-fetches from Firebase to ensure we have full context
  await loadHistoryUpToMessage(messageIndex);
}

async function loadHistoryUpToMessage(messageIndex) {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;

  try {
    // REMOVED .orderBy() to bypass the mandatory index requirement
    const snapshot = await db.collection("chat_history")
      .where("userId", "==", uid)
      .get();

    const messageArea = document.getElementById('chatMessages');
    if (!messageArea) return;

    messageArea.innerHTML = '';
    App.convMsgs = [];

    if (snapshot.empty) {
      console.log("No history found in Firestore.");
      initChat();
      return;
    }

    // Step 5: This is where you add the sorting line!
    const docs = snapshot.docs.sort((a, b) => {
      const timeA = a.data().createdAt?.seconds || 0;
      const timeB = b.data().createdAt?.seconds || 0;
      return timeA - timeB;
    });

    console.log("Found and sorted", docs.length, "messages.");

    let userMsgCount = 0;
    let targetDiv = null;

    // Step 6: Use docs instead of snapshot
    docs.forEach((doc) => {
      const msg = doc.data();
      if (msg.role === 'user') {
        const msgDiv = addUserMsg(msg.message);
        if (userMsgCount === messageIndex && msgDiv) {
          targetDiv = msgDiv;
        }
        userMsgCount++;
      } else {
        addBotMsg(formatBotText(msg.message));
      }
    });

    if (targetDiv) {
      setTimeout(() => {
        targetDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // No highlight as requested
      }, 100);
    }
  } catch (err) {
    initChat();
  }
}


// ============================================================
//  MARKDOWN FORMATTER — FIXED
// ============================================================
function formatBotText(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^#{1,3} (.+)/gm, '<div class="bot-heading">$1</div>')
    .replace(/^(\d+)\. (.+)/gm, '<div class="bot-list-num"><span class="bot-num">$1.</span><span>$2</span></div>')
    .replace(/^[•·\-] (.+)/gm, '<div class="bot-list-item"><span class="bot-bullet">›</span><span>$1</span></div>')
    .replace(/---/g, '<hr class="bot-divider">')
    .replace(/\n/g, '<br>');
}

// ============================================================
//  CHAT UI
// ============================================================
function initChat() {
  if (App.greetingShown) return; // Prevent multiple greetings in same session

  const name = App.user?.name?.split(' ')[0] || 'there';
  addBotMsg(`
    👋 <strong>Hello, ${name}! I'm MediSense AI — your personal health assistant.</strong><br><br>
    I understand <strong>English</strong> and <strong>Hinglish</strong>!<br><br>
    <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-top:4px;font-size:0.85rem;line-height:2;border:1px solid var(--border);">
      💬 <em>"I have fever and headache since 2 days"</em><br>
      💬 <em>"Mujhe bukhaar hai, sar dard bhi ho raha hai"</em>
    </div><br>
    Tap symptom chips on the left or type below!<br>
    <small style="color:var(--text-muted);">⚠️ Educational only — always see a real doctor.</small>
  `);
  App.greetingShown = true;
}

function addUserMsg(text) {
  const area = document.getElementById('chatMessages');
  if (!area) return null;
  const div = document.createElement('div');
  div.className = 'msg user-msg';
  div.innerHTML = `
    <div class="msg-avatar-sm usr"><i class="fas fa-user"></i></div>
    <div class="bubble">${text}</div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  return div;
}

function addBotMsg(html) {
  const area = document.getElementById('chatMessages');
  if (!area) return;
  const div = document.createElement('div');
  div.className = 'msg bot-msg';
  div.innerHTML = `
    <div class="msg-avatar-sm bot"><i class="fas fa-heartbeat"></i></div>
    <div class="bubble">${html}</div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  return div; // Return the div for scrolling
}

function showTyping() {
  const area = document.getElementById('chatMessages');
  if (!area) return;
  const div = document.createElement('div');
  div.className = 'msg bot-msg';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="msg-avatar-sm bot"><i class="fas fa-heartbeat"></i></div>
    <div class="typing-bubble">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text || App.isTyping) return;
  input.value = '';
  input.style.height = 'auto';
  processMsg(text);
}

function sendChips() {
  if (!App.chips.size) return;
  const symsText = 'I have ' + [...App.chips].join(', ');
  const input = document.getElementById('chatInput');
  input.value = symsText;
  input.focus();
  autoResize(input);
}

// ============================================================
//  SEND TO BACKEND
// ============================================================
async function processMsg(text) {
  addUserMsg(text);
  App.isTyping = true;
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.disabled = true;
  showTyping();

  if (!auth.currentUser) {
    removeTyping();
    addBotMsg("⚠️ Please log in to chat.");
    App.isTyping = false;
    if (sendBtn) sendBtn.disabled = false;
    return;
  }

  if (!App.sessionId) App.sessionId = generateSessionId();
  const uid = auth.currentUser.uid;

  try {
    // Save user message to Firestore
    await db.collection("chat_history").add({
      userId: uid,
      sessionId: App.sessionId,
      role: 'user',
      message: text,
      createdAt: new Date()
    });

    // Generate response using local logic
    const aiResponse = analyzeSymptomsLocal(text);

    // Save AI response to Firestore
    await db.collection("chat_history").add({
      userId: uid,
      sessionId: App.sessionId,
      role: 'bot',
      message: aiResponse,
      createdAt: new Date()
    });

    removeTyping();
    addBotMsg(formatBotText(aiResponse));

  } catch (err) {
    console.error(err);
    removeTyping();
    addBotMsg("⚠️ Error: " + err.message);
  } finally {
    App.isTyping = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}

// ============================================================
//  CHIP SELECTION — FIXED
// ============================================================
function toggleChip(el, sym) {
  el.classList.toggle('selected');
  if (App.chips.has(sym)) {
    App.chips.delete(sym);
  } else {
    App.chips.add(sym);
  }
  updateChipsButton();
}

function updateChipsButton() {
  const btn = document.getElementById('sendChipsBtn');
  if (!btn) return;
  if (App.chips.size > 0) {
    btn.style.display = 'flex';
    btn.innerHTML = `<i class="fas fa-paper-plane"></i> Send ${App.chips.size} Symptom${App.chips.size > 1 ? 's' : ''}`;
  } else {
    btn.style.display = 'none';
  }
}

function clearChat() {
  const area = document.getElementById('chatMessages');
  if (area) area.innerHTML = '';
  App.convMsgs = [];
  App.chips.clear();
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  updateChipsButton();
  initChat();
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

/**
 * Fill the textarea with text and prepare to send
 * Called when user clicks on quick-pill suggestions
 * @param {string} text - The text to fill in the textarea
 */
function fillInput(text) {
  const input = document.getElementById('chatInput');
  if (!input) return;
  input.value = text;
  autoResize(input);
  input.focus();
}
