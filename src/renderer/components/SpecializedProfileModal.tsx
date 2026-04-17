import { X } from 'lucide-react';

interface SpecializedProfileModalState {
  enabled: boolean;
  role: string;
  domain: string;
  priority: string;
  fallbackToDefault: boolean;
  keywords: string;
  excludeKeywords: string;
  systemTags: string;
  confidenceThreshold: string;
}

interface SpecializedProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  specialization: SpecializedProfileModalState | null;
  onChange: (patch: Partial<SpecializedProfileModalState>) => void;
}

export function SpecializedProfileModal({
  isOpen,
  onClose,
  specialization,
  onChange,
}: SpecializedProfileModalProps) {
  if (!isOpen || !specialization) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-background shadow-elevated mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-muted">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Specialized Model Settings</h3>
            <p className="text-sm text-text-secondary">
              Use this profile as an intent-based routing target.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <label className="flex items-center gap-3 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={specialization.enabled}
              onChange={(e) => onChange({ enabled: e.target.checked })}
              className="h-4 w-4 rounded border-border-muted"
            />
            enable
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">role</label>
              <input
                type="text"
                value={specialization.role}
                onChange={(e) => onChange({ role: e.target.value })}
                placeholder="expert_semiconductor_rnd"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text-primary placeholder-text-muted"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">domain</label>
              <input
                type="text"
                value={specialization.domain}
                onChange={(e) => onChange({ domain: e.target.value })}
                placeholder="semiconductor_rnd"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text-primary placeholder-text-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">priority</label>
              <input
                type="number"
                value={specialization.priority}
                onChange={(e) => onChange({ priority: e.target.value || '100' })}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text-primary placeholder-text-muted"
              />
            </div>
            <label className="flex items-center gap-3 text-sm text-text-primary pt-8">
              <input
                type="checkbox"
                checked={specialization.fallbackToDefault}
                onChange={(e) => onChange({ fallbackToDefault: e.target.checked })}
                className="h-4 w-4 rounded border-border-muted"
              />
              fallbackToDefault
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">matchRules.keywords</label>
            <textarea
              value={specialization.keywords}
              onChange={(e) => onChange({ keywords: e.target.value })}
              rows={3}
              placeholder="wafer, yield, pdk, spice, tcad"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text-primary placeholder-text-muted"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              matchRules.excludeKeywords
            </label>
            <textarea
              value={specialization.excludeKeywords}
              onChange={(e) => onChange({ excludeKeywords: e.target.value })}
              rows={2}
              placeholder="stock, earnings"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text-primary placeholder-text-muted"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">matchRules.systemTags</label>
            <input
              type="text"
              value={specialization.systemTags}
              onChange={(e) => onChange({ systemTags: e.target.value })}
              placeholder="semiconductor, rnd"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text-primary placeholder-text-muted"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              matchRules.confidenceThreshold
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={specialization.confidenceThreshold}
              onChange={(e) => onChange({ confidenceThreshold: e.target.value || '0.7' })}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text-primary placeholder-text-muted"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
