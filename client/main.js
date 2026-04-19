// client/main.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Replace these with your Supabase project values or inject via a build step
const SUPA_URL = '<YOUR_SUPABASE_URL>';
const SUPA_ANON_KEY = '<YOUR_SUPABASE_ANON_KEY>';
const supabase = createClient(SUPA_URL, SUPA_ANON_KEY);

// ICE config with STUN and TURN placeholder (TURN credentials can be fetched from server)
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
    // TURN will be added dynamically by fetching /turn/credentials from server if available
  ]
};

let localStream = null;
let pc = null;
let currentRoom = null;
let mediaRecorder = null;
let recordedChunks = [];
let subscription = null;

// UI refs
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const usernameEl = document.getElementById('username');
const fullnameEl = document.getElementById('fullname');
const signupBtn = document.getElementById('signup');
const signinBtn = document.getElementById('signin');
const signoutBtn = document.getElementById('signout');
const meDiv = document.getElementById('me');

const lobby = document.getElementById('lobby');
const authSection = document.getElementById('auth');
const roomEl = document.getElementById('room');
const joinBtn = document.getElementById('join');
const leaveBtn = document.getElementById('leave');
const pttBtn = document.getElementById('ptt');
const recordBtn = document.getElementById('record');
const keybindInput = document.getElementById('keybind');
const peersDiv = document.getElementById('peers');

signupBtn.onclick = async () => {
  const email = emailEl.value;
  const password = passwordEl.value;
  const username = usernameEl.value || email.split('@')[0];
  const full_name = fullnameEl.value || username;

  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { username, full_name } }
  });

  if (error) return alert('Sign up error: ' + error.message);
  alert('Sign up successful. Check your email to confirm if required.');
};

signinBtn.onclick = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailEl.value,
    password: passwordEl.value
  });
  if (error) return alert('Sign in error: ' + error.message);
  await onAuthChange();
};

signoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  updateUIForAuth();
};

async function onAuthChange() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return updateUIForAuth();
  // ensure profile exists
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single().maybeSingle();
  if (!profile) {
    const username = user.user_metadata?.username || user.email.split('@')[0];
    const full_name = user.user_metadata?.full_name || username;
    await supabase.from('profiles').insert([{ id: user.id, username, full_name }]);
  }
  updateUIForAuth();
}

function updateUIForAuth() {
  supabase.auth.getUser().then(({ data }) => {
    if (data.user) {
      authSection.style.display = 'none';
      lobby.style.display = 'block';
      signoutBtn.style.display = 'inline-block';
      meDiv.style.display = 'block';
      meDiv.innerText = `Signed in as ${data.user.email}`;
    } else {
      authSection.style.display = 'block';
      lobby.style.display = 'none';
      signoutBtn.style.display = 'none';
      meDiv.style.display = 'none';
    }
  });
}

supabase.auth.onAuthStateChange((event, session) => {
  onAuthChange();
});

// Signaling via Supabase Realtime (signals table)
async function publishSignal(room, payload) {
  const user = await supabase.auth.getUser();
  const sender = user.data.user?.id || null;
  await supabase.from('signals').insert([{ room, sender, payload }]);
}

async function subscribeToRoom(room) {
  if (subscription) {
    await supabase.removeChannel(subscription);
    subscription = null;
  }

  subscription = supabase.channel('public:signals')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals', filter: `room=eq.${room}` }, payload => {
      const rec = payload.record;
      supabase.auth.getUser().then(({ data }) => {
        const myId = data.user?.id;
        if (rec.sender === myId) return;
        handleSignal(rec.payload);
      });
    })
    .subscribe();
}

async function ensureLocalStream() {
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getAudioTracks().forEach(t => t.enabled = false);
  }
}

async function createPeerConnection() {
  if (pc) return pc;
  // Attempt to fetch TURN credentials from server
  try {
    const resp = await fetch('/turn/credentials', { method: 'POST' });
    if (resp.ok) {
      const creds = await resp.json();
      ICE_CONFIG.iceServers = [
        ...ICE_CONFIG.iceServers,
        { urls: creds.urls, username: creds.username, credential: creds.credential }
      ];
    }
  } catch (err) {
    console.warn('No TURN credentials available from server', err);
  }

  pc = new RTCPeerConnection(ICE_CONFIG);

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      publishSignal(currentRoom, { type: 'ice', candidate: e.candidate });
    }
  };

  pc.ontrack = (e) => {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.srcObject = e.streams[0];
    peersDiv.appendChild(audio);
  };

  return pc;
}

async function attachLocalTracks() {
  await ensureLocalStream();
  await createPeerConnection();
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
}

async function handleSignal(payload) {
  if (!pc) await createPeerConnection();

  if (payload.type === 'offer') {
    await pc.setRemoteDescription(payload.sdp);
    await attachLocalTracks();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await publishSignal(currentRoom, { type: 'answer', sdp: pc.localDescription });
  } else if (payload.type === 'answer') {
    await pc.setRemoteDescription(payload.sdp);
  } else if (payload.type === 'ice') {
    try {
      await pc.addIceCandidate(payload.candidate);
    } catch (err) {
      console.warn('Failed to add ICE candidate', err);
    }
  }
}

joinBtn.onclick = async () => {
  const room = roomEl.value.trim();
  if (!room) return alert('Enter a room name');
  currentRoom = room;
  await subscribeToRoom(room);
  await attachLocalTracks();

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await publishSignal(room, { type: 'offer', sdp: pc.localDescription });

  joinBtn.style.display = 'none';
  leaveBtn.style.display = 'inline-block';
};

leaveBtn.onclick = async () => {
  if (subscription) {
    await supabase.removeChannel(subscription);
    subscription = null;
  }
  if (pc) {
    pc.close();
    pc = null;
  }
  currentRoom = null;
  joinBtn.style.display = 'inline-block';
  leaveBtn.style.display = 'none';
  peersDiv.innerHTML = '';
};

pttBtn.onmousedown = async () => {
  await ensureLocalStream();
  localStream.getAudioTracks().forEach(t => t.enabled = true);
};
pttBtn.onmouseup = () => {
  if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = false);
};

keybindInput.addEventListener('keydown', (e) => {
  e.preventDefault();
  const key = e.key;
  localStorage.setItem('pttKey', key);
  keybindInput.value = `Key: ${key}`;
});

window.addEventListener('keydown', (e) => {
  const key = localStorage.getItem('pttKey');
  if (key && e.key === key) {
    pttBtn.dispatchEvent(new MouseEvent('mousedown'));
  }
});
window.addEventListener('keyup', (e) => {
  const key = localStorage.getItem('pttKey');
  if (key && e.key === key) {
    pttBtn.dispatchEvent(new MouseEvent('mouseup'));
  }
});

recordBtn.onclick = async () => {
  if (!localStream) {
    await ensureLocalStream();
  }
  if (!mediaRecorder) {
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(localStream);
    mediaRecorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) recordedChunks.push(ev.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      mediaRecorder = null;
      recordBtn.innerText = 'Start Recording';
    };
    mediaRecorder.start();
    recordBtn.innerText = 'Stop Recording';
  } else {
    mediaRecorder.stop();
  }
};

updateUIForAuth();
onAuthChange();
