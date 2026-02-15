// =======================
// VALIDATORS
// =======================

// FORMAT: PASSAGE;QUESTION;ANSWER
function isTextExtractFormat(input) {
    if (typeof input !== "string") return false;
    const regex = /^[^;\n]+;[^;\n]+;[^;\n]+$/;
    return regex.test(input);
}

// FORMAT: PASSAGE;STATEMENT1|STATEMENT2|STATEMENT3;INDEX
function isTwoTruthsFormat(input) {
    if (typeof input !== "string") return false;
    const regex = /^[^;\n]+;[^|\n]+\|[^|\n]+\|[^|\n]+;[0-2]$/;
    return regex.test(input);
}

// FORMAT: PASSAGE;STATEMENT1|STATEMENT2|STATEMENT3;INDEX|EVIDENCE
function isStatementScrutinizeFormat(input) {
    if (typeof input !== "string") return false;
    const regex = /^[^;\n]+;[^|\n]+\|[^|\n]+\|[^|\n]+;[0-2]\|[^;\n]+$/;
    return regex.test(input);
}

// =======================
// CONFIG
// =======================

const baseURL = "https://stellar-backend-ki78.onrender.com";

// =======================
// ELEMENT REFERENCES
// =======================

const container = document.getElementById("questionsContainer");
const generateBtn = document.getElementById("generateBtn");
const submitSelectedBtn = document.getElementById("submitSelectedBtn");
const discardSelectedBtn = document.getElementById("discardSelectedBtn");
const promptInput = document.getElementById("textPrompt");

// =======================
// AUTO-EXPAND TEXTAREA
// =======================

promptInput.addEventListener("input", () => {
    promptInput.style.height = "auto";
    promptInput.style.height = promptInput.scrollHeight + "px";
});

// =======================
// GAME ID MAPPING
// =======================

function getGameID(mode) {
    if (mode === "Extract") return "TEST-01";
    if (mode === "Truth") return "TEST-02";
    if (mode === "Scrutinize") return "TEST-03";
}

const loadingIndicator = document.getElementById("loadingIndicator");

function getTrashIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
}

// =======================
// GENERATE QUESTIONS
// =======================

generateBtn.addEventListener("click", async () => {
    const textPrompt = promptInput.value.trim();
    if (!textPrompt) return;

    const gameMode = document.querySelector("input[name='gamemode']:checked").value;
    const countInput = document.getElementById("questionCount");
    const targetCount = Math.min(parseInt(countInput.value, 10) || 1, 25);

    generateBtn.disabled = true;
    loadingIndicator.style.display = "block";

    const basePrompt = `Generate exactly ONE question in strict format. Content: ${textPrompt}`;
    const messages = [{ role: "user", content: basePrompt }];

    let acceptedCount = 0;
    let safetyCounter = 0;

    while (acceptedCount < targetCount && safetyCounter < targetCount * 3) {
        safetyCounter++;

        try {
            const response = await fetch(`${baseURL}/api/model/generate-question`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: gameMode, messages })
            });

            const data = await response.json();
            const output = data.output?.trim();
            if (!output) break;

            messages.push({ role: "assistant", content: output });

            let isValid = false;
            if (gameMode === "Extract") isValid = isTextExtractFormat(output);
            if (gameMode === "Truth") isValid = isTwoTruthsFormat(output);
            if (gameMode === "Scrutinize") isValid = isStatementScrutinizeFormat(output);

            if (!isValid) {
                messages.push({ role: "user", content: "Another" });
                continue;
            }

            renderCard(output, gameMode);
            acceptedCount++;
            messages.push({ role: "user", content: "Another" });
        } catch (e) {
            console.error(e);
            break;
        }
    }

    loadingIndicator.style.display = "none";
    generateBtn.disabled = false;
});

function renderCard(output, gameMode) {
    const [passage, questionPart, answerPart] = output.split(";");
    const card = document.createElement("div");
    card.className = "question-card";
    card.dataset.gameID = getGameID(gameMode);
    card.dataset.gameMode = gameMode;

    const isExtract = gameMode === "Extract";

    const displayModeName = gameMode === "Extract"
        ? "Text Extract"
        : gameMode === "Truth"
            ? "Two Truths"
            : "Statement Scrutinize";

    const labels = {
        passage: "Text Passage",
        challenge: isExtract ? "Question" : "Statements",
        answer: isExtract ? "Answer" : "Correct Answer"
    };

    let questionHTML = questionPart;
    let answerHTML = answerPart;

    if (!isExtract) {
        const statements = questionPart.split("|");
        const answerSegments = answerPart.split("|");
        const lieIndex = parseInt(answerSegments[0], 10);

        questionHTML = `<ul class="statement-list">` +
            statements.map((s, i) => `
                <li class="statement-item ${i === lieIndex ? 'is-lie' : ''}">
                    <strong>${i}.</strong> ${s}
                </li>`).join("") + `</ul>`;

        if (gameMode === "Scrutinize") {
            const evidence = answerSegments[1] || "";
            answerHTML = `
                <span class="answer-badge">Index: ${lieIndex}</span>
                <div class="evidence-box"><strong>Evidence:</strong> ${evidence}</div>
            `;
        } else {
            answerHTML = `<span class="answer-badge">Index: ${lieIndex}</span>`;
        }
    }

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span class="gamemode-label gamemode-${gameMode.toLowerCase()}">${displayModeName}</span>
            <input type="checkbox" class="select-question" checked style="width:24px; height:24px; cursor:pointer;" />
        </div>
        
        <div class="section"><strong>${labels.passage}</strong>${passage}</div>
        <div class="section"><strong>${labels.challenge}</strong>${questionHTML}</div>
        <div class="section"><strong>${labels.answer}</strong>${answerHTML}</div>

        <button class="trash-btn" title="Discard">${getTrashIcon()}</button>
        <div class="raw-data" style="display:none;"></div>
    `;

    container.appendChild(card);
    
    // Store raw data on the element to avoid HTML attribute escaping issues
    const rawDataElement = card.querySelector(".raw-data");
    rawDataElement.dataset.rawData = JSON.stringify({
        passage: passage,
        question: questionPart,
        answer: answerPart
    });
    
    card.querySelector(".trash-btn").addEventListener("click", () => card.remove());
}

// =======================
// SUBMIT SELECTED QUESTIONS
// =======================

submitSelectedBtn.addEventListener("click", async () => {
    const cards = Array.from(container.children);

    for (const card of cards) {
        const checked = card.querySelector(".select-question").checked;
        if (!checked) continue;

        const rawDataElement = card.querySelector(".raw-data");
        const raw = JSON.parse(rawDataElement.dataset.rawData);

        await fetch(`${baseURL}/api/game/create-question`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                gameID: card.dataset.gameID,
                textPrompt: raw.passage,
                question: raw.question,
                answer: raw.answer,
                genre: "Test",
                gameMode: card.dataset.gameMode
            })
        });

        card.remove();
    }
});

// =======================
// DISCARD SELECTED QUESTIONS
// =======================

discardSelectedBtn.addEventListener("click", () => {
    const cards = Array.from(container.children);

    cards.forEach(card => {
        const checked = card.querySelector(".select-question").checked;
        if (checked) card.remove();
    });
});