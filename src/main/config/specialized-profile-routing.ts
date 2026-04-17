import type {
  AppConfig,
  ApiConfigSet,
  ProviderProfile,
  ProviderProfileKey,
  ProviderType,
} from './config-store';

export interface SpecializedRoutingDecision {
  configSetId: string;
  profileKey: ProviderProfileKey;
  routeType: 'default' | 'specialized';
  reason: string;
  confidence: number;
}

function collectText(prompt: string, historyText: string): string {
  return `${prompt}\n${historyText}`.toLowerCase();
}

function scoreProfile(profile: ProviderProfile, haystack: string): number {
  const specialization = profile.specialization;
  if (!specialization?.enabled) {
    return 0;
  }
  const keywords = specialization.matchRules.keywords || [];
  const excludeKeywords = specialization.matchRules.excludeKeywords || [];
  if (excludeKeywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
    return 0;
  }
  const matches = keywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
  if (matches.length === 0) {
    return 0;
  }
  const score = matches.length / Math.max(keywords.length, 1);
  const threshold = specialization.matchRules.confidenceThreshold ?? 0.7;
  return score >= threshold ? score : 0;
}

export function decideSpecializedProfileRoute(
  config: AppConfig,
  prompt: string,
  historyText: string
): SpecializedRoutingDecision {
  const haystack = collectText(prompt, historyText);
  const activeConfigSet =
    config.configSets.find((set) => set.id === config.activeConfigSetId) || config.configSets[0];
  let bestDecision: SpecializedRoutingDecision | null = null;

  for (const configSet of config.configSets) {
    for (const [profileKey, profile] of Object.entries(configSet.profiles) as Array<
      [ProviderProfileKey, ProviderProfile | undefined]
    >) {
      const isActiveDefault =
        configSet.id === activeConfigSet.id && profileKey === activeConfigSet.activeProfileKey;
      if (!profile?.specialization?.enabled || isActiveDefault) {
        continue;
      }
      const score = scoreProfile(profile, haystack);
      if (score <= 0) {
        continue;
      }
      const priority = profile.specialization.priority ?? 100;
      const nextDecision: SpecializedRoutingDecision = {
        configSetId: configSet.id,
        profileKey,
        routeType: 'specialized',
        reason: `matched domain=${profile.specialization.domain || 'specialized'} priority=${priority}`,
        confidence: score,
      };
      let currentConfigSet = null;
      let currentProfileKey: ProviderProfileKey = config.activeProfileKey;
      if (bestDecision) {
        const bestConfigSetId = bestDecision.configSetId;
        currentConfigSet =
          config.configSets.find((set) => set.id === bestConfigSetId) || null;
        currentProfileKey = bestDecision.profileKey;
      }
      const currentPriority =
        currentConfigSet?.profiles?.[currentProfileKey]?.specialization?.priority ?? 100;
      if (
        !bestDecision ||
        priority < currentPriority ||
        (priority === currentPriority && score > bestDecision.confidence)
      ) {
        bestDecision = nextDecision;
      }
    }
  }

  return (
    bestDecision || {
      configSetId: activeConfigSet.id,
      profileKey: config.activeProfileKey,
      routeType: 'default',
      reason: 'no_specialized_match',
      confidence: 0,
    }
  );
}

export function buildExecutionConfigForProfile(
  config: AppConfig,
  route: Pick<SpecializedRoutingDecision, 'configSetId' | 'profileKey'>
): AppConfig {
  const configSet: ApiConfigSet =
    config.configSets.find((set) => set.id === route.configSetId) ||
    config.configSets.find((set) => set.id === config.activeConfigSetId) ||
    config.configSets[0];
  const profileKey = route.profileKey;
  const profile = configSet.profiles[profileKey] || config.profiles[config.activeProfileKey];
  const customProtocol = profileKey === 'custom:openai'
    ? 'openai'
    : profileKey === 'custom:gemini'
      ? 'gemini'
      : profileKey === 'custom:anthropic'
        ? 'anthropic'
        : profileKey === 'openai' || profileKey === 'ollama'
          ? 'openai'
          : profileKey === 'gemini'
            ? 'gemini'
            : 'anthropic';
  const provider: ProviderType = profileKey.startsWith('custom:')
    ? 'custom'
    : profileKey === 'ollama'
      ? 'ollama'
      : (profileKey as Exclude<ProviderProfileKey, 'custom:anthropic' | 'custom:openai' | 'custom:gemini'>);

  return {
    ...config,
    provider,
    customProtocol,
    apiKey: profile?.apiKey || '',
    baseUrl: profile?.baseUrl,
    model: profile?.model || config.model,
    contextWindow: profile?.contextWindow,
    maxTokens: profile?.maxTokens,
    configSets: config.configSets,
    activeConfigSetId: configSet.id,
    activeProfileKey: profileKey,
    profiles: configSet.profiles,
    enableThinking: configSet.enableThinking,
  };
}

