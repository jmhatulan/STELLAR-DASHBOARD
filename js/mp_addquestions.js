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

// =======================
// GENERATE QUESTIONS
// =======================

generateBtn.addEventListener("click", async () => {
    const textPrompt = promptInput.value.trim();
    if (!textPrompt) return;

    const gameMode = document.querySelector("input[name='gamemode']:checked").value;
    const countInput = document.getElementById("questionCount");
    const targetCount = Math.min(parseInt(countInput.value, 10) || 1, 25);

    const basePrompt = `
Generate exactly ONE question in strict format.
The content must be based on the following input:

${textPrompt}
    `.trim();

    const messages = [{ role: "user", content: basePrompt }];

    let acceptedCount = 0;
    let safetyCounter = 0;

    while (acceptedCount < targetCount && safetyCounter < targetCount * 3) {
        safetyCounter++;

        const response = await fetch(`${baseURL}/api/model/generate-question`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: gameMode,
                messages
            })
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
            console.log("Rejected output:", output);
            messages.push({ role: "user", content: "Another" });
            continue;
        }

        const [passage, question, answer] = output.split(";");

        const card = document.createElement("div");
        card.className = "question-card";
        card.dataset.gameMode = gameMode;
        card.dataset.gameID = getGameID(gameMode);

        card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="gamemode-label gamemode-${gameMode.toLowerCase()}">
                ${gameMode === "Extract"
                ? "Text Extract"
                : gameMode === "Truth"
                    ? "Two Truths"
                    : "Statement Scrutinize"}
            </span>

            <div>
                <input type="checkbox" class="select-question" />
                <button class="discard-btn">Discard</button>
            </div>
        </div>

        <div class="section"><strong>Text Prompt</strong><br />${passage}</div>
        <div class="section"><strong>Question</strong><br />${question}</div>
        <div class="section"><strong>Answer</strong><br />${answer}</div>
        `;

        container.appendChild(card);
        acceptedCount++;

        card.querySelector(".discard-btn").addEventListener("click", () => {
            card.remove();
        });

        messages.push({ role: "user", content: "Another" });
    }
});

// =======================
// SUBMIT SELECTED QUESTIONS
// =======================

submitSelectedBtn.addEventListener("click", async () => {
    const cards = Array.from(container.children);

    for (const card of cards) {
        const checked = card.querySelector(".select-question").checked;
        if (!checked) continue;

        const sections = card.querySelectorAll(".section");
        const textPrompt = sections[0].innerText.replace("Text Prompt", "").trim();
        const question = sections[1].innerText.replace("Question", "").trim();
        const answer = sections[2].innerText.replace("Answer", "").trim();

        await fetch(`${baseURL}/api/game/create-question`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                gameID: card.dataset.gameID,
                textPrompt,
                question,
                answer,
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