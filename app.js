// Configuration & State
const SCHOOL_NAME_STORAGE = "zerafet_school_name";
const THANKS_TO_STORAGE = "zerafet_thanks_to";
const STAFF_CONTEXT_STORAGE = "zerafet_staff_context";
const API_KEY_STORAGE = "zerafet_api_key";

// API ANAHTARI ARTIK SİZİN CİHAZINIZDA SAKLANIR 🛡️
let CURRENT_KEY = "";

// DOM Elements
const schoolNameInput = document.getElementById("schoolName");
const eventSummaryInput = document.getElementById("eventSummary");
const thanksToInput = document.getElementById("thanksTo");
const staffContextInput = document.getElementById("staffContext");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const mansetInput = document.getElementById("mansetInput");
const galleryInput = document.getElementById("galleryInput");
const generateBtn = document.getElementById("generateBtn");
const statusMsg = document.getElementById("statusMsg");
const statusGallery = document.getElementById("statusGallery");
const galleryPreview = document.getElementById("galleryPreview");
const unifiedGallery = document.getElementById("unifiedGallery");
const headlineOutput = document.getElementById("headlineOutput");
const newsOutput = document.getElementById("newsOutput");
const igOutput = document.getElementById("igOutput");
const installBtn = document.getElementById("installBtn");
const downloadAllBtn = document.getElementById("downloadAllBtn");

let uploadedManset = null;
let uploadedGallery = [];
let processedFiles = []; // {blob, name, isManset}

// Storage Init
if (localStorage.getItem(SCHOOL_NAME_STORAGE)) schoolNameInput.value = localStorage.getItem(SCHOOL_NAME_STORAGE);
if (localStorage.getItem(THANKS_TO_STORAGE)) thanksToInput.value = localStorage.getItem(THANKS_TO_STORAGE);
if (localStorage.getItem(STAFF_CONTEXT_STORAGE)) staffContextInput.value = localStorage.getItem(STAFF_CONTEXT_STORAGE);
if (localStorage.getItem(API_KEY_STORAGE)) {
    apiKeyInput.value = localStorage.getItem(API_KEY_STORAGE);
    CURRENT_KEY = apiKeyInput.value.trim();
}

schoolNameInput.oninput = () => localStorage.setItem(SCHOOL_NAME_STORAGE, schoolNameInput.value);
thanksToInput.oninput = () => localStorage.setItem(THANKS_TO_STORAGE, thanksToInput.value);
staffContextInput.oninput = () => localStorage.setItem(STAFF_CONTEXT_STORAGE, staffContextInput.value);

saveKeyBtn.onclick = () => {
    const key = apiKeyInput.value.trim();
    if (!key) return alert("Lütfen geçerli bir API anahtarı giriniz.");
    localStorage.setItem(API_KEY_STORAGE, key);
    CURRENT_KEY = key;
    alert("API anahtarı başarıyla kaydedildi.");
};

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
const helpBtn = document.getElementById("helpBtn");
const settingsBtn = document.getElementById("settingsBtn");
const helpModal = document.getElementById("helpModal");
const settingsModal = document.getElementById("settingsModal");

function toggleModal(id, show) {
    document.getElementById(id).style.display = show ? "block" : "none";
}

helpBtn.onclick = () => toggleModal("helpModal", true);
settingsBtn.onclick = () => toggleModal("settingsModal", true);

