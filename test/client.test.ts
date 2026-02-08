/**
 * LarkClient Tests – verifies reply vs create endpoint selection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
