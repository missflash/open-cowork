import type {
  AppConfig,
  ApiConfigSet,
  ProviderProfile,
  ProviderProfileKey,
  ProviderType,
} from './config-store';

import { BUILTIN_SPECIALIZATIONS } from '../../shared/constants/specialized-domains';

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
  const userKeywords = specialization.matchRules.keywords || [];
  const domainKeywords = specialization.domain
    ? BUILTIN_SPECIALIZATIONS[specialization.domain]?.keywords || []
    : [];
  const allKeywords = [...new Set([...userKeywords, ...domainKeywords])];

  const excludeKeywords = specialization.matchRules.excludeKeywords || [];
  if (excludeKeywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
    return 0;
  }
  const matches = allKeywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
  if (matches.length === 0) {
    return 0;
  }
  // New scoring: Any match gives a high base score (0.8) to pass the default 0.7 threshold.
  // Additional matches slightly increase the score to help tie-breaking.
  const baseScore = 0.8;
  const matchDensity = matches.length / Math.max(allKeywords.length, 1);
  const score = baseScore + matchDensity * 0.2;
  return score;
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
      if (!profile?.specialization?.enabled) {
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
        currentConfigSet = config.configSets.find((set) => set.id === bestConfigSetId) || null;
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

  if (bestDecision) {
    return bestDecision;
  }

  // Fallback logic: if no specialized match, use the last used general profile
  // if it exists and the currently active profile is specialized.
  const currentProfile = activeConfigSet.profiles[config.activeProfileKey];
  const isCurrentSpecialized = currentProfile?.specialization?.enabled === true;

  if (isCurrentSpecialized) {
    // 1. Try saved last general
    if (config.lastGeneralConfigSetId && config.lastGeneralProfileKey) {
      return {
        configSetId: config.lastGeneralConfigSetId,
        profileKey: config.lastGeneralProfileKey,
        routeType: 'default',
        reason: 'fallback_to_last_general',
        confidence: 0,
      };
    }

    // 2. Otherwise, find the first available non-specialized profile across all sets
    for (const configSet of config.configSets) {
      for (const [profileKey, profile] of Object.entries(configSet.profiles) as Array<
        [ProviderProfileKey, ProviderProfile | undefined]
      >) {
        if (!profile?.specialization?.enabled) {
          return {
            configSetId: configSet.id,
            profileKey,
            routeType: 'default',
            reason: 'fallback_to_first_general',
            confidence: 0,
          };
        }
      }
    }
  }

  return {
    configSetId: activeConfigSet.id,
    profileKey: config.activeProfileKey,
    routeType: 'default',
    reason: 'no_specialized_match',
    confidence: 0,
  };
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
  const customProtocol =
    profileKey === 'custom:openai'
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
      : (profileKey as Exclude<
          ProviderProfileKey,
          'custom:anthropic' | 'custom:openai' | 'custom:gemini'
        >);

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
