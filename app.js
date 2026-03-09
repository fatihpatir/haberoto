// Configuration & State
const API_KEY_STORAGE = "zerafet_gemini_key";

// DOM Elements
const schoolNameInput = document.getElementById("schoolName");
const eventSummaryInput = document.getElementById("eventSummary");
const thanksToInput = document.getElementById("thanksTo");
const mansetInput = document.getElementById("mansetInput");
const galleryInput = document.getElementById("galleryInput");
const apiKeyInput = document.getElementById("apiKey");
const generateBtn = document.getElementById("generateBtn");
const statusMsg = document.getElementById("statusMsg");
const statusGallery = document.getElementById("statusGallery");
const galleryPreview = document.getElementById("galleryPreview");
const webGallery = document.getElementById("webGallery");
const igGallery = document.getElementById("igGallery");
const headlineOutput = document.getElementById("headlineOutput");
const newsOutput = document.getElementById("newsOutput");
const igOutput = document.getElementById("igOutput");
const installBtn = document.getElementById("installBtn");
const iosPrompt = document.getElementById("iosPrompt");

let uploadedManset = null;
let uploadedGallery = [];
let processedWebFiles = [];
let processedIgFiles = [];
let deferredPrompt = null;

// PWA Installation Logic
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installBtn.style.display = 'none';
        }
        deferredPrompt = null;
    }
});

// iOS Detection for PWA Prompt
const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
};
const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

if (isIos() && !isInStandaloneMode()) {
    iosPrompt.style.display = 'block';
}

const SCHOOL_NAME_STORAGE = "zerafet_school_name";
const THANKS_TO_STORAGE = "zerafet_thanks_to";

// Load saved data
if (localStorage.getItem(API_KEY_STORAGE)) apiKeyInput.value = localStorage.getItem(API_KEY_STORAGE);
if (localStorage.getItem(SCHOOL_NAME_STORAGE)) schoolNameInput.value = localStorage.getItem(SCHOOL_NAME_STORAGE);
if (localStorage.getItem(THANKS_TO_STORAGE)) thanksToInput.value = localStorage.getItem(THANKS_TO_STORAGE);

// Auto-save settings
schoolNameInput.oninput = () => localStorage.setItem(SCHOOL_NAME_STORAGE, schoolNameInput.value);
thanksToInput.oninput = () => localStorage.setItem(THANKS_TO_STORAGE, thanksToInput.value);
apiKeyInput.oninput = () => localStorage.setItem(API_KEY_STORAGE, apiKeyInput.value);

// Handle Manşet Upload
mansetInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadedManset = file;
    await processAndRefreshAll();
};

// Handle Gallery Upload
galleryInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    uploadedGallery = files;
    await processAndRefreshAll();
};

async function processAndRefreshAll() {
    processedWebFiles = [];
    processedIgFiles = [];
    galleryPreview.innerHTML = "";

    generateBtn.disabled = true;
    statusMsg.style.display = "block";
    statusMsg.innerHTML = "Görseller optimize ediliyor <span class='loading-dots'></span>";

    let totalFiles = (uploadedManset ? 1 : 0) + uploadedGallery.length;
    let currentIdx = 0;

    if (uploadedManset) {
        currentIdx++;
        statusGallery.innerText = `İşleniyor: Manşet (${currentIdx}/${totalFiles})`;
        await processSingleFile(uploadedManset, 0, true);
        addThumbnail(uploadedManset);
    }

    for (let i = 0; i < uploadedGallery.length; i++) {
        currentIdx++;
        statusGallery.innerText = `İşleniyor: Galeri ${i + 1} (${currentIdx}/${totalFiles})`;
        await processSingleFile(uploadedGallery[i], i + 1, false);
        addThumbnail(uploadedGallery[i]);
    }

    statusMsg.innerHTML = "Görseller hazır. <span style='color: var(--success);'>✓</span>";
    statusGallery.innerText = `${totalFiles} görsel optimize edildi.`;
    generateBtn.disabled = totalFiles === 0;
    renderProcessedGalleries();
}

async function processSingleFile(file, index, isManset) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    // Web Optimize (Manşet is forced to horizontal 1200x800)
    const webBlob = await resizeImage(img, 1200, 800, 0.75, isManset);
    processedWebFiles.push({ blob: webBlob, name: isManset ? "ANA_MANSET" : `GALERI_${index}` });

    // IG Optimize (1080x1350 vertical for IG)
    const igBlob = await resizeImage(img, 1080, 1350, 0.85, false);
    processedIgFiles.push({ blob: igBlob, name: isManset ? "IG_MANSET" : `IG_GALERI_${index}` });
}

