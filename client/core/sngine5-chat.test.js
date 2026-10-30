const test = require("node:test");
const assert = require("node:assert/strict");
const chat = require("./sngine5-chat");
const { appendMessage } = require("./message-view");
const message = overrides => ({ message_id: "10", conversation_id: "2", user_id: "3", user_fullname: "Test Player", message_orginal_decoded: "Hello", ...overrides });

test("preserves plain original text, replies and page identity without leaking the replying administrator", () => {
  const result = chat.normalizeMessage(message({ page_id: "4", user_fullname: "Test Page", sender_fullname: "Private Admin", message: '<img src=x onerror="alert(1)">', reply: { message_id: "9", user_fullname: "Player", snippet: "Earlier text" } }));
  assert.equal(result.text, "Hello");
  assert.deepEqual(result.sender, { type: "page", id: "4" });
  assert.equal(result.from, "Test Page");
  assert.equal(result.reply.text, "Earlier text");
  assert.ok(!JSON.stringify(result).includes("Private Admin"));
  assert.ok(!JSON.stringify(result).includes("onerror"));
});

test("recognises all attachment types as metadata without loading private sources", () => {
  const result = chat.normalizeMessage(message({ media: { items: [{ media_type: "photo", source: "private-photo" }, { media_type: "video", source: "private-video" }], files: [{ media_type: "file", name: "route.txt", size: "100", source: "private-file" }], audio: { media_type: "audio", source: "private-audio" } } }));
  assert.deepEqual(result.attachments.map(a => a.type), ["photo", "video", "file", "audio"]);
  assert.equal(result.attachments[2].size, 100);
  assert.ok(!JSON.stringify(result).includes("private-"));
});

test("locked messages cannot restore legacy media or expose reply content", () => {
  for (const lock of [{ needs_payment: "1" }, { can_get_details: "0" }, { is_paid: "1" }]) {
    const result = chat.normalizeMessage(message({ ...lock, image: "private", message_orginal_decoded: "secret", reply: { snippet: "secret" }, media: { items: [{ media_type: "photo", source: "private" }] } }));
    assert.equal(result.locked, true);
    assert.deepEqual(result.attachments, []);
    assert.ok(!JSON.stringify(result).includes("secret"));
    assert.ok(!JSON.stringify(result).includes("private"));
  }
});

test("unavailable replies, reactions and logged calls have bounded display data", () => {
  const result = chat.normalizeMessage(message({ reply: { unavailable: "1", snippet: "hidden", user_fullname: "hidden" }, reactions: { like: "2", love: -4, arbitrary: 99 }, call: { is_video: false, status: "missed", duration: "0", to_user_fullname: "not forwarded" } }));
  assert.equal(result.reply.text, "Original message unavailable");
  assert.equal(result.reply.from, "");
  assert.deepEqual(result.reactions, [{ kind: "like", count: 2 }]);
  assert.deepEqual(result.call, { type: "audio", status: "missed", duration: 0 });
});

test("message history uses data.cursor; conversation list falls back to offset when cursor is omitted", () => {
  const history = chat.readMessagesPage({ status: "success", data: { messages: [message()], cursor: "opaque-cursor", has_more: true } });
  assert.equal(history.pagination.mode, "cursor");
  assert.equal(history.pagination.cursor, "opaque-cursor");
  const conversations = chat.readConversationsPage({ status: "success", data: [{ conversation_id: "2" }], has_more: true }, 3);
  assert.equal(conversations.pagination.mode, "offset");
  assert.equal(conversations.pagination.nextOffset, 4);
  const empty = chat.readMessagesPage({ status: "success", data: [] });
  assert.deepEqual(empty.messages, []);
  assert.equal(empty.pagination.hasMore, false);
});

test("history query omits last_message_id rather than sending an empty string", () => {
  const history = new URLSearchParams(chat.messageQuery({ conversationId: "2", cursor: "a+b/=" }));
  assert.equal(history.has("last_message_id"), false);
  assert.equal(history.get("cursor"), "a+b/=");
  const updates = new URLSearchParams(chat.messageQuery({ conversationId: "2", after: "10", cursor: "ignored" }));
  assert.equal(updates.get("last_message_id"), "10");
  assert.equal(updates.has("cursor"), false);
  assert.throws(() => chat.messageQuery({ conversationId: "2", after: "" }));
});

test("overlapping history pages merge chronologically without precision loss or duplicates", () => {
  const first = chat.normalizeMessage(message({ message_id: "9007199254740993" }));
  const earlier = chat.normalizeMessage(message({ message_id: "9007199254740992" }));
  const updated = { ...first, text: "Updated" };
  const merged = chat.mergeMessages([first], [earlier, updated]);
  assert.deepEqual(merged.map(m => m.id), [earlier.id, first.id]);
  assert.equal(merged[1].text, "Updated");
  assert.throws(() => chat.normalizeMessage(message({ message_id: Number.MAX_SAFE_INTEGER + 1 })));
  assert.throws(() => chat.readMessagesPage({ status: "error", message: "private error detail" }));
});

function domNode(tag) {
  return { tag, children: [], textContent: "", appendChild(child) { this.children.push(child); },
    set innerHTML(_value) { throw new Error("HTML injection is forbidden"); } };
}
test("renderer treats message, reply and attachment names as text and never autoloads media", () => {
  const document = { createElement: domNode };
  const parent = domNode("div");
  const entry = chat.normalizeMessage(message({ message_orginal_decoded: '<img src=x onerror="alert(1)">', reply: { snippet: "<script>bad</script>" }, media: { files: [{ media_type: "file", name: "<b>route.txt</b>" }] } }));
  const article = appendMessage(document, parent, entry);
  assert.ok(article.children.some(n => n.textContent === entry.text));
  assert.ok(article.children.some(n => n.textContent.includes("<b>route.txt</b>")));
  assert.ok(!article.children.some(n => ["img", "video", "audio", "iframe", "script"].includes(n.tag)));
});
