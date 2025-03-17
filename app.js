// Initialize Particles.js
particlesJS.load('particles-js', 'particles.json', function () {
  console.log('Particles.js loaded');
});

// IndexedDB setup
let db;
const request = indexedDB.open('MusicPlayerDB', 2); // Version 2 for new settings store

request.onupgradeneeded = (event) => {
  db = event.target.result;
  if (!db.objectStoreNames.contains('music')) {
    db.createObjectStore('music', { keyPath: 'id', autoIncrement: true });
  }
  if (!db.objectStoreNames.contains('settings')) {
    db.createObjectStore('settings', { keyPath: 'id' });
  }
};

request.onsuccess = (event) => {
  db = event.target.result;
  loadPlaylist();
  loadSettings(); // Load saved settings
};

request.onerror = (event) => {
  console.error('Error opening IndexedDB:', event.target.error);
};

// Audio player variables
let currentSongIndex = 0;
let songs = [];
const audio = new Audio();
let repeatMode = 0; // 0: No repeat, 1: Repeat one, 2: Repeat all

// Modal variables
const modal = document.getElementById('modal');
const settingsModal = document.getElementById('settings-modal');
const closeModal = document.querySelectorAll('.close');
const saveSongBtn = document.getElementById('save-song');
const deleteSongBtn = document.getElementById('delete-song');
const songTitleInput = document.getElementById('song-title');
const songArtistInput = document.getElementById('song-artist');

// Settings variables
const darkModeToggle = document.getElementById('dark-mode');
const shufflePlaylistToggle = document.getElementById('shuffle-playlist');
const enableAnimationsToggle = document.getElementById('enable-animations');
const showLyricsToggle = document.getElementById('show-lyrics');
const primaryColorInput = document.getElementById('primary-color');
const secondaryColorInput = document.getElementById('secondary-color');
const addMusicBtnPosition = document.getElementById('add-music-btn-position');
const settingsBtnPosition = document.getElementById('settings-btn-position');
const saveSettingsBtn = document.getElementById('save-settings');

// Load settings from IndexedDB
function loadSettings() {
  const transaction = db.transaction(['settings'], 'readonly');
  const store = transaction.objectStore('settings');
  const request = store.get('userSettings');

  request.onsuccess = (event) => {
    const settings = event.target.result;
    if (settings) {
      // Apply saved settings
      darkModeToggle.checked = settings.darkMode || false;
      shufflePlaylistToggle.checked = settings.shufflePlaylist || false;
      enableAnimationsToggle.checked = settings.enableAnimations || false;
      showLyricsToggle.checked = settings.showLyrics || false;
      primaryColorInput.value = settings.primaryColor || '#ff6f61';
      secondaryColorInput.value = settings.secondaryColor || '#6b5b95';
      addMusicBtnPosition.value = settings.addMusicBtnPosition || 'left';
      settingsBtnPosition.value = settings.settingsBtnPosition || 'left';

      // Apply theme and button positions
      applyTheme();
      applyButtonPositions();
    }
  };
}

// Save settings to IndexedDB
function saveSettings() {
  const settings = {
    id: 'userSettings',
    darkMode: darkModeToggle.checked,
    shufflePlaylist: shufflePlaylistToggle.checked,
    enableAnimations: enableAnimationsToggle.checked,
    showLyrics: showLyricsToggle.checked,
    primaryColor: primaryColorInput.value,
    secondaryColor: secondaryColorInput.value,
    addMusicBtnPosition: addMusicBtnPosition.value,
    settingsBtnPosition: settingsBtnPosition.value,
  };

  const transaction = db.transaction(['settings'], 'readwrite');
  const store = transaction.objectStore('settings');
  store.put(settings);
}

// Apply theme colors
function applyTheme() {
  document.documentElement.style.setProperty('--primary-color', primaryColorInput.value);
  document.documentElement.style.setProperty('--secondary-color', secondaryColorInput.value);

  // Apply dark mode
  if (darkModeToggle.checked) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// Apply button positions
function applyButtonPositions() {
  const addMusicBtn = document.getElementById('add-music-btn');
  const settingsBtn = document.getElementById('settings-btn');

  if (addMusicBtnPosition.value === 'left') {
    addMusicBtn.style.left = '20px';
    addMusicBtn.style.right = 'auto';
  } else {
    addMusicBtn.style.left = 'auto';
    addMusicBtn.style.right = '20px';
  }

  if (settingsBtnPosition.value === 'left') {
    settingsBtn.style.left = '20px';
    settingsBtn.style.right = 'auto';
  } else {
    settingsBtn.style.left = 'auto';
    settingsBtn.style.right = '20px';
  }
}

// Save settings on button click
saveSettingsBtn.addEventListener('click', () => {
  saveSettings();
  applyTheme();
  applyButtonPositions();
  settingsModal.style.display = 'none';
});

// Open modal for adding song info
document.getElementById('add-music-btn').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

// Handle file input change
document.getElementById('file-input').addEventListener('change', (event) => {
  const files = event.target.files;
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const music = {
        name: file.name,
        data: e.target.result,
        title: file.name,
        artist: 'Unknown',
      };
      const transaction = db.transaction(['music'], 'readwrite');
      const store = transaction.objectStore('music');
      store.add(music);
      loadPlaylist();
    };
    reader.readAsDataURL(file);
  }
});

