// Diras Boys - Main Application JavaScript
// ==========================================

// Individual RSVP Reset Interval (12 hours in milliseconds)
const RSVP_RESET_INTERVAL = 12 * 60 * 60 * 1000;

// Default Animal Images
// Local images for sloth, alligator, skunk (from D:\imp pics)
// Wikipedia Commons for lion and wolf (kept as-is)
const DEFAULT_IMAGES = {
    sloth: 'images/sloth.jpg',
    lion: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Lion_waiting_in_Namibia.jpg',
    alligator: 'images/alligator.jpg',
    skunk: 'images/skunk.jpg',
    wolf: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Eurasian_wolf_2.jpg'
};

// Fallback images if primary fails (Wikipedia Commons backups)
const FALLBACK_IMAGES = {
    sloth: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Two-toed_sloth_Costa_Rica_-_cropped.jpg',
    lion: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Lion_d%27Afrique.jpg',
    alligator: 'https://upload.wikimedia.org/wikipedia/commons/1/17/American_Alligator.jpg',
    skunk: 'https://upload.wikimedia.org/wikipedia/commons/6/63/Striped_Skunk.jpg',
    wolf: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Canis_lupus_laying.jpg'
};

// Get custom image from localStorage or use default
function getAnimalImage(animalKey) {
    const customImages = JSON.parse(localStorage.getItem('dirasboys_custom_images') || '{}');
    if (customImages[animalKey]) {
        return customImages[animalKey];
    }
    return DEFAULT_IMAGES[animalKey];
}

// Save custom image to localStorage
function saveCustomImage(animalKey, imageData) {
    const customImages = JSON.parse(localStorage.getItem('dirasboys_custom_images') || '{}');
    customImages[animalKey] = imageData;
    localStorage.setItem('dirasboys_custom_images', JSON.stringify(customImages));
}

// Clear custom image (revert to default)
function clearCustomImage(animalKey) {
    const customImages = JSON.parse(localStorage.getItem('dirasboys_custom_images') || '{}');
    delete customImages[animalKey];
    localStorage.setItem('dirasboys_custom_images', JSON.stringify(customImages));
}

// Image error handler - try fallback
function handleImageError(img, animalKey) {
    const customImages = JSON.parse(localStorage.getItem('dirasboys_custom_images') || '{}');
    const currentSrc = img.src;

    // If currently showing custom image that failed, try default
    if (customImages[animalKey] && currentSrc.includes(customImages[animalKey])) {
        img.src = DEFAULT_IMAGES[animalKey];
        return;
    }

    // If default (local) failed, try fallback (Wikipedia)
    if (currentSrc.includes(DEFAULT_IMAGES[animalKey]) || currentSrc.endsWith(DEFAULT_IMAGES[animalKey])) {
        img.src = FALLBACK_IMAGES[animalKey];
        return;
    }

    // Final fallback - colored placeholder
    const colors = {
        sloth: '#8B7355',
        lion: '#DAA520',
        alligator: '#556B2F',
        skunk: '#2F4F4F',
        wolf: '#696969'
    };
    img.style.background = colors[animalKey] || '#333';
    img.style.display = 'block';
    img.alt = animalKey.charAt(0).toUpperCase() + animalKey.slice(1);
}

// Get animal key from animal name
function getAnimalKey(animal) {
    const map = {
        'Sloth': 'sloth',
        'Lion': 'lion',
        'Alligator': 'alligator',
        'Skunk': 'skunk',
        'Smoking Wolf': 'wolf'
    };
    return map[animal] || 'wolf';
}

// User accounts
const ACCOUNTS = {
    'al5ya6': {
        password: '5759',
        animal: 'Sloth',
        isWolf: false,
        canUploadImage: true
    },
    "shded alba's": {
        password: '6969',
        animal: 'Lion',
        isWolf: false,
        canUploadImage: false
    },
    'm9re': {
        password: '4512',
        animal: 'Alligator',
        isWolf: false,
        canUploadImage: true
    },
    'froska': {
        password: '7182',
        animal: 'Skunk',
        isWolf: false,
        canUploadImage: true
    },
    'ktoosh': {
        password: '1195',
        animal: 'Smoking Wolf',
        isAdmin: true,
        isWolf: true,
        canUploadImage: false
    }
};

