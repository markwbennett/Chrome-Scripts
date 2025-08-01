function getBodyBgColor() {
    let el = document.body;
    let bg;
    while (el && (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
        bg = window.getComputedStyle(el).backgroundColor;
        el = el.parentElement;
    }
    return bg || 'rgb(255,255,255)';
}
function getBodyTextColor() {
    let el = document.body;
    let color;
    while (el && (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent')) {
        color = window.getComputedStyle(el).color;
        el = el.parentElement;
    }
    return color || 'rgb(0,0,0)';
}
function getLuminance(r, g, b) {
    const a = [r, g, b].map(function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function parseRGB(str) {
    const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return [255,255,255];
    return [parseInt(m[1],10), parseInt(m[2],10), parseInt(m[3],10)];
}

let currentFontWeight = 500;

function runHighContrast() {
    const bg = getBodyBgColor();
    const text = getBodyTextColor();
    const [br, bg_, bb] = parseRGB(bg);
    const [tr, tg, tb] = parseRGB(text);
    const bgLum = getLuminance(br, bg_, bb);
    const textLum = getLuminance(tr, tg, tb);
    let newBg, newText;
    if (textLum < bgLum) {
        newBg = '#FFFFFF';
        newText = '#000000';
    } else {
        newBg = '#000000';
        newText = '#FFFFFF';
    }
    document.body.style.backgroundColor = newBg;
    document.body.style.color = newText;
    // Set font weight to currentFontWeight for all elements in body
    function enforceFontWeight(node) {
        if (node.nodeType === 1) { // Element
            node.style.fontWeight = currentFontWeight;
            for (let i = 0; i < node.children.length; i++) {
                enforceFontWeight(node.children[i]);
            }
        }
    }
    enforceFontWeight(document.body);
}

function clearHighContrast() {
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
    function clearFontWeight(node) {
        if (node.nodeType === 1) {
            node.style.fontWeight = '';
            for (let i = 0; i < node.children.length; i++) {
                clearFontWeight(node.children[i]);
            }
        }
    }
    clearFontWeight(document.body);
}

function checkAndRun() {
    const siteKey = 'hc-disable-' + location.hostname;
    const weightKey = 'hc-weight-' + location.hostname;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([siteKey, weightKey], function(result) {
            currentFontWeight = result[weightKey] || 500;
            if (result[siteKey]) {
                clearHighContrast();
            } else {
                runHighContrast();
            }
        });
    } else {
        runHighContrast();
    }
}

checkAndRun();

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
        if (msg && msg.type === 'HC_TOGGLE') {
            if (msg.disabled) {
                clearHighContrast();
            } else {
                runHighContrast();
            }
        }
        if (msg && msg.type === 'HC_WEIGHT') {
            currentFontWeight = msg.weight || 500;
            runHighContrast();
        }
    });
} 