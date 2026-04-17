import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from './config-store';

vi.mock('electron-store', () => {
  class MockStore<T extends Record<string, unknown>> {
    private data: T;

    constructor(options?: { defaults?: T }) {
      this.data = ((options?.defaults || {}) as T);
    }

    get<K extends keyof T>(key?: K): T | T[K] | undefined {
      if (key === undefined) {
        return this.data;
      }
      return this.data[key];
    }

    set(value: T): void {
      this.data = value;
    }
  }

  return { default: MockStore };
});

describe('mock endpoint routing', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('treats 0.0.0.0 base URL as usable credentials for the active set', async () => {
    const { ConfigStore } = await import('./config-store');
    const store = new ConfigStore();
    const result = (store as unknown as {
      hasUsableCredentialsForProjection: (projection: {
        provider: string;
        customProtocol?: string;
        apiKey?: string;
        baseUrl?: string;
        model?: string;
      }) => boolean;
    }).hasUsableCredentialsForProjection({
      provider: 'openai',
      customProtocol: 'openai',
      apiKey: '',
      baseUrl: 'http://0.0.0.0/v1',
      model: 'gpt-4.1-mini',
    });

    expect(result).toBe(true);
  });

  it('routes semiconductor prompts to an enabled specialized profile', async () => {
    const { decideSpecializedProfileRoute } = await import('./specialized-profile-routing');
    const { ConfigStore } = await import('./config-store');
    const store = new ConfigStore();
    const baseConfig = store.getAll();

    const config: AppConfig = {
      ...baseConfig,
      activeConfigSetId: 'default',
      activeProfileKey: 'openai',
      configSets: [
        {
          id: 'default',
          name: 'Default',
          isSystem: true,
          provider: 'openai',
          customProtocol: 'openai',
          activeProfileKey: 'openai',
          enableThinking: true,
          updatedAt: new Date().toISOString(),
          profiles: {
            ...baseConfig.profiles,
            openai: {
              apiKey: '',
              baseUrl: 'http://0.0.0.0/v1',
              model: 'gpt-4.1-mini',
            },
            'custom:openai': {
              apiKey: '',
              baseUrl: 'http://0.0.0.0/v1',
              model: 'semi-rnd-mock',
              specialization: {
                enabled: true,
                role: 'expert_semiconductor_rnd',
                domain: 'semiconductor_rnd',
                priority: 10,
                fallbackToDefault: true,
                matchRules: {
                  keywords: ['wafer', 'etch', 'pdk'],
                  excludeKeywords: [],
                  systemTags: [],
                  confidenceThreshold: 0.34,
                },
              },
            },
          },
        },
      ],
    };

    const decision = decideSpecializedProfileRoute(
      config,
      'How does wafer etch interact with the PDK assumptions?',
      ''
    );

    expect(decision.routeType).toBe('specialized');
    expect(decision.profileKey).toBe('custom:openai');
    expect(decision.configSetId).toBe('default');
  });
});
