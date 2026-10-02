"use strict";

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

async function getTabOverride(tabId) {
  if (Number.isInteger(tabId) && tabOverrides.has(tabId)) {
    return { favicon: tabOverrides.get(tabId) };
  }

  return { favicon: null };
}

async function setTabOverride(tabId, favicon) {
  if (!Number.isInteger(tabId)) {
    throw new Error("Missing tab id.");
  }

  if (!favicon || favicon.kind !== "emoji" || typeof favicon.emoji !== "string") {
    throw new Error("Missing emoji choice.");
  }

  tabOverrides.set(tabId, favicon);
  return { ok: true };
}

async function clearTabOverride(tabId) {
  if (!Number.isInteger(tabId)) {
    throw new Error("Missing tab id.");
  }

  tabOverrides.delete(tabId);
  return { ok: true };
}
