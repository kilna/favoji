"use strict";

const FAVOJI_LINK_ID = "favoji-generated-favicon";
let originalIcons = null;

browser.runtime.onMessage.addListener((message) => {
  if (!message || typeof message.type !== "string") {
    return false;
  }

  if (message.type === "favoji:apply") {
    applyFavicon(message.favicon);
    return Promise.resolve({ ok: true });
  }

  if (message.type === "favoji:restore") {
    restoreFavicon();
    return Promise.resolve({ ok: true });
  }

  return false;
});

init();

async function init() {
  try {
    const setting = await browser.runtime.sendMessage({
      type: "favoji:get-setting"
    });

    if (setting && setting.favicon) {
      applyFavicon(setting.favicon);
    }
  } catch (_error) {
    // Firefox blocks content scripts on privileged pages such as about:*.
  }
}

function applyFavicon(favicon) {
  captureOriginalIcons();
  removeGeneratedIcon();

  const link = document.createElement("link");
  link.id = FAVOJI_LINK_ID;
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = emojiToDataUrl(favicon.emoji);

  hidePageIcons();
  document.head.append(link);
}

function restoreFavicon() {
  removeGeneratedIcon();

  if (!originalIcons) {
    return;
  }

  getPageIconLinks().forEach((link) => link.remove());

  originalIcons.forEach((icon) => {
    const link = document.createElement("link");
    link.rel = icon.rel;

    if (icon.href) {
      link.href = icon.href;
    }

    if (icon.type) {
      link.type = icon.type;
    }

    if (icon.sizes) {
      link.sizes = icon.sizes;
    }

    document.head.append(link);
  });
}

function captureOriginalIcons() {
  if (originalIcons) {
    return;
  }

  originalIcons = getPageIconLinks().map((link) => ({
    rel: link.getAttribute("rel") || "icon",
    href: link.getAttribute("href") || "",
    type: link.getAttribute("type") || "",
    sizes: link.getAttribute("sizes") || ""
  }));
}

function getPageIconLinks() {
  return Array.from(document.querySelectorAll("link[rel]")).filter((link) => {
    const rel = (link.getAttribute("rel") || "").toLowerCase();
    return rel.split(/\s+/).includes("icon") && link.id !== FAVOJI_LINK_ID;
  });
}

function hidePageIcons() {
  getPageIconLinks().forEach((link) => link.remove());
}

function removeGeneratedIcon() {
  const existing = document.getElementById(FAVOJI_LINK_ID);

  if (existing) {
    existing.remove();
  }
}

function emojiToDataUrl(emoji) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="48">${escapeXml(emoji)}</text>
</svg>`.trim();

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
