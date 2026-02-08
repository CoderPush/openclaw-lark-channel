/**
 * LarkClient Tests – verifies reply vs create endpoint selection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LarkClient } from '../src/client.js';

// Spy targets – we replace sdk.im.v1.message.{create,reply} after construction
function makeMockClient() {
  const client = new LarkClient({
    appId: 'test-app',
    appSecret: 'test-secret',
    domain: 'lark',
  });

  const createSpy = vi.fn().mockResolvedValue({ data: { message_id: 'new_msg_1' } });
  const replySpy = vi.fn().mockResolvedValue({ data: { message_id: 'reply_msg_1' } });

  // Patch the internal SDK methods
  const sdk = (client as unknown as { sdk: { im: { v1: { message: Record<string, unknown> } } } }).sdk;
  sdk.im.v1.message.create = createSpy;
  sdk.im.v1.message.reply = replySpy;

  return { client, createSpy, replySpy };
}

describe('LarkClient send methods', () => {
  let client: LarkClient;
  let createSpy: ReturnType<typeof vi.fn>;
  let replySpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ({ client, createSpy, replySpy } = makeMockClient());
  });

  describe('without rootId (new message)', () => {
    it('sendText uses message.create', async () => {
      const result = await client.sendText('chat_1', 'hello');
      expect(createSpy).toHaveBeenCalledOnce();
      expect(replySpy).not.toHaveBeenCalled();
      expect(createSpy.mock.calls[0][0]).toMatchObject({
        params: { receive_id_type: 'chat_id' },
        data: { receive_id: 'chat_1', msg_type: 'text' },
      });
      expect(result).toEqual({ success: true, messageId: 'new_msg_1' });
    });

    it('sendCard uses message.create', async () => {
      const card = { header: { title: { tag: 'plain_text', content: 'Test' } } };
      const result = await client.sendCard('chat_1', card as any);
      expect(createSpy).toHaveBeenCalledOnce();
      expect(replySpy).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('with rootId (threaded reply)', () => {
    it('sendText uses message.reply with rootId as path.message_id', async () => {
      const result = await client.sendText('chat_1', 'reply text', { rootId: 'om_root_123' });
      expect(replySpy).toHaveBeenCalledOnce();
      expect(createSpy).not.toHaveBeenCalled();
      expect(replySpy.mock.calls[0][0]).toMatchObject({
        path: { message_id: 'om_root_123' },
        data: { msg_type: 'text' },
      });
      expect(result).toEqual({ success: true, messageId: 'reply_msg_1' });
    });

    it('sendCard uses message.reply', async () => {
      const card = { header: { title: { tag: 'plain_text', content: 'Reply' } } };
      const result = await client.sendCard('chat_1', card as any, { rootId: 'om_root_456' });
      expect(replySpy).toHaveBeenCalledOnce();
      expect(createSpy).not.toHaveBeenCalled();
      expect(replySpy.mock.calls[0][0].path).toEqual({ message_id: 'om_root_456' });
      expect(result.success).toBe(true);
    });

    it('sendPost uses message.reply', async () => {
      const result = await client.sendPost('chat_1', { content: [] }, { rootId: 'om_root_789' });
      expect(replySpy).toHaveBeenCalledOnce();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('sendImage uses message.reply', async () => {
      const result = await client.sendImage('chat_1', 'img_key_1', { rootId: 'om_root_abc' });
      expect(replySpy).toHaveBeenCalledOnce();
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('trims whitespace-only rootId and falls back to create', async () => {
      await client.sendText('chat_1', 'hello', { rootId: '   ' });
      expect(createSpy).toHaveBeenCalledOnce();
      expect(replySpy).not.toHaveBeenCalled();
    });

    it('trims rootId with whitespace', async () => {
      await client.sendText('chat_1', 'hello', { rootId: ' om_root_123 ' });
      expect(replySpy).toHaveBeenCalledOnce();
      expect(replySpy.mock.calls[0][0].path).toEqual({ message_id: 'om_root_123' });
    });

    it('undefined rootId uses create', async () => {
      await client.sendText('chat_1', 'hello', { rootId: undefined });
      expect(createSpy).toHaveBeenCalledOnce();
      expect(replySpy).not.toHaveBeenCalled();
    });
  });
});

describe('LarkClient parsePostContent', () => {
  let client: LarkClient;

  beforeEach(() => {
    client = new LarkClient({ appId: 'test', appSecret: 'test', domain: 'lark' });
  });

  it('should extract @mention display names from at tags', () => {
    const content = JSON.stringify({
      content: [[
        { tag: 'text', text: 'Tech lead ' },
        { tag: 'at', user_name: 'Si Huynh', user_id: 'ou_111' },
        { tag: 'text', text: ' ' },
        { tag: 'at', user_name: 'Hao Doan', user_id: 'ou_222' },
        { tag: 'text', text: ' please review' },
      ]],
    });
    const { texts } = client.parsePostContent(content);
    expect(texts.join(' ')).toBe('Tech lead  @Si Huynh   @Hao Doan  please review');
  });

  it('should handle mixed text, at, and link tags', () => {
    const content = JSON.stringify({
      content: [[
        { tag: 'text', text: 'Hello ' },
        { tag: 'at', user_name: 'Harley', user_id: 'ou_333' },
        { tag: 'text', text: ' check ' },
        { tag: 'a', text: 'this link', href: 'https://example.com' },
      ]],
    });
    const { texts } = client.parsePostContent(content);
    expect(texts).toEqual(['Hello ', '@Harley', ' check ', '[this link](https://example.com)']);
  });

  it('should handle at tags without user_name', () => {
    const content = JSON.stringify({
      content: [[
        { tag: 'at', user_id: 'ou_111' },
        { tag: 'text', text: ' hello' },
      ]],
    });
    const { texts } = client.parsePostContent(content);
    expect(texts).toEqual([' hello']);
  });
});

describe('LarkClient thread context', () => {
  const originalFetch = globalThis.fetch;
  let fetchSpy: ReturnType<typeof vi.fn>;

  function makeThreadClient() {
    const client = new LarkClient({ appId: 'test', appSecret: 'test', domain: 'lark' });
    const sdk = (client as unknown as { sdk: { im: { v1: { message: Record<string, unknown> } } } }).sdk;

    const getSpy = vi.fn();
    sdk.im.v1.message.get = getSpy;

    // Mock getTenantToken to return a token
    (client as any).tokenCache = { token: 'test-token', expireTime: Date.now() / 1000 + 3600 };

    return { client, getSpy };
  }

  beforeEach(() => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('getMessage returns parsed message', async () => {
    const { client, getSpy } = makeThreadClient();
    getSpy.mockResolvedValue({
      data: {
        items: [{
          message_id: 'om_root',
          msg_type: 'text',
          body: { content: '{"text":"Hello team"}' },
          sender: { id: 'ou_sender' },
          create_time: '1700000000',
        }],
      },
    });

    const msg = await client.getMessage('om_root');
    expect(msg).toEqual({
      message_id: 'om_root',
      msg_type: 'text',
      body: '{"text":"Hello team"}',
      sender_id: 'ou_sender',
      create_time: '1700000000',
    });
  });

  it('getMessage returns null when not found', async () => {
    const { client, getSpy } = makeThreadClient();
    getSpy.mockResolvedValue({ data: { items: [] } });
    expect(await client.getMessage('om_missing')).toBeNull();
  });

  it('getThreadContext returns root + replies in order', async () => {
    const { client, getSpy } = makeThreadClient();

    getSpy.mockResolvedValue({
      data: {
        items: [{
          message_id: 'om_root',
          msg_type: 'text',
          body: { content: '{"text":"Original question"}' },
          sender: { id: 'ou_alice' },
          create_time: '1700000000',
        }],
      },
    });

    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          items: [
            { message_id: 'om_reply1', msg_type: 'text', body: { content: '{"text":"First reply"}' }, sender: { id: 'ou_bob' }, create_time: '1700000002' },
            { message_id: 'om_reply2', msg_type: 'text', body: { content: '{"text":"Second reply"}' }, sender: { id: 'ou_carol' }, create_time: '1700000003' },
            { message_id: 'om_current', msg_type: 'text', body: { content: '{"text":"New msg"}' }, sender: { id: 'ou_dave' }, create_time: '1700000004' },
          ],
        },
      }),
    });

    const ctx = await client.getThreadContext('chat_1', 'om_root', 'om_current');
    expect(ctx).toEqual([
      { sender_id: 'ou_alice', text: 'Original question' },
      { sender_id: 'ou_bob', text: 'First reply' },
      { sender_id: 'ou_carol', text: 'Second reply' },
    ]);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/im/v1/messages/om_root/replies'),
      expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }),
    );
  });

  it('getThreadContext returns only root when /replies returns empty', async () => {
    const { client, getSpy } = makeThreadClient();
    getSpy.mockResolvedValue({
      data: { items: [{ message_id: 'om_root', msg_type: 'text', body: { content: '{"text":"Root"}' }, sender: { id: 'ou_a' }, create_time: '100' }] },
    });
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ data: { items: [] } }) });

    const ctx = await client.getThreadContext('chat_1', 'om_root', 'om_current');
    expect(ctx).toEqual([{ sender_id: 'ou_a', text: 'Root' }]);
  });

  it('getThreadContext returns empty array on API failure', async () => {
    const { client, getSpy } = makeThreadClient();
    getSpy.mockRejectedValue(new Error('Network error'));

    const ctx = await client.getThreadContext('chat_1', 'om_root', 'om_current');
    expect(ctx).toEqual([]);
  });

  it('getThreadContext limits replies to maxReplies', async () => {
    const { client, getSpy } = makeThreadClient();
    getSpy.mockResolvedValue({
      data: { items: [{ message_id: 'om_root', msg_type: 'text', body: { content: '{"text":"Root"}' }, sender: { id: 'ou_a' }, create_time: '100' }] },
    });

    const replies = Array.from({ length: 20 }, (_, i) => ({
      message_id: `om_r${i}`,
      msg_type: 'text',
      body: { content: `{"text":"Reply ${i}"}` },
      sender: { id: `ou_${i}` },
      create_time: String(200 + i),
    }));
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ data: { items: replies } }) });

    const ctx = await client.getThreadContext('chat_1', 'om_root', 'om_none', 5);
    expect(ctx).toHaveLength(6);
    expect(ctx[0].text).toBe('Root');
    expect(ctx[5].text).toBe('Reply 19');
  });
});
