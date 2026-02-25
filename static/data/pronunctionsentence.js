// ✅ Unlock voice in Chrome after first click
document.addEventListener("click", () => {
    if (speechSynthesis.paused) speechSynthesis.resume();
}, { once: true });

// ✅ Load friendly voices properly
let happyVoice = null, gentleVoice = null;
function loadVoices() {
    const voices = speechSynthesis.getVoices();
    happyVoice = voices.find(v => /Google\sUS\sEnglish\sFemale|Jenny|Zira/i.test(v.name)) || voices[0];
    gentleVoice = voices.find(v => /Male|Guy|Matthew/i.test(v.name)) || voices[1] || voices[0];
}
speechSynthesis.onvoiceschanged = loadVoices;

// ✅ Speak helper
function speakSentence(text, speed = 1, happy = true, onEnd=null) {
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = speed;
    u.pitch = happy ? 1.2 : 0.9;
    u.voice = happy ? happyVoice : gentleVoice;
    if (onEnd) u.onend = onEnd;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
}

// 🌈 Setup
let sentenceLevels = { easy: ["Welcome!"], medium: ["Keep learning!"], hard: ["Great effort!"] };
let currentGrade = "jr_kg";
let currentSentence = "", currentLevel = "easy", usedSentences = [], report = [], stationCount = 5;
let currentStationIndex = 0, currentSentenceIndex = 0;

const sentenceEl = document.getElementById("sentence"),
      spokenEl = document.getElementById("spoken"),
      resultEl = document.getElementById("result"),
      progressEl = document.getElementById("progress"),
      trainEl = document.getElementById("train"),
      zigzagPath = document.getElementById("zigzagPath");

// 🎯 Grade resolver
function resolveGradeKey(desired) {
    if (!window.allSentences) return null;
    const keys = Object.keys(window.allSentences);
    if (keys.includes(desired)) return desired;
    if (/^(\d+)$/.test(desired)) return "grade" + desired;
    const normalized = desired?.replace(/[- ]+/g, "_").toLowerCase();
    if (normalized && keys.includes(normalized)) return normalized;
    return null;
}

// ✅ Load grade from URL or localStorage
function applyGradeFromUrlOrStorage() {
    const urlParams = new URLSearchParams(window.location.search);
    let g = urlParams.get("grade") || localStorage.getItem("selectedGrade") || "jr_kg";
    document.getElementById("gradeTitle").innerText = "Current Grade: " + g;
    const resolved = resolveGradeKey(g);
    if (resolved && window.allSentences[resolved]) {
        currentGrade = resolved;
        sentenceLevels = window.allSentences[currentGrade];
    }
}

// 🎚 Set level
function setLevel() {
    currentLevel = document.getElementById("level").value || "easy";
    currentStationIndex = 0;
    currentSentenceIndex = 0;
    usedSentences = [];
    updateTrainToStation(currentStationIndex, true);
    nextSentence();
}

// 🚉 Next sentence
function nextSentence() {
    const pool = (sentenceLevels && sentenceLevels[currentLevel]) || ["No sentence"];
    if (currentSentenceIndex >= pool.length) currentSentenceIndex = 0;
    currentSentence = pool[currentSentenceIndex++];
    sentenceEl.innerText = currentSentence;
    spokenEl.innerText = ""; 
    resultEl.innerText = "";
    resultEl.style.display = "none"; // hide popup initially
    updateProgressDisplay();
    updateTrainToStation(currentStationIndex, true);
}

// 🧮 Similarity check
function similarity(s1, s2) {
    s1 = (s1||"").toLowerCase().trim(); s2 = (s2||"").toLowerCase().trim();
    if (!s1 || !s2) return 0;
    let match = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length); i++) if (s1[i] === s2[i]) match++;
    return (match / Math.max(s1.length, s2.length)) * 100;
}

// 🎯 Progress display
function updateProgressDisplay(message = "") {
    progressEl.style.opacity = 1;
    progressEl.style.color = "#333";
    const progressText = `🚂 Station ${currentStationIndex + 1} of ${stationCount}`;
    progressEl.innerText = message ? `${progressText}\n${message}` : progressText;
}