generateBtn.onclick = async () => {
    const key = CURRENT_KEY.trim();
    if (!key) {
        toggleModal("settingsModal", true);
        return alert("Haber oluşturulabilmesi için bir API anahtarı girilmeli ve kaydedilmelidir. Sayfanın sol üstündeki ⚙️ simgesine basarak anahtarınızı kaydediniz.");
    }

    const summary = eventSummaryInput.value.trim();
    if (!summary) return alert("Haber oluşturulabilmesi için bir olay özeti girilmelidir.");

    generateBtn.disabled = true;
    statusMsg.style.display = "block";
    statusMsg.innerHTML = "İçerik profesyonel dilde analiz ediliyor... <span class='loading-dots'></span>";

    try {
        let imageData = "";
        const targetImg = uploadedManset || uploadedGallery[0];
        if (targetImg) {
            try { imageData = await blobToBase64(targetImg); } catch (e) { console.error("Görsel İşleme Hatası:", e); }
        }

        const prompt = `Sen Korkuteli Nene Hatun MTAL için çalışan profesyonel bir haber editörüsün. 
Kurum: ${schoolNameInput.value}. 
Olay Özeti: ${summary}. 
Teşekkür listesi: ${thanksToInput.value}. 
Okul Kadrosu/Veritabanı: ${staffContextInput.value}.

HABER YAZIM KURALLARI:
1. SEÇİCİ OL: Listedeki tüm isimleri yazma. Sadece olayla birebir ilgili olanları (Örn: Bilişim haberi ise Fatih PATIR, genel bir protokol ise Hüsnü ÖZEL) seç.
2. SADE VE CİDDİ OL: "Aşırı heyecanla karşılandı", "herkes hayran kaldı" gibi abartılı cümlelerden kaçın. Resmi, kurumsal ve kısa cümleler kur.
3. BAĞLAM KUR: Eğer özet çok kısaysa, okulun vizyonuna uygun profesyonel dolgu cümleleri ekle ama uydurma bilgi verme.
4. FORMAT: Yanıtını sadece şu JSON yapısında ver: {"headline": "...", "news": "...", "instagram": "..."}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`;

        const response = await fetch(url, {
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

        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        if (data.candidates && data.candidates[0]) {
            const raw = data.candidates[0].content.parts[0].text;
            const cleanJson = raw.replace(/```json|```/g, "").trim();
            const finalData = JSON.parse(cleanJson);

            headlineOutput.innerText = finalData.headline;
            newsOutput.innerText = finalData.news;
            igOutput.innerText = finalData.instagram;

            const slug = slugify(finalData.headline);
            processedFiles.forEach((f, i) => {
                f.name = f.isManset ? `${slug}-manset` : `${slug}-${i}`;
            });
            renderGallery();
            alert("İçerik başarıyla oluşturuldu.");
        } else {
            throw new Error("Sunucudan geçerli bir yanıt alınamadı.");
        }

    } catch (err) {
        alert("SİSTEM HATASI\n\nDetay: " + err.message + "\n\nÇözüm: Lütfen ağ bağlantınızı ve API ayarlarınızı kontrol ediniz.");
        const dateStr = new Date().toISOString().slice(0, 10);
        processedFiles.forEach((f, i) => {
            f.name = f.isManset ? `haber-${dateStr}-manset` : `haber-${dateStr}-${i}`;
        });
        renderGallery();
    } finally {
        generateBtn.disabled = false;
        statusMsg.style.display = "none";
    }
};

downloadAllBtn.onclick = async () => {
    if (navigator.share && navigator.canShare) {
        try {
            const filesToShare = processedFiles.map(f => new File([f.blob], `${f.name}.jpg`, { type: "image/jpeg" }));
            if (navigator.canShare({ files: filesToShare })) {
                await navigator.share({ files: filesToShare, title: 'Okul Haber Dosyaları' });
                return;
            }
        } catch (e) { }
    }
    processedFiles.forEach((f, i) => {
        setTimeout(() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(f.blob); a.download = `${f.name}.jpg`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }, i * 300);
    });
};

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
        tw = maxWidth; th = maxHeight;
        const targetRatio = tw / th;
        if (img.width / img.height > targetRatio) { sw = img.height * targetRatio; sx = (img.width - sw) / 2; }
        else { sh = img.width / targetRatio; sy = (img.height - sh) / 2; }
    } else {
        if (img.width > maxWidth || img.height > maxHeight) {
            const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
            tw = img.width * ratio; th = img.height * ratio;
        } else { tw = img.width; th = img.height; }
    }
    canvas.width = tw; canvas.height = th;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
    return new Promise(r => canvas.toBlob(b => r(b), "image/jpeg", quality));
}

function blobToBase64(blob) { return new Promise(r => { const reader = new FileReader(); reader.onloadend = () => r(reader.result); reader.readAsDataURL(blob); }); }
function copyText(id) { navigator.clipboard.writeText(document.getElementById(id).innerText); alert("Metin başarıyla kopyalandı."); }
