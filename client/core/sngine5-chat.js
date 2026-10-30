(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FanVaultSngineChat = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const reactions = ["like", "love", "haha", "yay", "wow", "sad", "angry"];
  const text = (value, max = 20000) => typeof value === "string" ? value.slice(0, max) : "";
  const flag = value => value === true || value === 1 || value === "1";
  function id(value) {
    if (typeof value === "number" && !Number.isSafeInteger(value)) return null;
    const candidate = String(value ?? "");
    return /^[1-9]\d{0,19}$/.test(candidate) ? candidate : null;
  }
  function count(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? number : 0;
  }
  function normalizeMessage(raw) {
    if (!raw || typeof raw !== "object" || !id(raw.message_id)) throw new Error("Invalid Sngine message");
    const locked = flag(raw.needs_payment) || raw.can_get_details === false || raw.can_get_details === 0 || raw.can_get_details === "0" || (flag(raw.is_paid) && !flag(raw.can_get_details));
    const pageId = id(raw.page_id);
    const from = text(raw.user_fullname, 160) || (pageId ? "Page" : "Player");
    const result = {
      id: id(raw.message_id), conversationId: id(raw.conversation_id),
      sender: { type: pageId ? "page" : "user", id: pageId || id(raw.user_id) },
      from, meta: [from, text(raw.time, 64)].filter(Boolean).join(" · "),
      // Sngine's original-text field intentionally has this spelling. Never render its parsed HTML.
      text: locked ? "Protected message" : text(raw.message_orginal_decoded) || text(raw.message_orginal),
      locked, reply: null, attachments: [], reactions: [], call: null
    };
    if (locked) return result;
    if (raw.reply && typeof raw.reply === "object") {
      const unavailable = flag(raw.reply.unavailable);
      result.reply = { id: id(raw.reply.message_id), unavailable,
        from: unavailable ? "" : text(raw.reply.user_fullname, 160),
        text: unavailable ? "Original message unavailable" : text(raw.reply.snippet, 300) };
    }
    const media = raw.media && typeof raw.media === "object" ? raw.media : {};
    const items = Array.isArray(media.items) ? media.items : [];
    const files = Array.isArray(media.files) ? media.files : media.file ? [media.file] : [];
    for (const item of [...items, ...files, ...(media.audio ? [media.audio] : [])].slice(0, 50)) {
      if (!item || !["photo", "video", "audio", "file"].includes(item.media_type)) continue;
      // Sources/download links are deliberately withheld until an authenticated media gateway exists.
      result.attachments.push({ id: id(item.media_id), type: item.media_type,
        name: text(item.name, 200), size: count(item.size) });
    }
    for (const kind of reactions) {
      const total = count(raw.reactions?.[kind]);
      if (total) result.reactions.push({ kind, count: total });
    }
    if (raw.call && ["completed", "declined", "missed"].includes(raw.call.status)) {
      result.call = { type: flag(raw.call.is_video) ? "video" : "audio", status: raw.call.status, duration: count(raw.call.duration) };
    }
    return result;
  }
  function pagination(data, page = 0) {
    const cursor = text(data.cursor, 4096) || null;
    const hasMore = flag(data.has_more);
    return { hasMore, cursor, nextOffset: hasMore ? count(page) + 1 : null, mode: cursor ? "cursor" : "offset" };
  }
  function readMessagesPage(response, page = 0) {
    if (!response || response.status !== "success") throw new Error("Sngine request failed");
    const data = response.data || {};
    const messages = Array.isArray(data.messages) ? data.messages.map(normalizeMessage) : [];
    return { messages: mergeMessages([], messages), pagination: pagination(data, page) };
  }
  function readConversationsPage(response, page = 0) {
    if (!response || response.status !== "success" || !Array.isArray(response.data)) throw new Error("Invalid conversation response");
    // Installed apiResponse forwards has_more but drops a top-level cursor. Offset remains valid.
    return { ids: response.data.map(item => id(item.conversation_id)).filter(Boolean), pagination: pagination(response, page) };
  }
  function messageQuery({ conversationId, offset = 0, cursor = null, after = null } = {}) {
    if (!id(conversationId)) throw new Error("Conversation ID required");
    const query = new URLSearchParams({ conversation_id: id(conversationId), offset: String(count(offset)) });
    if (after !== null) {
      if (!id(after)) throw new Error("Invalid last message ID");
      query.set("last_message_id", id(after));
    } else if (cursor) query.set("cursor", text(cursor, 4096));
    // Omit last_message_id for history: an empty string would select Sngine's incremental branch.
    return query.toString();
  }
  function mergeMessages(previous, incoming) {
    const messages = new Map();
    for (const entry of [...previous, ...incoming]) {
      if (!id(entry?.id)) throw new Error("Invalid normalized message");
      messages.set(entry.id, entry);
    }
    return [...messages.values()].sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0);
  }
  return { normalizeMessage, readMessagesPage, readConversationsPage, messageQuery, mergeMessages };
});