let currentUser = null;
let timerInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    checkSession();
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Start the timer update interval
    startTimerInterval();
});

function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (6 + Math.random() * 4) + 's';
        container.appendChild(particle);
    }
}

// ==========================================
// INDIVIDUAL RSVP TIMER SYSTEM (12 hours per user)
// ==========================================

// RSVP Data structure: { username: { status: 'coming'|'not-coming', timestamp: 1234567890 } }
function getRSVPData() {
    return JSON.parse(localStorage.getItem('dirasboys_rsvp_v2') || '{}');
}

function saveRSVPData(data) {
    localStorage.setItem('dirasboys_rsvp_v2', JSON.stringify(data));
}

// Check and reset expired individual timers
function checkIndividualTimers() {
    const data = getRSVPData();
    const now = Date.now();
    let changed = false;

    Object.keys(data).forEach(username => {
        const userData = data[username];
        if (userData && userData.timestamp) {
            const elapsed = now - userData.timestamp;
            if (elapsed >= RSVP_RESET_INTERVAL) {
                // Timer expired - reset this user to pending
                delete data[username];
                changed = true;
                console.log(`${username}'s RSVP has been reset (12 hours expired)`);
            }
        }
    });

    if (changed) {
        saveRSVPData(data);
        // Refresh UI if logged in
        if (currentUser) {
            renderMembers();
            updateYourStatus();
            updateAdminStats();
        }
    }
}

// Get time remaining for a specific user
function getUserTimeRemaining(username) {
    const data = getRSVPData();
    const userData = data[username];

    if (!userData || !userData.timestamp) {
        return null; // No active timer
    }

    const now = Date.now();
    const elapsed = now - userData.timestamp;
    const remaining = RSVP_RESET_INTERVAL - elapsed;

    if (remaining <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, expired: false };
}

