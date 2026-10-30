(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FanVaultMessageView = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function appendMessage(document, parent, entry) {
    const article = document.createElement("article");
    article.className = entry.className === "system-message" ? "message system-message" : "message";
    function add(tag, className, value) {
      const node = document.createElement(tag);
      node.className = className;
      node.textContent = typeof value === "string" ? value : "";
      article.appendChild(node);
      return node;
    }
    add("span", "message-meta", entry.meta);
    if (entry.reply) add("blockquote", "message-reply", [entry.reply.from, entry.reply.text].filter(Boolean).join(": "));
    add("p", "message-text", entry.text);
    const match = typeof entry.text === "string" && entry.text.match(/https?:\/\/\S+/i);
    if (match) {
      try {
        const url = new URL(match[0]);
        if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) {
          const link = add("a", "link-preview", url.href);
          link.href = url.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
      } catch (_error) { /* Invalid links remain plain text. */ }
    }
    if (entry.call) add("p", "message-detail", `${entry.call.type === "video" ? "Video" : "Audio"} call · ${entry.call.status} · ${entry.call.duration}s`);
    for (const attachment of entry.attachments || []) {
      add("p", "message-detail", `${attachment.type} attachment${attachment.name ? ` · ${attachment.name}` : ""} · preview/download not connected`);
    }
    if (entry.reactions?.length) add("p", "message-detail", entry.reactions.map(r => `${r.kind}: ${r.count}`).join(" · "));
    // Plain text, reply snippets and file names are never interpreted as server-generated HTML.
    parent.appendChild(article);
    return article;
  }
  return { appendMessage };
});
