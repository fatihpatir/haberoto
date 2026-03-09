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

    try {
        let imageData = "";
        const targetImg = uploadedManset || uploadedGallery[0];
        if (targetImg) imageData = await blobToBase64(targetImg);

        const prompt = `Sen bir okulun web sitesi sorumlusun. Okul: ${schoolNameInput.value}. Olay Özeti: ${summary}. Teşekkür: ${thanksToInput.value}. Bu bilgilere ve fotoğrafa göre şu JSON formatında yanıt ver: {"headline": "Haber Başlığı", "news": "Haber Metni", "instagram": "Instagram Açıklaması"}`;

        // Denenecek model ve endpoint kombinasyonları (Senin verdiğin örneğe göre güncellendi)
        const configs = [
            { version: "v1beta", model: "gemini-flash-latest" }, // Senin örneğindeki model
            { version: "v1beta", model: "gemini-1.5-flash" },
            { version: "v1", model: "gemini-1.5-flash" },
            { version: "v1beta", model: "gemini-1.5-pro" }
        ];

        let success = false;
        let lastError = "";

        for (const config of configs) {
            try {
                const apiUrl = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${key}`;

                const response = await fetch(apiUrl, {
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

                if (result.error) {
                    lastError = `${result.error.message} (${config.model} - ${config.version})`;
                    continue;
                }

                if (result.candidates && result.candidates[0]) {
                    const rawText = result.candidates[0].content.parts[0].text;
                    const cleanJson = rawText.replace(/```json|```/g, "").trim();
                    const data = JSON.parse(cleanJson);

                    headlineOutput.innerText = data.headline;
                    newsOutput.innerText = data.news;
                    igOutput.innerText = data.instagram;

                    const slug = slugify(data.headline);
                    processedFiles.forEach((f, i) => {
                        f.name = f.isManset ? `${slug}-manset` : `${slug}-${i}`;
                    });

                    success = true;
                    break;
                }
            } catch (e) {
                lastError = e.message;
                continue;
            }
        }

        if (!success) {
            alert("YAPAY ZEKA BAĞLANTI HATASI\n\nAlınan son hata: " + lastError + "\n\n💡 İPUCU: API anahtarınızın 'Gemini API' için aktif olduğundan ve kısıtlama (billing/region) olmadığından emin olun.");
            // Fallback isimler
            const dateStr = new Date().toISOString().slice(0, 10);
            processedFiles.forEach((f, i) => {
                f.name = f.isManset ? `haber-${dateStr}-manset` : `haber-${dateStr}-${i}`;
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

    let tw, th, sx = 0, sy = 0, sw = img.width, sh = img.height;

    if (forceRatio) {
        // Manşet: Oran korunmalı (3:2)
        tw = maxWidth;
        th = maxHeight;

        // Eğer orijinal resim çok küçükse (örn 600px), 1200'e zorlamak kaliteyi bozar
        // Ama web sitesi düzeni için 1200x800 idealdir. 
        // WhatsApp resimleri genelde 1000px+ olduğu için burada sabit kalmak iyidir.

        const targetRatio = tw / th;
        if (img.width / img.height > targetRatio) {
            sw = img.height * targetRatio;
            sx = (img.width - sw) / 2;
        } else {
            sh = img.width / targetRatio;
            sy = (img.height - sh) / 2;
        }
    } else {
        // Galeri: Sadece gerekirse küçült, ASLA büyütme (WhatsApp resimleri korunur)
        if (img.width > maxWidth || img.height > maxHeight) {
            const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
            tw = img.width * ratio;
            th = img.height * ratio;
        } else {
            // Resim zaten küçükse olduğu gibi bırak (Sadece KB boyutu düşsün)
            tw = img.width;
            th = img.height;
        }
    }

    canvas.width = tw;
    canvas.height = th;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);

    // JPEG formatına çevirip kaliteyi optimize ederek (0.75) KB boyutunu düşürüyoruz
    return new Promise(r => canvas.toBlob(b => r(b), "image/jpeg", quality));
}

function blobToBase64(blob) { return new Promise(r => { const reader = new FileReader(); reader.onloadend = () => r(reader.result); reader.readAsDataURL(blob); }); }
function copyText(id) { navigator.clipboard.writeText(document.getElementById(id).innerText); alert("Kopyalandı!"); }

