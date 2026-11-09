import { AlertTriangle, Check, Clock, Info, Package, X, type LucideIcon } from 'lucide-react-native';

import { StatusPill } from '@/components/animo/ui/status-pill';
import type { StatusTone } from '@/constants/animo';
import type { DisplayStage } from '@/types/transaction';

/** v2 tone + icon for every farmer-visible transaction stage. Always rendered with a label. */
export const FARMER_STAGE_PILL: Record<DisplayStage, { tone: StatusTone; icon: LucideIcon }> = {
  request_pending: { tone: 'warning', icon: Clock },
  request_rejected: { tone: 'danger', icon: X },
  request_cancelled: { tone: 'neutral', icon: X },
  awaiting_payment: { tone: 'warning', icon: Clock },
  payment_sent: { tone: 'caution', icon: AlertTriangle },
  payment_confirmed: { tone: 'caution', icon: Package },
  delivered: { tone: 'warning', icon: Package },
  completed: { tone: 'success', icon: Check },
  transaction_cancelled: { tone: 'neutral', icon: X },
  payment_failed: { tone: 'danger', icon: AlertTriangle },
};

export function stageIcon(stage: DisplayStage): LucideIcon {
  return FARMER_STAGE_PILL[stage]?.icon ?? Info;
}

export function FarmerStagePill({ stage, label }: { stage: DisplayStage; label: string }) {
  const { tone, icon } = FARMER_STAGE_PILL[stage];
  return <StatusPill tone={tone} label={label} icon={icon} />;
}