// Format time remaining as string
function formatTimeRemaining(time) {
    if (!time) return '';
    if (time.expired) return 'Resetting...';
    return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}:${time.seconds.toString().padStart(2, '0')}`;
}

// Start interval to update timers every second
function startTimerInterval() {
    timerInterval = setInterval(() => {
        checkIndividualTimers();
        updateAllTimerDisplays();
    }, 1000);
}

// Update all timer displays in the UI
function updateAllTimerDisplays() {
    // Update current user's timer in RSVP card
    updateCurrentUserTimerDisplay();

    // Update timers in member cards
    Object.keys(ACCOUNTS).forEach(username => {
        const timerEl = document.getElementById(`timer-${username.replace(/[^a-zA-Z0-9]/g, '_')}`);
        if (timerEl) {
            const time = getUserTimeRemaining(username);
            if (time && !time.expired) {
                timerEl.innerHTML = `Resets in: <span class="time">${formatTimeRemaining(time)}</span>`;
                timerEl.style.display = 'block';
            } else {
                timerEl.style.display = 'none';
            }
        }
    });
}

// Update current user's timer display in RSVP card
function updateCurrentUserTimerDisplay() {
    if (!currentUser) return;

    const timerEl = document.getElementById('resetTimer');
    if (!timerEl) return;

    const time = getUserTimeRemaining(currentUser.name);
    if (time && !time.expired) {
        timerEl.innerHTML = `Your response resets in: <span class="time">${formatTimeRemaining(time)}</span>`;
        timerEl.style.display = 'block';
    } else {
        timerEl.innerHTML = `<span style="color: #888;">No active timer - respond to start your 12-hour countdown</span>`;
        timerEl.style.display = 'block';
    }
}

// ==========================================
// LOGIN/LOGOUT
// ==========================================

function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('nameSelect').value;
    const password = document.getElementById('passwordInput').value;
    const errorMsg = document.getElementById('errorMsg');

    if (!name) {
        errorMsg.textContent = 'Please select your name';
        errorMsg.style.display = 'block';
        return;
    }

    const account = ACCOUNTS[name];
    if (password !== account.password) {
        errorMsg.textContent = 'Wrong password!';
        errorMsg.style.display = 'block';
        return;
    }

    localStorage.setItem('dirasboys_session', name);
    currentUser = { name, ...account };
    showMainApp();
}

function checkSession() {
    const sessionName = localStorage.getItem('dirasboys_session');
    if (sessionName && ACCOUNTS[sessionName]) {
        currentUser = { name: sessionName, ...ACCOUNTS[sessionName] };
        showMainApp();
    }
}

function showMainApp() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';

    const userAnimalKey = getAnimalKey(currentUser.animal);
    const userImage = getAnimalImage(userAnimalKey);

    document.getElementById('currentAvatar').innerHTML =
        `<img src="${userImage}" alt="${currentUser.animal}" onerror="handleImageError(this, '${userAnimalKey}')">`;
    document.getElementById('currentName').innerHTML = currentUser.name +
        (currentUser.isAdmin ? '<span class="admin-badge">ADMIN</span>' : '');
    document.getElementById('currentAnimal').textContent = currentUser.animal;

    if (currentUser.isAdmin) {
        document.getElementById('adminPanel').style.display = 'block';
    }

    // Show image upload section if user can upload
    const uploadSection = document.getElementById('imageUploadSection');
    if (uploadSection) {
        if (currentUser.canUploadImage) {
            uploadSection.style.display = 'block';
            setupImageUpload();
            updateImagePreview();
        } else {
            uploadSection.style.display = 'none';
        }
    }

    renderMembers();
    updateYourStatus();
    updateAdminStats();
    updateCurrentUserTimerDisplay();
}

function logout() {
    localStorage.removeItem('dirasboys_session');
    currentUser = null;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginForm').reset();
    document.getElementById('errorMsg').style.display = 'none';
}

// ==========================================
// RSVP FUNCTIONS
// ==========================================

function setRSVP(status) {
    const data = getRSVPData();

    if (status === 'pending') {
        // Remove the entry to reset to pending state (clears timer too)
        delete data[currentUser.name];
    } else {
        // Set status AND start the 12-hour timer
        data[currentUser.name] = {
            status: status,
            timestamp: Date.now()
        };
    }

    saveRSVPData(data);
    renderMembers();
    updateYourStatus();
    updateAdminStats();
    updateCurrentUserTimerDisplay();
}

function getUserStatus(username) {
    const data = getRSVPData();
    const userData = data[username];
    return userData ? userData.status : null;
}

function updateYourStatus() {
    const status = getUserStatus(currentUser.name);
    const container = document.getElementById('yourStatus');

    if (status === 'coming') {
        container.innerHTML = '<div class="your-status status-coming">You\'re Coming!</div>';
    } else if (status === 'not-coming') {
        container.innerHTML = '<div class="your-status status-not-coming">You\'re Not Coming</div>';
    } else {
        container.innerHTML = '<div class="your-status status-unknown">You haven\'t responded yet</div>';
    }
}

function renderMembers() {
    const grid = document.getElementById('membersGrid');

    grid.innerHTML = Object.entries(ACCOUNTS).map(([name, account]) => {
        const status = getUserStatus(name);
        const statusClass = status === 'coming' ? 'status-coming' :
                           status === 'not-coming' ? 'status-not-coming' : 'status-unknown';
        const statusText = status === 'coming' ? 'Coming' :
                          status === 'not-coming' ? 'Not Coming' : 'Pending';
        const wolfClass = account.isWolf ? 'wolf-avatar' : '';
        const animalKey = getAnimalKey(account.animal);
        const memberImage = getAnimalImage(animalKey);

        // Create safe ID for timer element
        const safeId = name.replace(/[^a-zA-Z0-9]/g, '_');

        // Get time remaining for this user
        const time = getUserTimeRemaining(name);
        const timerDisplay = time && !time.expired ? `Resets in: <span class="time">${formatTimeRemaining(time)}</span>` : '';
        const timerStyle = time && !time.expired ? '' : 'display: none;';

        return `
            <div class="member-card">
                <div class="member-avatar ${wolfClass}">
                    <img src="${memberImage}" alt="${account.animal}" onerror="handleImageError(this, '${animalKey}')">
                </div>
                <div class="member-name">${name}${account.isAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}</div>
                <div class="member-animal">${account.animal}</div>
                <div class="member-status ${statusClass}">${statusText}</div>
                <div class="member-timer" id="timer-${safeId}" style="${timerStyle}">${timerDisplay}</div>
            </div>
        `;
    }).join('');
}

function updateAdminStats() {
    if (!currentUser?.isAdmin) return;

    let coming = 0, notComing = 0, pending = 0;

    Object.keys(ACCOUNTS).forEach(name => {
        const status = getUserStatus(name);
        if (status === 'coming') coming++;
        else if (status === 'not-coming') notComing++;
        else pending++;
    });

    document.getElementById('adminComing').textContent = coming;
    document.getElementById('adminNotComing').textContent = notComing;
    document.getElementById('adminPending').textContent = pending;
}

// Admin function to manually reset all RSVP
function adminResetRSVP() {
    if (!currentUser?.isAdmin) return;

    if (confirm('Are you sure you want to reset all RSVP responses and timers?')) {
        localStorage.setItem('dirasboys_rsvp_v2', '{}');
        renderMembers();
        updateYourStatus();
        updateAdminStats();
        updateCurrentUserTimerDisplay();
        alert('All RSVP responses and timers have been reset!');
    }
}

// ==========================================
// IMAGE UPLOAD SYSTEM
// ==========================================

function setupImageUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('imageFileInput');

    if (!uploadArea || !fileInput) return;

    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processImageFile(file);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            processImageFile(file);
        }
    });
}

function processImageFile(file) {
    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
        alert('Image too large! Please use an image under 2MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;
        const animalKey = getAnimalKey(currentUser.animal);

        // Save the custom image
        saveCustomImage(animalKey, imageData);

        // Update UI
        updateImagePreview();
        renderMembers();

        // Update header avatar
        const userImage = getAnimalImage(animalKey);
        document.getElementById('currentAvatar').innerHTML =
            `<img src="${userImage}" alt="${currentUser.animal}" onerror="handleImageError(this, '${animalKey}')">`;

        alert('Image uploaded successfully!');
    };
    reader.readAsDataURL(file);
}

function updateImagePreview() {
    const previewContainer = document.getElementById('currentImagePreview');
    if (!previewContainer) return;

    const animalKey = getAnimalKey(currentUser.animal);
    const currentImage = getAnimalImage(animalKey);
    const customImages = JSON.parse(localStorage.getItem('dirasboys_custom_images') || '{}');
    const hasCustomImage = !!customImages[animalKey];

    previewContainer.innerHTML = `
        <img src="${currentImage}" alt="Current image" onerror="handleImageError(this, '${animalKey}')">
        <p>${hasCustomImage ? 'Custom image' : 'Default image'}</p>
        ${hasCustomImage ? '<button class="btn btn-danger" onclick="removeCustomImage()" style="margin-top: 10px; padding: 8px 20px; font-size: 12px;">Remove Custom Image</button>' : ''}
    `;
}

function removeCustomImage() {
    const animalKey = getAnimalKey(currentUser.animal);
    clearCustomImage(animalKey);

    // Update UI
    updateImagePreview();
    renderMembers();

    // Update header avatar
    const userImage = getAnimalImage(animalKey);
    document.getElementById('currentAvatar').innerHTML =
        `<img src="${userImage}" alt="${currentUser.animal}" onerror="handleImageError(this, '${animalKey}')">`;

    alert('Custom image removed. Using default image.');
}
