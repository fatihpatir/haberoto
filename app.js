// Configuration & State
const API_KEY_STORAGE = "zerafet_gemini_key";
const SCHOOL_NAME_STORAGE = "zerafet_school_name";
const THANKS_TO_STORAGE = "zerafet_thanks_to";

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
const unifiedGallery = document.getElementById("unifiedGallery");
const headlineOutput = document.getElementById("headlineOutput");
const newsOutput = document.getElementById("newsOutput");
const igOutput = document.getElementById("igOutput");
const installBtn = document.getElementById("installBtn");
const iosPrompt = document.getElementById("iosPrompt");
const downloadAllBtn = document.getElementById("downloadAllBtn");

let uploadedManset = null;
let uploadedGallery = [];
let processedFiles = []; // {blob, name, isManset}
let deferredPrompt = null;

// PWA & Storage Init
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
});

installBtn.onclick = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') installBtn.style.display = 'none';
        deferredPrompt = null;
    }
};

if (localStorage.getItem(API_KEY_STORAGE)) apiKeyInput.value = localStorage.getItem(API_KEY_STORAGE);
if (localStorage.getItem(SCHOOL_NAME_STORAGE)) schoolNameInput.value = localStorage.getItem(SCHOOL_NAME_STORAGE);
if (localStorage.getItem(THANKS_TO_STORAGE)) thanksToInput.value = localStorage.getItem(THANKS_TO_STORAGE);

schoolNameInput.oninput = () => localStorage.setItem(SCHOOL_NAME_STORAGE, schoolNameInput.value);
thanksToInput.oninput = () => localStorage.setItem(THANKS_TO_STORAGE, thanksToInput.value);
apiKeyInput.oninput = () => localStorage.setItem(API_KEY_STORAGE, apiKeyInput.value);

// Handle Uploads
mansetInput.onchange = async (e) => {
    uploadedManset = e.target.files[0];
    if (uploadedManset) await processAll();
};

galleryInput.onchange = async (e) => {
    uploadedGallery = Array.from(e.target.files);
    if (uploadedGallery.length > 0) await processAll();
};

async function processAll() {
    processedFiles = [];
    galleryPreview.innerHTML = "";
    unifiedGallery.innerHTML = "";

    generateBtn.disabled = true;
    statusMsg.style.display = "block";
    statusMsg.innerHTML = "Görseller hazırlanıyor <span class='loading-dots'></span>";

    let total = (uploadedManset ? 1 : 0) + uploadedGallery.length;
    let count = 0;

    if (uploadedManset) {
        count++;
        statusGallery.innerText = `İşleniyor: Manşet (${count}/${total})`;
        const blob = await processSingle(uploadedManset, true);
        processedFiles.push({ blob, isManset: true, name: "manset" });
        addThumb(uploadedManset);
    }

    for (let i = 0; i < uploadedGallery.length; i++) {
        count++;
        statusGallery.innerText = `İşleniyor: Foto ${i + 1} (${count}/${total})`;
        const blob = await processSingle(uploadedGallery[i], false);
        processedFiles.push({ blob, isManset: false, name: `galeri-${i + 1}` });
        addThumb(uploadedGallery[i]);
    }

    statusMsg.innerHTML = "Görseller hazır. <span style='color: var(--success);'>✓</span>";
    statusGallery.innerText = `${total} görsel optimize edildi.`;
    generateBtn.disabled = total === 0;
    downloadAllBtn.disabled = total === 0; // Resimler işlendiği an indirilebilir olsun
    renderGallery();
}

async function processSingle(file, isManset) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    return await resizeImage(img, 1200, isManset ? 800 : 1200, 0.75, isManset);
}

function addThumb(file) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.cssText = "width:50px; height:50px; object-fit:cover; border-radius:8px;";
    galleryPreview.appendChild(img);
}

function renderGallery() {
    unifiedGallery.innerHTML = "";
    processedFiles.forEach(f => {
        const div = document.createElement("div");
        div.style.cssText = "position:relative; margin-bottom: 20px;";

        const img = document.createElement("img");
        img.src = URL.createObjectURL(f.blob);
        img.style.cssText = "width:100%; border-radius:20px; border:1px solid var(--border);";

        const label = document.createElement("span");
        label.innerText = f.isManset ? "MANŞET" : f.name.toUpperCase();
        label.style.cssText = "position:absolute; top:15px; left:15px; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); padding:4px 10px; border-radius:8px; font-size:0.6rem; font-weight:800;";

        const saveBtn = document.createElement("button");
        saveBtn.innerText = "💾 Kaydet";
        saveBtn.className = "copy-btn";
        saveBtn.style.top = "15px";
        saveBtn.style.padding = "6px 12px";
        saveBtn.onclick = () => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(f.blob);
            a.download = `${f.name}.jpg`;
            a.click();
        };

        div.append(img, label, saveBtn);
        unifiedGallery.appendChild(div);
    });
}

