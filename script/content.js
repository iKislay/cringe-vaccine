function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.sync.get("geminiApiKey", (data) => {
            if (data.geminiApiKey) {
                resolve(data.geminiApiKey);
            } else {
                console.warn("Gemini API key not found. Please set your API key in the extension settings.");
                resolve(null);
            }
        });
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function initExtension() {

    const apiKey = await getApiKey();
    if (!apiKey) {
        console.warn("GROQ API key not found. Please set your API key in the extension settings.");
        return; // Stop execution if no API key
    }

    cringeVaccineExistingPosts();
    observeNewPosts();
}

function cringeVaccineThisPost(post) {
    const parentDiv = post.closest('.feed-shared-update-v2__control-menu-container');

    if (parentDiv) {
        const wrapper = document.createElement('div');
        while (parentDiv.firstChild) {
            wrapper.appendChild(parentDiv.firstChild);
        }

        wrapper.style.filter = 'blur(10px)';
        wrapper.style.transition = 'all 0.3s ease';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.position = 'relative';
        wrapper.style.opacity = '0.95';

        parentDiv.style.position = 'relative';

        const button = document.createElement('button');
        button.innerText = 'Click to View';
        button.style.position = 'absolute';
        button.style.top = '50%';
        button.style.left = '50%';
        button.style.transform = 'translate(-50%, -50%)';
        button.style.zIndex = '10';
        button.style.backgroundColor = '#0a66c2';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.padding = '12px 24px';
        button.style.fontSize = '14px';
        button.style.borderRadius = '24px';
        button.style.cursor = 'pointer';
        button.style.fontWeight = '600';
        button.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
        button.style.transition = 'all 0.2s ease';

        button.onmouseover = () => {
            button.style.backgroundColor = '#004182';
            button.style.boxShadow = '0 0 12px rgba(0,0,0,0.15)';
        };

        button.onmouseout = () => {
            button.style.backgroundColor = '#0a66c2';
            button.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
        };

        button.addEventListener('click', () => {
            wrapper.style.filter = '';
            wrapper.style.opacity = '1';
            button.style.display = 'none';
        });

        parentDiv.appendChild(wrapper);
        parentDiv.appendChild(button);
    }
}

async function checkForCringe(post) {
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    const apiKey = await getApiKey();
    if (!apiKey) return; // Stop execution if no API key

    const SYSTEM_PROMPT_PREFIX = `
        You are a LinkedIn post analyzer. Your job is to determine if a post meets the following criteria:
    `;

    const POST_CRITERIA = `
        - Selling a course while using an unrelated emotional story as bait.
        - Overly emotional or exaggerated stories with no clear tech-related insights.
        - Motivational quotes or "life lessons" that lack direct relevance to professional growth in tech.
        - Political or social commentary unrelated to professional or technical development.
        - Personal updates (vacations, family pictures) without any professional or tech-related context.
        - Asking users to comment "interested" for job opportunities instead of providing direct value.
        - Encouraging users to "tag 3 people" or "like if you agree" without meaningful discussion.
        - Any form of brand promotion, direct ads, or affiliate marketing disguised as content.
        - Generic career advice like "Never give up" without actionable insights, tools, or frameworks.
        - Viral memes, irrelevant trends, or low-effort content that lacks professional or technical relevance.
        - AI-generated (LLM-written) posts that lack originality or personal touch.
        - Bragging disguised as "humble reflections" (a.k.a. humblebragging).
        - Overly personal content (TMI) that does not contribute to professional discussions.
        - Unprofessional emotional displays that do not align with workplace etiquette.
        - Misleading or out-of-context information that lacks sources or technical accuracy.
        - Forced or artificial inspiration that exaggerates personal achievements or industry trends.
    `;


    const prompt = `${SYSTEM_PROMPT_PREFIX} ${POST_CRITERIA}
        If any of the above criteria are met, the post should be considered cringe-worthy. 
        Analyze this post and respond ONLY with "true" if the post is cringe-worthy or "false" if it is not. No other explanation needed.
    `;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: prompt }] },
                    { role: "user", parts: [{ text: post.innerText.trim() }] }
                ]
            })
        });

        const data = await response.json();
        const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        const isCringe = textResponse.toLowerCase().includes("true");
        if (isCringe) {
            cringeVaccineThisPost(post);
        }
        return isCringe;
    } catch (error) {
        console.error("Error checking post:", error);
        return false;
    }
}


const debouncedCheckForCringe = debounce(checkForCringe, 1000);

function cringeVaccineExistingPosts() {
    const posts = document.querySelectorAll('.update-components-update-v2__commentary');
    for (const post of posts) {
        debouncedCheckForCringe(post);
    }
}

function observeNewPosts() {
    const alreadyProcessedPosts = new Set();

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const posts = node.querySelectorAll('.update-components-update-v2__commentary');
                        for (const post of posts) {
                            if (!alreadyProcessedPosts.has(post)) {
                                alreadyProcessedPosts.add(post);
                                checkForCringe(post);
                            }
                        }
                    }
                });
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

initExtension();
