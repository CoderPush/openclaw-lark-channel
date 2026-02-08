/**
 * Webhook Handler Tests
 */

import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { decryptPayload, shouldAllowDmByPolicy, shouldRespondInGroup, replaceMentionMarkers } from '../src/webhook.js';

describe('Webhook', () => {
  describe('decryptPayload', () => {
    it('should return null for missing encrypt key', () => {
      expect(decryptPayload('encrypted', '')).toBeNull();
    });

    it('should return null for missing encrypted data', () => {
      expect(decryptPayload('', 'key')).toBeNull();
    });

    // Note: Full encryption test would require a valid encrypted payload
    // which depends on Lark's encryption format
  });

  describe('shouldRespondInGroup', () => {
    it('should respond when mentions exist', () => {
      expect(shouldRespondInGroup('Hello', [{ key: '@_user_1' }], true)).toBe(true);
      expect(shouldRespondInGroup('Hello', [{ key: '@_user_1' }], false)).toBe(true);
    });

    it('should not respond to empty mentions when requireMention is true', () => {
      expect(shouldRespondInGroup('Hello there', [], true)).toBe(false);
    });

    it('should detect questions by punctuation', () => {
      expect(shouldRespondInGroup('What time is it?', [], false)).toBe(true);
      expect(shouldRespondInGroup('这是什么？', [], false)).toBe(true);
    });

    it('should detect English question keywords', () => {
      expect(shouldRespondInGroup('Can you help me with this', [], false)).toBe(true);
      expect(shouldRespondInGroup('How do I do this', [], false)).toBe(true);
      expect(shouldRespondInGroup('What is the answer', [], false)).toBe(true);
      expect(shouldRespondInGroup('Why does this happen', [], false)).toBe(true);
      expect(shouldRespondInGroup('Please explain', [], false)).toBe(true);
    });

    it('should detect Chinese question keywords', () => {
      expect(shouldRespondInGroup('帮我分析一下', [], false)).toBe(true);
      expect(shouldRespondInGroup('请解释这个', [], false)).toBe(true);
      expect(shouldRespondInGroup('能否总结一下', [], false)).toBe(true);
      expect(shouldRespondInGroup('这是什么意思', [], false)).toBe(true);
    });

    it('should not respond to statements', () => {
      expect(shouldRespondInGroup('Just chatting here', [], false)).toBe(false);
      expect(shouldRespondInGroup('Meeting at 3pm', [], false)).toBe(false);
      expect(shouldRespondInGroup('Ok sounds good', [], false)).toBe(false);
    });
  });

  describe('replaceMentionMarkers', () => {
    it('should replace @_user_N with display names', () => {
      const text = 'Tech lead @_user_1 @_user_2 please review';
      const mentions = [
        { key: '@_user_1', name: 'Si Huynh', id: { open_id: 'ou_111' } },
        { key: '@_user_2', name: 'Hao Doan', id: { open_id: 'ou_222' } },
      ];
      expect(replaceMentionMarkers(text, mentions)).toBe('Tech lead @Si Huynh @Hao Doan please review');
    });

    it('should strip bot self-mention when botOpenId provided', () => {
      const text = '@_user_1 what is the status?';
      const mentions = [
        { key: '@_user_1', name: 'Pepper', id: { open_id: 'ou_bot' } },
      ];
      expect(replaceMentionMarkers(text, mentions, 'ou_bot')).toBe('what is the status?');
    });

    it('should preserve bot mention when botOpenId not provided', () => {
      const text = '@_user_1 help me';
      const mentions = [
        { key: '@_user_1', name: 'Pepper', id: { open_id: 'ou_bot' } },
      ];
      expect(replaceMentionMarkers(text, mentions)).toBe('@Pepper help me');
    });

    it('should handle mixed bot and user mentions', () => {
      const text = '@_user_1 please help @_user_2 with this';
      const mentions = [
        { key: '@_user_1', name: 'Pepper', id: { open_id: 'ou_bot' } },
        { key: '@_user_2', name: 'Harley', id: { open_id: 'ou_harley' } },
      ];
      expect(replaceMentionMarkers(text, mentions, 'ou_bot')).toBe('please help @Harley with this');
    });

    it('should fallback to @user when name is missing', () => {
      const text = 'Hey @_user_1 check this';
      const mentions = [{ key: '@_user_1', id: { open_id: 'ou_111' } }];
      expect(replaceMentionMarkers(text, mentions)).toBe('Hey @user check this');
    });

    it('should return text unchanged when no mentions', () => {
      expect(replaceMentionMarkers('Hello world', [])).toBe('Hello world');
    });
  });

  describe('shouldAllowDmByPolicy', () => {
    it('should always allow for open policy', () => {
      expect(shouldAllowDmByPolicy({ policy: 'open', chatId: 'oc_any' })).toBe(true);
    });

    it('should enforce allowlist policy', () => {
      const allowlist = new Set(['oc_allowed']);
      expect(shouldAllowDmByPolicy({ policy: 'allowlist', chatId: 'oc_allowed', dmAllowlist: allowlist })).toBe(true);
      expect(shouldAllowDmByPolicy({ policy: 'allowlist', chatId: 'oc_blocked', dmAllowlist: allowlist })).toBe(false);
      expect(shouldAllowDmByPolicy({ policy: 'allowlist', chatId: 'oc_blocked' })).toBe(false);
    });

    it('should allow pairing policy without allowlist and enforce when provided', () => {
      expect(shouldAllowDmByPolicy({ policy: 'pairing', chatId: 'oc_any' })).toBe(true);

      const allowlist = new Set(['oc_allowed']);
      expect(shouldAllowDmByPolicy({ policy: 'pairing', chatId: 'oc_allowed', dmAllowlist: allowlist })).toBe(true);
      expect(shouldAllowDmByPolicy({ policy: 'pairing', chatId: 'oc_blocked', dmAllowlist: allowlist })).toBe(false);
    });
  });
});