// AI logic
generateBtn.onclick = async () => {
    const key = apiKeyInput.value.trim();
    if (!key) return alert("API anahtarı eksik.");
    const summary = eventSummaryInput.value;
    if (!summary) return alert("Özet yazın.");

    generateBtn.disabled = true;
    statusMsg.style.display = "block";
    statusMsg.innerHTML = "Gemini AI analiz ediyor <span class='loading-dots'></span>";

    try {
        let imageData = "";
        const targetImg = uploadedManset || uploadedGallery[0];
        if (targetImg) imageData = await blobToBase64(targetImg);

        const prompt = `Sen bir okulun web uzmanısın. Okul: ${schoolNameInput.value} Özet: ${summary} Teşekkür: ${thanksToInput.value} Sadece JSON yanıt ver: {"headline": "...", "news": "...", "instagram": "..."}`;

        // Daha geniş kapsamlı model listesi
        const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-1.5-pro-latest", "gemini-pro"];
        let success = false;
        let lastError = "";

        for (const model of models) {
            try {
                // Önce kararlı v1 API'sini deniyoruz
                const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData.split(',')[1] } }] : [])] }] })
                });

                let result = await res.json();

                // v1 hata verirse bir de v1beta ile deniyoruz (Bazen bazı anahtarlar sadece burada çalışır)
                if (result.error && (result.error.code === 404 || result.error.status === "NOT_FOUND")) {
                    const resBeta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData.split(',')[1] } }] : [])] }] })
                    });
                    result = await resBeta.json();
                }

                if (result.error) {
                    lastError = `${result.error.message} (Kod: ${result.error.code})`;
                    console.warn(`${model} denemesi başarısız:`, lastError);
                    continue;
                }

                if (!result.candidates || !result.candidates[0]) {
                    lastError = "API yanıt verdi ama içerik üretmedi.";
                    continue;
                }

                const rawText = result.candidates[0].content.parts[0].text;
                const cleanJson = rawText.replace(/```json|```/g, "").trim();
                const data = JSON.parse(cleanJson);

                headlineOutput.innerText = data.headline;
                newsOutput.innerText = data.news;
                igOutput.innerText = data.instagram;

                // Başlık geldiyse isimleri güncelle
                const slug = slugify(data.headline);
                processedFiles.forEach((f, i) => {
                    f.name = f.isManset ? `${slug}-manset` : `${slug}-${i}`;
                });

                success = true;
                break;
            } catch (err) {
                lastError = err.message;
                continue;
            }
        }

        if (!success) {
            alert("Maalesef yapay zeka şu an yanıt veremiyor. \n\nHata: " + lastError + "\n\nNot: Resimlerinizi sitemiz üzerinden yine de indirebilirsiniz.");
            // AI başarısız olsa bile varsayılan isimlerle indirme için hazırla
            const defaultName = "okul-haberi-" + new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
            processedFiles.forEach((f, i) => {
                f.name = f.isManset ? `${defaultName}-manset` : `${defaultName}-${i}`;
            });
        }

        renderGallery();
    } catch (err) {
        alert("Sistemsel Hata: " + err.message);
    } finally {
        generateBtn.disabled = false;
        statusMsg.style.display = "none";
    }
};

downloadAllBtn.onclick = async () => {
    // iOS ve modern cihazlar için "Paylaş" menüsü üzerinden toplu kayıt (En pratiği)
    if (navigator.share && navigator.canShare) {
        try {
            const filesToShare = processedFiles.map(f => new File([f.blob], `${f.name}.jpg`, { type: "image/jpeg" }));
            if (navigator.canShare({ files: filesToShare })) {
                await navigator.share({
                    files: filesToShare,
                    title: 'Okul Haber Resimleri',
                });
                return; // Paylaşım başarılıysa aşağıya devam etme
            }
        } catch (e) {
            console.log("Paylaşım iptal edildi veya desteklenmiyor.");
        }
    }

    // Klasik yöntem (Android/PC için sıralı indirme)
    processedFiles.forEach((f, i) => {
        setTimeout(() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(f.blob);
            a.download = `${f.name}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }, i * 300);
    });
};

// Utils
function slugify(text) {
    const trMap = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U' };
    for (let key in trMap) text = text.replace(new RegExp(key, 'g'), trMap[key]);
    return text.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
}

async function resizeImage(img, maxWidth, maxHeight, quality, forceRatio) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let tw = maxWidth, th = maxHeight, sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (forceRatio) {
        const ratio = tw / th;
        if (img.width / img.height > ratio) { sw = img.height * ratio; sx = (img.width - sw) / 2; }
        else { sh = img.width / ratio; sy = (img.height - sh) / 2; }
    } else {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        tw = img.width * ratio; th = img.height * ratio;
    }
    canvas.width = tw; canvas.height = th;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
    return new Promise(r => canvas.toBlob(b => r(b), "image/jpeg", quality));
}

function blobToBase64(blob) { return new Promise(r => { const reader = new FileReader(); reader.onloadend = () => r(reader.result); reader.readAsDataURL(blob); }); }
function copyText(id) { navigator.clipboard.writeText(document.getElementById(id).innerText); alert("Kopyalandı!"); }