function addThumbnail(file) {
    const thumb = document.createElement("img");
    thumb.src = URL.createObjectURL(file);
    thumb.className = "preview-img";
    thumb.style.display = "block";
    thumb.style.height = "50px";
    thumb.style.width = "50px";
    thumb.style.objectFit = "cover";
    thumb.style.borderRadius = "8px";
    galleryPreview.appendChild(thumb);
}

function renderProcessedGalleries() {
    webGallery.innerHTML = "";
    igGallery.innerHTML = "";

    processedWebFiles.forEach(f => {
        webGallery.appendChild(createImgWrapper(f.blob, f.name));
    });

    processedIgFiles.forEach(f => {
        igGallery.appendChild(createImgWrapper(f.blob, f.name));
    });
}

function createImgWrapper(blob, label) {
    const div = document.createElement("div");
    div.style.position = "relative";
    div.style.marginBottom = "10px";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(blob);
    img.style.width = "100%";
    img.style.borderRadius = "20px";
    img.style.border = "1px solid var(--border)";

    const span = document.createElement("span");
    span.innerText = label;
    span.style.position = "absolute";
    span.style.top = "15px";
    span.style.left = "15px";
    span.style.background = "rgba(0,0,0,0.7)";
    span.style.backdropFilter = "blur(4px)";
    span.style.padding = "4px 10px";
    span.style.borderRadius = "8px";
    span.style.fontSize = "0.65rem";
    span.style.fontWeight = "800";
    span.style.textTransform = "uppercase";

    div.appendChild(img);
    div.appendChild(span);
    return div;
}

async function resizeImage(img, maxWidth, maxHeight, quality, forceRatio) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let targetWidth, targetHeight;
    let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;

    if (forceRatio) {
        // Manşet için zorunlu yatay oran (3:2)
        targetWidth = maxWidth;
        targetHeight = maxHeight;

        const targetRatio = targetWidth / targetHeight;
        const currentRatio = img.width / img.height;

        if (currentRatio > targetRatio) {
            // Görsel hedef orandan daha genişse kenarları kırp
            sourceWidth = img.height * targetRatio;
            sourceX = (img.width - sourceWidth) / 2;
        } else {
            // Görsel hedef orandan daha dikeyse üst-alt kırp (Center Crop)
            sourceHeight = img.width / targetRatio;
            sourceY = (img.height - sourceHeight) / 2;
        }
    } else {
        // Normal galeri resimleri için en-boy oranını koruyarak sığdır
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        targetWidth = img.width * ratio;
        targetHeight = img.height * ratio;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

    return new Promise(r => canvas.toBlob(b => r(b), "image/jpeg", quality));
}

// AI Generation Logic
generateBtn.onclick = async () => {
    const key = apiKeyInput.value.trim();
    if (!key) return alert("Lütfen API anahtarınızı girin.");
    localStorage.setItem(API_KEY_STORAGE, key);

    const summary = eventSummaryInput.value;
    const school = schoolNameInput.value;
    const thanks = thanksToInput.value;
    if (!summary) return alert("Haber için kısa bir özet yazın.");

    generateBtn.disabled = true;
    statusMsg.style.display = "block";
    statusMsg.innerHTML = "Gemini AI akıllı analiz yapıyor <span class='loading-dots'></span>";

    try {
        let imageData = "";
        if (uploadedManset) {
            imageData = await blobToBase64(uploadedManset);
        } else if (uploadedGallery.length > 0) {
            imageData = await blobToBase64(uploadedGallery[0]);
        }

        const prompt = `Sen bir okulun web sitesi ve instagram sorumlusun.
        Okul: ${school}
        İçerik özeti: ${summary}
        Teşekkür: ${thanks}
        Sana gönderilen fotoğrafı görerek şu JSON formatında yanıt üret:
        {"headline": "Haber başlığı", "news": "Haber metni", "instagram": "Emoji zengin instagram açıklaması"}
        Başka yazı ekleme, sadece JSON.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData.split(',')[1] } }] : [])
                    ]
                }]
            })
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error.message);

        const data = JSON.parse(result.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());
        headlineOutput.innerText = data.headline;
        newsOutput.innerText = data.news;
        igOutput.innerText = data.instagram;

    } catch (err) {
        console.error(err);
        alert("Bağlantı Hatası: " + err.message);
    } finally {
        statusMsg.style.display = "none";
        generateBtn.disabled = false;
    }
};

// Helpers
function blobToBase64(blob) {
    return new Promise(r => {
        const reader = new FileReader();
        reader.onloadend = () => r(reader.result);
        reader.readAsDataURL(blob);
    });
}

function copyText(id) {
    const text = document.getElementById(id).innerText;
    navigator.clipboard.writeText(text);
    alert("Kopyalandı!");
}
