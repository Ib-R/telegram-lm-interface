import { jest } from '@jest/globals';

// ============================================================
// Mock node-telegram-bot-api so bot construction doesn't fail
// ============================================================
jest.unstable_mockModule('node-telegram-bot-api', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      onText: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue(undefined),
      sendChatAction: jest.fn().mockResolvedValue(undefined),
      getFileLink: jest.fn().mockResolvedValue('https://example.com/photo.jpg'),
      startPolling: jest.fn().mockResolvedValue(undefined),
      stopPolling: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('Telegram LM Interface', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.TELEGRAM_BOT_TOKEN = 'dummy-token';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function loadModule() {
    return import('../index.js');
  }

  // ============================================================
  // ENVIRONMENT DEFAULTS
  // ============================================================
  describe('environment defaults', () => {
    test('uses default LM_STUDIO_URL when env var is not set', async () => {
      delete process.env.LM_STUDIO_URL;
      // We can't directly test the const, but we can verify lmChat uses it
      // by checking the URL it constructs. We'll test this in lmChat tests.
      const mod = await loadModule();
      expect(mod).toBeDefined();
    });

    test('uses default LM_STUDIO_MODEL when env var is not set', async () => {
      delete process.env.LM_STUDIO_MODEL;
      const { getChatState } = await loadModule();
      const state = getChatState('default-model-test');
      expect(state.model).toBe('qwen2.5-vl-7b-instruct');
    });

    test('uses custom LM_STUDIO_MODEL when set', async () => {
      process.env.LM_STUDIO_MODEL = 'custom-model';
      const { getChatState } = await loadModule();
      const state = getChatState('custom-model-test');
      expect(state.model).toBe('custom-model');
    });

    test('CHAT_ID_ALLOWED_LIST is null when not set', async () => {
      delete process.env.CHAT_ID_ALLOWED_LIST;
      const { isIdAllowed } = await loadModule();
      // With no allowlist, all IDs should be allowed
      expect(isIdAllowed('anything')).toBe(true);
      expect(isIdAllowed('')).toBe(true);
    });
  });

  // ============================================================
  // MEMORY FUNCTIONS
  // ============================================================
  describe('getChatState', () => {
    test('initializes with default system message and model', async () => {
      process.env.LM_STUDIO_MODEL = 'test-model';
      const { getChatState } = await loadModule();
      const chatId = '123';
      const state = getChatState(chatId);
      expect(state).toHaveProperty('model', 'test-model');
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toMatchObject({
        role: 'system',
        content: expect.any(String),
      });
    });

    test('returns same instance on subsequent calls for same chatId', async () => {
      const { getChatState } = await loadModule();
      const chatId = 'same-instance';
      const state1 = getChatState(chatId);
      const state2 = getChatState(chatId);
      expect(state2).toBe(state1);
    });

    test('creates separate state for different chatIds', async () => {
      const { getChatState } = await loadModule();
      const state1 = getChatState('chat-1');
      const state2 = getChatState('chat-2');
      expect(state1).not.toBe(state2);
      expect(state1.messages).toHaveLength(1);
      expect(state2.messages).toHaveLength(1);
    });

    test('system message has expected content', async () => {
      const { getChatState } = await loadModule();
      const state = getChatState('sys-msg-test');
      expect(state.messages[0].content).toContain('helpful assistant');
    });

    test('state is mutable (model can be changed)', async () => {
      const { getChatState } = await loadModule();
      const state = getChatState('mutable-test');
      state.model = 'new-model';
      expect(state.model).toBe('new-model');
    });

    test('state messages can be pushed to', async () => {
      const { getChatState } = await loadModule();
      const state = getChatState('push-test');
      state.messages.push({ role: 'user', content: 'hello' });
      expect(state.messages).toHaveLength(2);
      expect(state.messages[1].content).toBe('hello');
    });
  });

  describe('getCurrentModel', () => {
    test('returns the model from state', async () => {
      process.env.LM_STUDIO_MODEL = 'model-A';
      const { getCurrentModel } = await loadModule();
      expect(getCurrentModel('abc')).toBe('model-A');
    });

    test('reflects model changes made to state', async () => {
      const { getChatState, getCurrentModel } = await loadModule();
      const chatId = 'reflect-test';
      const state = getChatState(chatId);
      state.model = 'model-B';
      expect(getCurrentModel(chatId)).toBe('model-B');
    });

    test('returns default model for new chat', async () => {
      delete process.env.LM_STUDIO_MODEL;
      const { getCurrentModel } = await loadModule();
      expect(getCurrentModel('new-chat')).toBe('qwen2.5-vl-7b-instruct');
    });
  });

  describe('isIdAllowed', () => {
    test('allows all when CHAT_ID_ALLOWED_LIST is not set', async () => {
      delete process.env.CHAT_ID_ALLOWED_LIST;
      const { isIdAllowed } = await loadModule();
      expect(isIdAllowed('any')).toBe(true);
      expect(isIdAllowed('12345')).toBe(true);
    });

    test('allows IDs in the allowlist', async () => {
      process.env.CHAT_ID_ALLOWED_LIST = '1,2,3';
      jest.resetModules();
      const { isIdAllowed } = await loadModule();
      expect(isIdAllowed('1')).toBe(true);
      expect(isIdAllowed('2')).toBe(true);
      expect(isIdAllowed('3')).toBe(true);
    });

    test('rejects IDs not in the allowlist', async () => {
      process.env.CHAT_ID_ALLOWED_LIST = '1,2,3';
      jest.resetModules();
      const { isIdAllowed } = await loadModule();
      expect(isIdAllowed('99')).toBe(false);
      expect(isIdAllowed('0')).toBe(false);
    });

    test('trims whitespace from allowlist entries', async () => {
      process.env.CHAT_ID_ALLOWED_LIST = ' 1 , 2 , 3 ';
      jest.resetModules();
      const { isIdAllowed } = await loadModule();
      expect(isIdAllowed('1')).toBe(true);
      expect(isIdAllowed('2')).toBe(true);
      expect(isIdAllowed('3')).toBe(true);
      expect(isIdAllowed('99')).toBe(false);
    });

    test('handles single entry allowlist', async () => {
      process.env.CHAT_ID_ALLOWED_LIST = '42';
      jest.resetModules();
      const { isIdAllowed } = await loadModule();
      expect(isIdAllowed('42')).toBe(true);
      expect(isIdAllowed('43')).toBe(false);
    });
  });

  describe('trimHistory', () => {
    test('keeps system message and last 20 entries when over limit', async () => {
      const { getChatState, trimHistory } = await loadModule();
      const chatId = 'trim-over';
      const state = getChatState(chatId);
      for (let i = 0; i < 30; i++) {
        state.messages.push({ role: 'user', content: `msg ${i}` });
      }
      expect(state.messages).toHaveLength(31); // 1 system + 30
      trimHistory(state);
      expect(state.messages).toHaveLength(21); // 1 system + last 20
      expect(state.messages[0].role).toBe('system');
      expect(state.messages[1].content).toBe('msg 10');
    });

    test('does not trim when messages are at exactly 21', async () => {
      const { getChatState, trimHistory } = await loadModule();
      const chatId = 'trim-exact';
      const state = getChatState(chatId);
      for (let i = 0; i < 20; i++) {
        state.messages.push({ role: 'user', content: `msg ${i}` });
      }
      expect(state.messages).toHaveLength(21);
      trimHistory(state);
      expect(state.messages).toHaveLength(21);
      expect(state.messages[1].content).toBe('msg 0');
    });

    test('does not trim when messages are under 21', async () => {
      const { getChatState, trimHistory } = await loadModule();
      const chatId = 'trim-under';
      const state = getChatState(chatId);
      state.messages.push({ role: 'user', content: 'only msg' });
      expect(state.messages).toHaveLength(2);
      trimHistory(state);
      expect(state.messages).toHaveLength(2);
    });

    test('does not trim when only system message exists', async () => {
      const { getChatState, trimHistory } = await loadModule();
      const chatId = 'trim-empty';
      const state = getChatState(chatId);
      expect(state.messages).toHaveLength(1);
      trimHistory(state);
      expect(state.messages).toHaveLength(1);
    });

    test('preserves system message content after trim', async () => {
      const { getChatState, trimHistory } = await loadModule();
      const chatId = 'trim-preserve';
      const state = getChatState(chatId);
      for (let i = 0; i < 50; i++) {
        state.messages.push({ role: 'user', content: `msg ${i}` });
      }
      trimHistory(state);
      expect(state.messages[0].role).toBe('system');
      expect(state.messages[0].content).toContain('helpful assistant');
    });

    test('handles trim when called multiple times', async () => {
      const { getChatState, trimHistory } = await loadModule();
      const chatId = 'trim-multi';
      const state = getChatState(chatId);
      for (let i = 0; i < 30; i++) {
        state.messages.push({ role: 'user', content: `msg ${i}` });
      }
      trimHistory(state);
      expect(state.messages).toHaveLength(21);
      // Add more messages after trim
      for (let i = 30; i < 50; i++) {
        state.messages.push({ role: 'user', content: `msg ${i}` });
      }
      trimHistory(state);
      expect(state.messages).toHaveLength(21);
      expect(state.messages[0].role).toBe('system');
    });
  });

  // ============================================================
  // LM CHAT (mocked fetch)
  // ============================================================
  describe('lmChat', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      delete global.fetch;
    });

    test('returns content from successful response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Hello from LM Studio!' } }],
        }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const { lmChat } = await loadModule();
      const result = await lmChat(
        [{ role: 'user', content: 'Hi' }],
        'test-model'
      );
      expect(result).toBe('Hello from LM Studio!');
    });

    test('returns "No response." when choices are empty', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [],
        }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const { lmChat } = await loadModule();
      const result = await lmChat(
        [{ role: 'user', content: 'Hi' }],
        'test-model'
      );
      expect(result).toBe('No response.');
    });

    test('returns "No response." when message is missing', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{}],
        }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const { lmChat } = await loadModule();
      const result = await lmChat(
        [{ role: 'user', content: 'Hi' }],
        'test-model'
      );
      expect(result).toBe('No response.');
    });

    test('throws error on non-ok response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const { lmChat } = await loadModule();
      await expect(
        lmChat([{ role: 'user', content: 'Hi' }], 'test-model')
      ).rejects.toThrow('LM Studio 500: Internal Server Error');
    });

    test('throws error on 401 response', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const { lmChat } = await loadModule();
      await expect(
        lmChat([{ role: 'user', content: 'Hi' }], 'test-model')
      ).rejects.toThrow('LM Studio 401: Unauthorized');
    });

    test('sends correct request body', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'reply' } }],
        }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      delete process.env.LM_STUDIO_URL;
      const { lmChat } = await loadModule();
      await lmChat([{ role: 'user', content: 'test' }], 'my-model');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:1234/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"model":"my-model"'),
        })
      );
    });

    test('sends temperature 0.7 in request body', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'reply' } }],
        }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const { lmChat } = await loadModule();
      await lmChat([{ role: 'user', content: 'test' }], 'model');

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.temperature).toBe(0.7);
    });

    test('uses custom LM_STUDIO_URL when set', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'reply' } }],
        }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      process.env.LM_STUDIO_URL = 'http://custom-host:8080/v1';
      jest.resetModules();
      const { lmChat } = await loadModule();
      await lmChat([{ role: 'user', content: 'test' }], 'model');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://custom-host:8080/v1/chat/completions',
        expect.any(Object)
      );
    });

    test('includes authorization header with OPENAI_API_KEY', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'reply' } }],
        }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      process.env.OPENAI_API_KEY = 'test-key-123';
      jest.resetModules();
      const { lmChat } = await loadModule();
      await lmChat([{ role: 'user', content: 'test' }], 'model');

      const callArgs = global.fetch.mock.calls[0];
      expect(callArgs[1].headers.authorization).toBe('Bearer test-key-123');
    });

    test('handles network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const { lmChat } = await loadModule();
      await expect(
        lmChat([{ role: 'user', content: 'Hi' }], 'test-model')
      ).rejects.toThrow('Network error');
    });

    test('handles response with null data', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(null),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const { lmChat } = await loadModule();
      const result = await lmChat(
        [{ role: 'user', content: 'Hi' }],
        'test-model'
      );
      expect(result).toBe('No response.');
    });

    test('handles response with missing choices field', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const { lmChat } = await loadModule();
      const result = await lmChat(
        [{ role: 'user', content: 'Hi' }],
        'test-model'
      );
      expect(result).toBe('No response.');
    });
  });

  // ============================================================
  // MAIN FUNCTION
  // ============================================================
  describe('main', () => {
    test('does not exit when NODE_ENV is test and token is missing', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      process.env.NODE_ENV = 'test';
      jest.resetModules();

      const { main } = await loadModule();
      // main() should not throw or exit in test mode
      await expect(main()).resolves.not.toThrow();
    });

    test('starts polling when token is present', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      jest.resetModules();

      const { main } = await loadModule();
      await main();
      // The bot constructor is mocked, so we just verify no error
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  describe('edge cases', () => {
    test('getChatState handles numeric-like string chatIds', async () => {
      const { getChatState } = await loadModule();
      const state = getChatState('123456789');
      expect(state).toBeDefined();
      expect(state.messages).toHaveLength(1);
    });

    test('getChatState handles empty string chatId', async () => {
      const { getChatState } = await loadModule();
      const state = getChatState('');
      expect(state).toBeDefined();
      expect(state.messages).toHaveLength(1);
    });

    test('trimHistory handles state with only system message', async () => {
      const { getChatState, trimHistory } = await loadModule();
      const state = getChatState('edge-trim');
      trimHistory(state);
      expect(state.messages).toHaveLength(1);
    });

    test('trimHistory handles state with exactly 22 messages (1 system + 21)', async () => {
      const { getChatState, trimHistory } = await loadModule();
      const state = getChatState('edge-22');
      for (let i = 0; i < 21; i++) {
        state.messages.push({ role: 'user', content: `msg ${i}` });
      }
      expect(state.messages).toHaveLength(22);
      trimHistory(state);
      expect(state.messages).toHaveLength(21);
      expect(state.messages[0].role).toBe('system');
      expect(state.messages[1].content).toBe('msg 1');
    });

    test('isIdAllowed handles empty allowlist string', async () => {
      process.env.CHAT_ID_ALLOWED_LIST = '';
      jest.resetModules();
      const { isIdAllowed } = await loadModule();
      // Empty string split gives [''], so only empty string is allowed
      expect(isIdAllowed('')).toBe(true);
      expect(isIdAllowed('1')).toBe(false);
    });

    test('isIdAllowed handles allowlist with empty entries', async () => {
      process.env.CHAT_ID_ALLOWED_LIST = '1,,2';
      jest.resetModules();
      const { isIdAllowed } = await loadModule();
      expect(isIdAllowed('1')).toBe(true);
      expect(isIdAllowed('2')).toBe(true);
      expect(isIdAllowed('')).toBe(true); // empty entry from split
      expect(isIdAllowed('3')).toBe(false);
    });

    test('multiple chat states are independent', async () => {
      const { getChatState } = await loadModule();
      const state1 = getChatState('indep-1');
      const state2 = getChatState('indep-2');

      state1.messages.push({ role: 'user', content: 'msg1' });
      state2.messages.push({ role: 'user', content: 'msg2' });
      state2.messages.push({ role: 'user', content: 'msg3' });

      expect(state1.messages).toHaveLength(2);
      expect(state2.messages).toHaveLength(3);
    });
  });
});
