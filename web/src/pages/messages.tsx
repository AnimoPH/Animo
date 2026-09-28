import { useEffect, useState } from 'react';
import { CheckCheck, CloudDrizzle, CloudSun, MapPin, Send, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ConsoleLayout } from '@/components/console-layout';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useLanguage } from '@/hooks/use-language';
import type { WebTranslationKey } from '@/i18n/translations';
import { getDeliveryChannels, getTriggerSummary } from '@/constants/dashboard';
import {
  fetchLguAdvisoryOverview,
  formatForecastTimestamp,
  formatRegisteredDate,
  type AdvisoryAction,
  type LguAdvisoryGroup,
  type LguAdvisoryOverview,
} from '@/services/lgu-console-service';

export type MessagesPageProps = {
  onSignOut: () => void;
};

const ACTION_LABEL: Record<AdvisoryAction, WebTranslationKey> = {
  Advance_Cut: 'advisory.actionAdvanceCut',
  Delayed_Harvest: 'advisory.actionDelayedHarvest',
  No_Action_Needed: 'advisory.actionNoAction',
};

const ACTION_COLOR: Record<AdvisoryAction, string> = {
  Advance_Cut: 'var(--animo-danger)',
  Delayed_Harvest: 'var(--animo-warning)',
  No_Action_Needed: 'var(--animo-green)',
};

const ACTION_TINT: Record<AdvisoryAction, string> = {
  Advance_Cut: 'var(--animo-danger-tint)',
  Delayed_Harvest: 'var(--animo-warning-tint)',
  No_Action_Needed: 'var(--animo-green-tint)',
};

