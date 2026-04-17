export interface DomainSpecialization {
  keywords: string[];
  role: string;
  domain: string;
  priority: number;
}

export const BUILTIN_SPECIALIZATIONS: Record<string, DomainSpecialization> = {
  semiconductor_rnd: {
    role: 'expert_semiconductor_rnd',
    domain: 'semiconductor_rnd',
    priority: 10,
    keywords: [
      '반도체',
      'semiconductor',
      'wafer',
      '웨이퍼',
      'yield',
      '수율',
      'pdk',
      'spice',
      'tcad',
      'etch',
      '식각',
      'deposition',
      '증착',
      'lithography',
      '노광',
      '공정',
      'fab',
    ],
  },
};

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
export const DEFAULT_PRIORITY = 100;