// Load playlist from IndexedDB
function loadPlaylist() {
  const transaction = db.transaction(['music'], 'readonly');
  const store = transaction.objectStore('music');
  const request = store.getAll();

  request.onsuccess = (event) => {
    songs = event.target.result;
    const playlist = document.getElementById('playlist');
    playlist.innerHTML = '';
    songs.forEach((music, index) => {
      const card = document.createElement('div');
      card.className = 'song-card';
      card.setAttribute('data-id', music.id);
      card.innerHTML = `
        <span>${music.title} - ${music.artist}</span>
        <button class="edit-btn"><i class="fas fa-edit"></i></button>
      `;
      card.addEventListener('click', () => playSong(index));
      card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(index);
      });
      playlist.appendChild(card);
    });
    initDragAndDrop();
  };
}

// Initialize drag-and-drop functionality
function initDragAndDrop() {
  const playlist = document.getElementById('playlist');
  new Sortable(playlist, {
    animation: 150,
    onEnd: (event) => {
      const updatedSongs = Array.from(playlist.children).map((card) => {
        const id = parseInt(card.getAttribute('data-id'));
        return songs.find((song) => song.id === id);
      });
      songs = updatedSongs;
      savePlaylistOrder();
    },
  });
}

// Save playlist order to IndexedDB
function savePlaylistOrder() {
  const transaction = db.transaction(['music'], 'readwrite');
  const store = transaction.objectStore('music');
  songs.forEach((song, index) => {
    song.order = index;
    store.put(song);
  });
}

// Open edit modal
function openEditModal(index) {
  currentSongIndex = index;
  const song = songs[index];
  songTitleInput.value = song.title;
  songArtistInput.value = song.artist;
  modal.style.display = 'flex';
}

// Close modal
closeModal.forEach((btn) => {
  btn.addEventListener('click', () => {
    modal.style.display = 'none';
    settingsModal.style.display = 'none';
  });
});

// Save song changes
saveSongBtn.addEventListener('click', () => {
  const transaction = db.transaction(['music'], 'readwrite');
  const store = transaction.objectStore('music');
  const song = songs[currentSongIndex];
  song.title = songTitleInput.value;
  song.artist = songArtistInput.value;
  store.put(song);
  loadPlaylist();
  modal.style.display = 'none';
});

// Delete song
deleteSongBtn.addEventListener('click', () => {
  const transaction = db.transaction(['music'], 'readwrite');
  const store = transaction.objectStore('music');
  store.delete(songs[currentSongIndex].id);
  loadPlaylist();
  modal.style.display = 'none';
});

// Play selected song
function playSong(index) {
  currentSongIndex = index;
  audio.src = songs[index].data;
  audio.play();
  document.getElementById('current-song').textContent = `${songs[index].title} - ${songs[index].artist}`;
  updatePlayPauseButton();
  highlightPlayingSong(index);
}

// Highlight the currently playing song
function highlightPlayingSong(index) {
  const playlist = document.getElementById('playlist');
  const songCards = playlist.querySelectorAll('.song-card');
  songCards.forEach((card, i) => {
    if (i === index) {
      card.classList.add('playing');
    } else {
      card.classList.remove('playing');
    }
  });
}

// Update play/pause button
function updatePlayPauseButton() {
  const playPauseBtn = document.getElementById('play-pause-btn');
  playPauseBtn.innerHTML = audio.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
}

// Player controls
document.getElementById('play-pause-btn').addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
  updatePlayPauseButton();
});

document.getElementById('prev-btn').addEventListener('click', () => {
  currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
  playSong(currentSongIndex);
});

document.getElementById('next-btn').addEventListener('click', () => {
  currentSongIndex = (currentSongIndex + 1) % songs.length;
  playSong(currentSongIndex);
});

// Repeat functionality
const repeatOptions = document.querySelectorAll('.repeat-options div');
repeatOptions.forEach((option) => {
  option.addEventListener('click', () => {
    repeatMode = parseInt(option.getAttribute('data-mode'));
    document.getElementById('repeat-btn').innerHTML = `<i class="fas fa-repeat"></i>`;
    if (repeatMode === 1) {
      document.getElementById('repeat-btn').innerHTML = `<i class="fas fa-repeat-1"></i>`;
    } else if (repeatMode === 2) {
      document.getElementById('repeat-btn').innerHTML = `<i class="fas fa-repeat"></i>`;
    }
  });
});

audio.addEventListener('ended', () => {
  if (repeatMode === 1) {
    playSong(currentSongIndex); // Repeat one
  } else if (repeatMode === 2) {
    currentSongIndex = (currentSongIndex + 1) % songs.length; // Repeat all
    playSong(currentSongIndex);
  }
});

// Volume control
document.getElementById('volume-slider').addEventListener('input', (e) => {
  audio.volume = e.target.value;
});

// Update progress bar
audio.addEventListener('timeupdate', () => {
  const progress = (audio.currentTime / audio.duration) * 100;
  document.getElementById('progress').style.width = `${progress}%`;
});

// Seek on progress bar click
document.querySelector('.progress-container').addEventListener('click', (e) => {
  const width = e.target.clientWidth;
  const clickX = e.offsetX;
  const duration = audio.duration;
  audio.currentTime = (clickX / width) * duration;
});

// Settings functionality
document.getElementById('settings-btn').addEventListener('click', () => {
  settingsModal.style.display = 'flex';
});

// Shuffle playlist
function shufflePlaylist() {
  for (let i = songs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [songs[i], songs[j]] = [songs[j], songs[i]];
  }
  loadPlaylist();
}