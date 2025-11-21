// script.js

// --- CONFIGURATION FIREBASE ---
// TODO: Remplace ceci par ta configuration disponible dans la console Firebase
// (Project settings > General > Your apps > SDK setup and configuration)
const firebaseConfig = {
    apiKey: "TA_API_KEY",
    authDomain: "TON_PROJET.firebaseapp.com",
    projectId: "TON_PROJET",
    storageBucket: "TON_PROJET.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// Initialisation
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const db = firebase.firestore();

// --- SÉLECTION DU DOM ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('fileInput');
const guestNameInput = document.getElementById('guestName');
const uploadBtn = document.getElementById('uploadBtn');
const previewArea = document.getElementById('preview-area');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status-text');

let selectedFiles = [];

// --- GESTION DU DRAG & DROP ---
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// --- GESTION DES FICHIERS ---
function handleFiles(files) {
    // Convertir FileList en Array pour faciliter la manipulation
    const newFiles = Array.from(files);
    
    // Filtrer uniquement images et vidéos
    const validFiles = newFiles.filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'));

    if (validFiles.length === 0) {
        alert("Veuillez sélectionner uniquement des images ou des vidéos.");
        return;
    }

    selectedFiles = [...selectedFiles, ...validFiles];
    updatePreview();
    checkFormValidity();
}

function updatePreview() {
    previewArea.innerHTML = '';
    if (selectedFiles.length > 0) {
        previewArea.innerHTML = `<p>${selectedFiles.length} fichier(s) prêt(s) à l'envoi :</p>`;
        selectedFiles.forEach(file => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.textContent = `📄 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            previewArea.appendChild(div);
        });
    }
}

guestNameInput.addEventListener('input', checkFormValidity);

function checkFormValidity() {
    // Le bouton n'est actif que si on a un nom ET des fichiers
    if (guestNameInput.value.trim() !== "" && selectedFiles.length > 0) {
        uploadBtn.disabled = false;
    } else {
        uploadBtn.disabled = true;
    }
}

// --- LOGIQUE D'ENVOI ---
uploadBtn.addEventListener('click', async () => {
    const guestName = guestNameInput.value.trim();
    if (!guestName || selectedFiles.length === 0) return;

    // UI : Désactiver le formulaire et montrer la progression
    uploadBtn.disabled = true;
    guestNameInput.disabled = true;
    progressContainer.classList.remove('hidden');
    
    let uploadedCount = 0;
    const totalFiles = selectedFiles.length;

    // Création d'un nom de dossier basé sur le nom de l'invité + timestamp pour éviter les doublons
    // ex: "Evenement/Jean Dupont_167889900/"
    const sessionTimestamp = Date.now();
    const folderName = `${guestName}_${sessionTimestamp}`;

    for (const file of selectedFiles) {
        try {
            // 1. Créer une référence dans Firebase Storage
            // Chemin : uploads / [NomDossier] / [NomFichier]
            const storageRef = storage.ref(`uploads/${folderName}/${file.name}`);

            // 2. Upload du fichier
            const snapshot = await storageRef.put(file);

            // 3. Récupérer l'URL de téléchargement
            const downloadURL = await snapshot.ref.getDownloadURL();

            // 4. Enregistrer les infos dans Firestore (Base de données)
            await db.collection('photos_event').add({
                guestName: guestName,
                fileName: file.name,
                fileUrl: downloadURL,
                fileType: file.type,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Mise à jour UI
            uploadedCount++;
            const percent = (uploadedCount / totalFiles) * 100;
            progressBar.style.width = percent + '%';
            statusText.textContent = `Envoi : ${uploadedCount}/${totalFiles} fichiers`;

        } catch (error) {
            console.error("Erreur lors de l'envoi:", error);
            alert(`Erreur sur le fichier ${file.name}`);
        }
    }

    // Fin de l'envoi
    statusText.textContent = "✅ Tous les fichiers ont été envoyés ! Merci !";
    setTimeout(() => {
        // Reset partiel après 3 secondes si quelqu'un veut renvoyer d'autres choses
        selectedFiles = [];
        updatePreview();
        progressBar.style.width = '0%';
        progressContainer.classList.add('hidden');
        uploadBtn.disabled = true; // Attendre nouveaux fichiers
        guestNameInput.disabled = false;
        alert("Merci pour vos photos !");
    }, 2000);
});