// 🚀 Start test
function startTest() {
    if (!currentSentence) nextSentence();
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
        resultEl.innerText = "⚠️ SpeechRecognition not supported.";
        return;
    }

    function beginListening() {
        const recognition = new Recognition();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;

        spokenEl.innerText = "";
        recognition.start();

        let stopped = false;
        const stopTimer = setTimeout(() => {
            if (!stopped) {
                try { recognition.stop(); } catch(e){}
                stopped = true;
            }
        }, 10000);

        recognition.onresult = function (e) {
            if (stopped) return;
            stopped = true;
            clearTimeout(stopTimer);

            const spoken = (e.results?.[0]?.[0]?.transcript || "").trim();
            spokenEl.innerText = "🗣 You said: " + spoken;
            const score = similarity(currentSentence, spoken).toFixed(2);
            const pass = score >= 70;
            speechSynthesis.cancel();

            if (pass) {
                resultEl.style.display = "none"; // hide any previous popup
                resultEl.innerText = "✅ Great job!";
                speakSentence("Good job! Let's go to the next station!", 1, true, () => {
                    if (currentStationIndex < stationCount - 1) {
                        currentStationIndex++;
                        updateTrainToStation(currentStationIndex);
                        updateProgressDisplay("🌟 Great job!");
                        nextSentence();
                        setTimeout(() => beginListening(), 500);
                    } else celebrateLevelComplete();
                });
            } else {
                // ❌ Show Try Again popup in center
                resultEl.innerText = "❌ Try again!";
                resultEl.style.display = "block";
                resultEl.style.position = "absolute";
                resultEl.style.top = "50%";
                resultEl.style.left = "50%";
                resultEl.style.transform = "translate(-50%, -50%)";
                resultEl.style.background = "#fff8c4";
                resultEl.style.padding = "15px 25px";
                resultEl.style.border = "2px solid #f39c12";
                resultEl.style.borderRadius = "10px";
                resultEl.style.zIndex = 9999;

                // Train wobble
                trainEl.classList.add("wobble");
                setTimeout(() => trainEl.classList.remove("wobble"), 1000);

                // Wait a moment then hide popup and restart recognition
                setTimeout(() => {
                    resultEl.style.display = "none";
                    beginListening();
                }, 1500);
            }
        };

        recognition.onerror = function() {
            stopped = true;
            resultEl.innerText = "⚠️ Speech recognition error!";
        };
    }

    beginListening();
}

// 🎉 Level complete
function celebrateLevelComplete() {
    speakSentence("Great job! Level complete!", 1, true);
    trainEl.classList.add('wobble');
    setTimeout(()=>trainEl.classList.remove('wobble'), 1200);
    setTimeout(()=>{
        currentStationIndex = 0; currentSentenceIndex = 0;
        updateTrainToStation(currentStationIndex,true);
        updateProgressDisplay("🎉 Level complete! Get ready for the next one!");
    }, 900);
}

// 🚂 Train functions
function computeStationOffsets(count){
    const path = zigzagPath, total = path.getTotalLength(), offsets=[];
    for(let i=0;i<count;i++){
        const fraction = i/(count-1);
        const pos = path.getPointAtLength(total*fraction);
        offsets.push({ fraction, x: pos.x, y: pos.y });
    }
    return { total, offsets };
}

function buildCSSPathFromSVG(samples=200){
    const path = zigzagPath, total = path.getTotalLength(), pts=[];
    for(let i=0;i<=samples;i++){
        const p = path.getPointAtLength((i/samples)*total);
        pts.push(`${p.x} ${p.y}`);
    }
    return `M ${pts.join(' L ')}`;
}

function updateTrainToStation(stationIndex, instant=false){
    stationIndex = Math.max(0, Math.min(stationCount-1, stationIndex));
    const cssPath = buildCSSPathFromSVG(240);
    trainEl.style.webkitOffsetPath = `path('${cssPath}')`;
    trainEl.style.offsetPath = `path('${cssPath}')`;

    const info = computeStationOffsets(stationCount);
    const targetFraction = info.offsets[stationIndex].fraction;
    const percent = (targetFraction*100).toFixed(2)+'%';
    const duration = 1000;

    if (instant){
        trainEl.style.transition = 'none';
        trainEl.style.webkitOffsetDistance = percent;
        trainEl.style.offsetDistance = percent;
        orientTrainAtFraction(targetFraction);
    } else {
        trainEl.style.transition = `offset-distance ${duration}ms ease-in-out, -webkit-offset-distance ${duration}ms ease-in-out`;
        trainEl.style.webkitOffsetDistance = percent;
        trainEl.style.offsetDistance = percent;
        setTimeout(()=> orientTrainAtFraction(targetFraction), 50);
    }
    updateProgressDisplay();
}

function orientTrainAtFraction(fraction){
    const path = zigzagPath;
    const total = path.getTotalLength();
    const epsilon = Math.max(1, total*0.001);
    const pos = path.getPointAtLength(total*fraction);
    const posAhead = path.getPointAtLength(Math.min(total, total*fraction+epsilon));
    const dx = posAhead.x - pos.x, dy = posAhead.y - pos.y;
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
    trainEl.style.transform = `rotate(${angleDeg}deg)`;
}

// 📄 Dummy report download
function downloadReport() {
    const blob = new Blob(["Pronunciation practice report"], {type: "text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "report.txt";
    a.click();
}

// 🚀 Init
window.addEventListener('load', ()=>{ applyGradeFromUrlOrStorage(); setLevel(); });
window.addEventListener('resize', ()=> updateTrainToStation(currentStationIndex,true));

// ✅ Expose globally
window.startTest = startTest;
window.speakSentence = speakSentence;
window.downloadReport = downloadReport;
window.setLevel = setLevel;
