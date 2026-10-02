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
  elements.searchInput.addEventListener("input", renderPicker);
  elements.clearTab.addEventListener("click", clearTabOverride);
}

function renderPicker() {
  const query = elements.searchInput.value.trim().toLowerCase();

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
  const results = [];

  EMOJI_CATEGORIES.forEach((category) => {
    const haystack = `${category.label} ${category.keywords}`.toLowerCase();

    if (haystack.includes(query)) {
      results.push(...category.emojis);
      return;
    }

    category.emojis.forEach((emoji) => {
      if (emoji.includes(query)) {
        results.push(emoji);
      }
    });
  });

  return [...new Set(results)];
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
