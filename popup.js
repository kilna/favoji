/* global EMOJI_CATEGORIES, EMOJI_KEYWORDS */
"use strict";

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  buildCategoryList();
  bindEvents();
  renderPicker();
});

function cacheElements() {
  elements.searchInput = document.getElementById("search-input");
  elements.searchResults = document.getElementById("search-results");
  elements.categoryList = document.getElementById("category-list");
  elements.clearTab = document.getElementById("clear-tab");
  elements.status = document.getElementById("status");
}

function buildCategoryList() {
  EMOJI_CATEGORIES.forEach((category) => {
    const section = document.createElement("section");
    section.className = "category-section";

    const heading = document.createElement("h2");
    heading.textContent = category.label;

    const grid = document.createElement("div");
    grid.className = "emoji-grid";
    renderEmojiGrid(grid, category.emojis);

    section.append(heading, grid);
    elements.categoryList.append(section);
  });
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    renderPicker(event.currentTarget.value);
  });
  elements.clearTab.addEventListener("click", clearTabOverride);
}

function renderPicker(rawValue) {
  const query = String(rawValue ?? elements.searchInput.value).trim().toLowerCase();

  if (query) {
    elements.categoryList.hidden = true;
    elements.searchResults.hidden = false;
    renderEmojiGrid(elements.searchResults, searchEmojis(query));
    return;
  }

  elements.categoryList.hidden = false;
  elements.searchResults.hidden = true;
}

function renderEmojiGrid(container, emojis) {
  container.replaceChildren();

  if (!emojis.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No emojis match that search.";
    container.append(empty);
    return;
  }

  emojis.forEach((emoji) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emoji-choice";
    button.textContent = emoji;
    button.setAttribute("aria-label", `Use ${emoji}`);
    button.addEventListener("click", () => applyEmoji(emoji));
    container.append(button);
  });
}

function searchEmojis(query) {
  const terms = query.replace(/[_-]+/g, " ").split(/\s+/).filter(Boolean);
  const matches = [];
  const seen = new Set();

  EMOJI_CATEGORIES.forEach((category) => {
    const label = category.label.toLowerCase();
    const labelMatch = terms.length === 1 && categoryLabelMatches(label, terms[0]);

    category.emojis.forEach((emoji) => {
      if (seen.has(emoji)) {
        return;
      }

      const keywords = emojiKeywords(emoji);
      const keywordMatch = terms.every((term) => keywordIncludes(keywords, emoji, term));

      if (!keywordMatch && !labelMatch) {
        return;
      }

      seen.add(emoji);
      matches.push({
        emoji,
        rank: keywordMatch ? keywordRank(keywords, terms) : 3
      });
    });
  });

  matches.sort((left, right) => left.rank - right.rank);
  return matches.map((match) => match.emoji);
}

function emojiKeywords(emoji) {
  if (typeof EMOJI_KEYWORDS === "undefined") {
    return "";
  }

  return (EMOJI_KEYWORDS[emoji] || "").replace(/[_-]+/g, " ");
}

function categoryLabelMatches(label, term) {
  return label.startsWith(term) && label.length - term.length <= 1;
}

function keywordIncludes(keywords, emoji, term) {
  if (emoji.includes(term)) {
    return true;
  }

  return keywords.split(/\s+/).some((word) => wordMatches(word, term));
}

function keywordRank(keywords, terms) {
  const words = keywords.split(/\s+/).filter(Boolean);

  if (terms.every((term) => words.includes(term))) {
    return 0;
  }

  if (terms.every((term) => words.some((word) => word.startsWith(term)))) {
    return 1;
  }

  return 2;
}

function wordMatches(word, term) {
  if (word.startsWith(term)) {
    return true;
  }

  // "smile" matches "smiling" — the trailing e is dropped.
  if (term.length >= 4 && term.endsWith("e")) {
    const stem = term.slice(0, -1);

    if (word.startsWith(stem) && /^(ing|ed|er|y)/.test(word.slice(stem.length))) {
      return true;
    }
  }

  // "grin" matches "grinning".
  if (term.length >= 3) {
    const doubled = term + term[term.length - 1];
    return word.startsWith(doubled) && /^(ing|ed)/.test(word.slice(doubled.length));
  }

  return false;
}

async function applyEmoji(emoji) {
  const tab = await getActiveTab();

  if (!tab || !Number.isInteger(tab.id)) {
    setStatus("No active tab found.");
    return;
  }

  const favicon = { kind: "emoji", emoji };

  try {
    await browser.runtime.sendMessage({
      type: "favoji:set-tab-override",
      tabId: tab.id,
      favicon
    });
    await sendTabMessage(tab.id, { type: "favoji:apply", favicon });
    setStatus(`Applied ${emoji} to this tab.`);
  } catch (error) {
    setStatus(`Could not update this tab: ${error.message}`);
  }
}

async function clearTabOverride() {
  const tab = await getActiveTab();

  if (!tab || !Number.isInteger(tab.id)) {
    setStatus("No active tab found.");
    return;
  }

  try {
    await browser.runtime.sendMessage({
      type: "favoji:clear-tab-override",
      tabId: tab.id
    });
    await sendTabMessage(tab.id, { type: "favoji:restore" });
    setStatus("Restored original favicon.");
  } catch (error) {
    setStatus(`Could not restore this tab: ${error.message}`);
  }
}

async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function sendTabMessage(tabId, message) {
  try {
    return await browser.tabs.sendMessage(tabId, message);
  } catch (_error) {
    try {
      await browser.tabs.executeScript(tabId, { file: "content.js" });
      return await browser.tabs.sendMessage(tabId, message);
    } catch (_retryError) {
      throw new Error("Favoji cannot run on this page.");
    }
  }
}

function setStatus(message) {
  elements.status.textContent = message;
}