/** Live advisory groups for the LGU alert list. Farmer counts are people holding the recommendation. */
export function MessagesPage({ onSignOut }: MessagesPageProps) {
  const { t, language, isTagalog } = useLanguage();
  const [overview, setOverview] = useState<LguAdvisoryOverview | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<LguAdvisoryGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function loadOverview() {
    setLoadError(null);
    return fetchLguAdvisoryOverview()
      .then(setOverview)
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : t('common.error'));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useAutoRefresh(() => void loadOverview());

  const groups = overview?.groups ?? [];
  const triggerSummary = getTriggerSummary(language);
  const deliveryChannels = getDeliveryChannels(language);

  const forecastLabel = overview?.forecastFetchedAt
    ? formatForecastTimestamp(overview.forecastFetchedAt, isTagalog)
    : null;
  const rainLine =
    overview?.precipitationMmH != null && Number.isFinite(overview.precipitationMmH)
      ? t('advisory.rainLine', { amount: overview.precipitationMmH.toFixed(1) })
      : null;
  const forecastBits = [
    rainLine,
    forecastLabel,
    overview?.rainExpected == null
      ? null
      : overview.rainExpected
        ? t('advisory.rainExpected')
        : t('advisory.rainClear'),
    overview?.isStale ? t('advisory.staleForecast') : null,
  ].filter(Boolean);

  const actionLabel = (action: AdvisoryAction) => t(ACTION_LABEL[action]);

  const actionIcon = (action: AdvisoryAction) => {
    if (action === 'No_Action_Needed') return <CloudSun size={20} color={ACTION_COLOR[action]} />;
    return <CloudDrizzle size={20} color={ACTION_COLOR[action]} />;
  };

  return (
    <ConsoleLayout
      title={t('messages.title')}
      subtitle={t('advisory.subtitle')}
      onSignOut={onSignOut}>
      <div style={styles.grid}>
        <article className="animo-card" style={styles.panel}>
          <div style={styles.panelHead}>
            <div>
              <h2 style={styles.panelTitle}>{t('messages.title')}</h2>
              <p style={styles.panelSubtitle}>{t('advisory.sharedForecast')}</p>
              {forecastBits.length > 0 ? (
                <p style={styles.panelSubtitle}>{forecastBits.join(' · ')}</p>
              ) : null}
            </div>
            <Link to="/advisory" style={styles.detailLink}>
              {t('nav.advisory')} →
            </Link>
          </div>

          {loading ? <p style={styles.notice}>{t('common.loading')}</p> : null}
          {loadError ? <p style={styles.errorNotice}>{loadError}</p> : null}
          {!loading && !loadError && groups.length === 0 ? (
            <p style={styles.notice}>{t('advisory.empty')}</p>
          ) : null}

          {groups.length > 0 ? (
            <div style={styles.alertList}>
              {groups.map((group) => (
                <GroupRow
                  key={`${group.barangay}-${group.recommendedAction}`}
                  group={group}
                  actionLabel={actionLabel(group.recommendedAction)}
                  holdingLabel={t('advisory.farmersHolding', { count: group.farmerCount })}
                  issuedLabel={
                    group.latestIssued
                      ? formatRegisteredDate(group.latestIssued, isTagalog)
                      : t('common.none')
                  }
                  icon={actionIcon(group.recommendedAction)}
                  detailLabel={isTagalog ? 'Tingnan ang detalye →' : 'View details →'}
                  onOpenDetail={() => setSelectedGroup(group)}
                />
              ))}
            </div>
          ) : null}
        </article>

        <aside style={styles.sideColumn}>
          <article className="animo-card" style={styles.panel}>
            <div>
              <h2 style={styles.panelTitle}>{isTagalog ? 'Buod ng Trigger' : 'Trigger Summary'}</h2>
              <p style={styles.panelSubtitle}>{isTagalog ? 'Okt 6 – Okt 12, 2025' : 'Oct 6 – Oct 12, 2025'}</p>
            </div>

            <ul style={styles.summaryList}>
              {triggerSummary.map((row) => (
                <li key={row.label} style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>
                    <span style={{ ...styles.dot, background: row.color }} />
                    {row.label}
                  </span>
                  <span style={styles.summaryCount}>{row.count}</span>
                </li>
              ))}
            </ul>

            <div style={styles.divider} />

            <div>
              <h3 style={styles.sectionHeading}>{t('messages.allChannels')}</h3>
              <ul style={styles.channelList}>
                {deliveryChannels.map((channel) => (
                  <li key={channel.label} style={styles.channelRow}>
                    <span style={styles.channelLabel}>{channel.label}</span>
                    <span style={styles.channelValue}>{channel.value}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button type="button" style={styles.markRead}>
              <CheckCheck size={18} />
              {t('messages.markAll')}
            </button>
          </article>
        </aside>
      </div>

      {selectedGroup ? (
        <div style={styles.modalOverlay} onClick={() => setSelectedGroup(null)}>
          <div
            style={styles.modalCard}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true">
            <div style={styles.modalHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    ...styles.modalIconWrap,
                    background: ACTION_TINT[selectedGroup.recommendedAction],
                  }}>
                  {actionIcon(selectedGroup.recommendedAction)}
                </span>
                <div>
                  <h2 style={styles.modalTitle}>{selectedGroup.barangay}</h2>
                  <span
                    style={{
                      ...styles.alertBadge,
                      background: ACTION_TINT[selectedGroup.recommendedAction],
                      color: ACTION_COLOR[selectedGroup.recommendedAction],
                      marginTop: 4,
                    }}>
                    {actionLabel(selectedGroup.recommendedAction)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                style={styles.closeBtn}
                aria-label={isTagalog ? 'Isara' : 'Close'}>
                <X size={22} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.metaBox}>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>
                    <MapPin size={15} color="var(--animo-muted)" /> {isTagalog ? 'Lokasyon:' : 'Location:'}
                  </span>
                  <span style={styles.metaValue}>{selectedGroup.barangay}</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>
                    <Users size={15} color="var(--animo-muted)" /> {t('advisory.farmerUnit')}
                  </span>
                  <span style={styles.metaValue}>
                    {t('advisory.farmersHolding', { count: selectedGroup.farmerCount })}
                  </span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>{t('advisory.issuedAt')}</span>
                  <span style={styles.metaValue}>
                    {selectedGroup.latestIssued
                      ? formatRegisteredDate(selectedGroup.latestIssued, isTagalog)
                      : t('common.none')}
                  </span>
                </div>
              </div>

              <div>
                <h3 style={styles.detailSectionTitle}>{t('advisory.sharedForecast')}</h3>
                <p style={styles.fullMessageBody}>
                  {forecastBits.length > 0 ? forecastBits.join(' · ') : t('advisory.noForecast')}
                </p>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                disabled
                style={{ ...styles.actionBtnSecondary, opacity: 0.55, cursor: 'not-allowed' }}
                title={
                  isTagalog
                    ? 'Hindi pa available ang SMS broadcast sa prototype'
                    : 'SMS gateway broadcast unavailable in prototype'
                }>
                <Send size={16} />
                {isTagalog ? 'Magpadala ng Follow-up SMS' : 'Send Follow-up SMS'}
              </button>
              <button type="button" onClick={() => setSelectedGroup(null)} style={styles.actionBtnPrimary}>
                {isTagalog ? 'Isara' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConsoleLayout>
  );
}

function GroupRow({
  group,
  actionLabel,
  holdingLabel,
  issuedLabel,
  icon,
  detailLabel,
  onOpenDetail,
}: {
  group: LguAdvisoryGroup;
  actionLabel: string;
  holdingLabel: string;
  issuedLabel: string;
  icon: React.ReactNode;
  detailLabel: string;
  onOpenDetail: () => void;
}) {
  const tone = ACTION_COLOR[group.recommendedAction];

  return (
    <div style={styles.alertCard}>
      <span style={{ ...styles.alertIcon, background: ACTION_TINT[group.recommendedAction] }}>{icon}</span>

      <div style={styles.alertBody}>
        <div style={styles.alertTop}>
          <span style={styles.alertTitle}>{group.barangay}</span>
          <span style={{ ...styles.alertBadge, background: ACTION_TINT[group.recommendedAction], color: tone }}>
            {actionLabel}
          </span>
        </div>

        <p style={styles.alertText}>{holdingLabel}</p>

        <div style={styles.alertFooter}>
          <span style={styles.alertTime}>{issuedLabel}</span>
          <button type="button" onClick={onOpenDetail} style={styles.detailLink}>
            {detailLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 340px',
    gap: 18,
    alignItems: 'start',
  },
  sideColumn: { display: 'flex', flexDirection: 'column', gap: 18 },
  panel: { display: 'flex', flexDirection: 'column', gap: 18, padding: 24 },
  panelHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  panelTitle: { margin: '0 0 4px', fontSize: 20, fontWeight: 800 },
  panelSubtitle: { margin: 0, fontSize: 14, color: 'var(--animo-black-secondary)' },
  notice: { margin: 0, fontSize: 14, color: 'var(--animo-black-secondary)' },
  errorNotice: { margin: 0, fontSize: 14, color: 'var(--animo-danger)' },
  alertList: { display: 'flex', flexDirection: 'column', gap: 12 },
  alertCard: {
    display: 'flex',
    gap: 14,
    padding: 16,
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-white)',
  },
  alertIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    borderRadius: 'var(--animo-radius-pill)',
    flexShrink: 0,
  },
  alertBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  alertTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  alertTitle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 16,
    fontWeight: 700,
  },
  alertBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 'var(--animo-radius-pill)',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  alertText: {
    margin: 0,
    fontSize: 14,
    lineHeight: '21px',
    color: 'var(--animo-black-secondary)',
  },
  alertFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 12 },
  alertTime: { fontSize: 13, color: 'var(--animo-muted)' },
  detailLink: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--animo-green)',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  summaryList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid var(--animo-border)',
  },
  summaryLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
    color: 'var(--animo-black-secondary)',
  },
  summaryCount: { fontSize: 16, fontWeight: 800 },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  divider: { height: 1, background: 'var(--animo-border)' },
  sectionHeading: {
    margin: '0 0 10px',
    fontSize: 15,
    fontWeight: 800,
    color: 'var(--animo-black)',
  },
  channelList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  channelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  channelLabel: { fontSize: 14, color: 'var(--animo-black-secondary)' },
  channelValue: { fontSize: 14, fontWeight: 700 },
  markRead: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-green)',
    background: 'var(--animo-white)',
    color: 'var(--animo-green)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 6,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 600,
    background: 'var(--animo-white)',
    borderRadius: 'var(--animo-radius-lg)',
    padding: 26,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
  },
  modalHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--animo-border)',
    paddingBottom: 16,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: { margin: 0, fontSize: 20, fontWeight: 800 },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--animo-muted)',
    padding: 4,
    cursor: 'pointer',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  metaBox: {
    background: 'var(--animo-surface)',
    borderRadius: 'var(--animo-radius-md)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 14,
    gap: 12,
  },
  metaLabel: {
    color: 'var(--animo-muted)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  metaValue: {
    fontWeight: 700,
    color: 'var(--animo-black)',
    textAlign: 'right',
  },
  detailSectionTitle: {
    margin: '0 0 8px',
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--animo-black)',
  },
  fullMessageBody: {
    margin: 0,
    fontSize: 15,
    lineHeight: '22px',
    color: 'var(--animo-black-secondary)',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    borderTop: '1px solid var(--animo-border)',
    paddingTop: 16,
  },
  actionBtnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 18px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-green)',
    background: 'var(--animo-white)',
    color: 'var(--animo-green)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  actionBtnPrimary: {
    padding: '12px 24px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: 'var(--animo-green)',
    color: 'var(--animo-white)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
