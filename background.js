"use strict";

const TAB_FAVICON_KEY = "favoji";
const tabOverrides = new Map();

browser.tabs.onRemoved.addListener((tabId) => {
  tabOverrides.delete(tabId);
});

browser.runtime.onMessage.addListener((message, sender) => {
  if (!message || typeof message.type !== "string") {
    return false;
  }

  switch (message.type) {
    case "favoji:get-setting":
      return getTabOverride(sender.tab && sender.tab.id);
    case "favoji:set-tab-override":
      return setTabOverride(message.tabId, message.favicon);
    case "favoji:clear-tab-override":
      return clearTabOverride(message.tabId);
    default:
      return false;
  }
});

function isEmojiFavicon(favicon) {
  return Boolean(favicon)
    && favicon.kind === "emoji"
    && typeof favicon.emoji === "string"
    && favicon.emoji.length > 0;
}

async function getTabOverride(tabId) {
  if (!Number.isInteger(tabId)) {
    return { favicon: null };
  }

  if (tabOverrides.has(tabId)) {
    return { favicon: tabOverrides.get(tabId) };
  }

  const stored = await browser.sessions.getTabValue(tabId, TAB_FAVICON_KEY);

  if (!isEmojiFavicon(stored)) {
    return { favicon: null };
  }

  tabOverrides.set(tabId, stored);
  return { favicon: stored };
}

async function setTabOverride(tabId, favicon) {
  if (!Number.isInteger(tabId)) {
    throw new Error("Missing tab id.");
  }

  if (!isEmojiFavicon(favicon)) {
    throw new Error("Missing emoji choice.");
  }

  await browser.sessions.setTabValue(tabId, TAB_FAVICON_KEY, favicon);
  tabOverrides.set(tabId, favicon);
  return { ok: true };
}

async function clearTabOverride(tabId) {
  if (!Number.isInteger(tabId)) {
    throw new Error("Missing tab id.");
  }

  await browser.sessions.removeTabValue(tabId, TAB_FAVICON_KEY);
  tabOverrides.delete(tabId);
  return { ok: true };
}
