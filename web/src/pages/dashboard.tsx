import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Database,
  Gavel,
  PauseCircle,
  RefreshCw,
  TrendingUp,
  TriangleAlert,
  X,
} from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import { useAuth } from '@/lib/auth-context';
import {
  activateNfaInterventionWindow,
  deactivateNfaInterventionWindows,
  fetchMarketPriceFeed,
  fetchNfaInterventionWindows,
  fetchRizalPriceHistory,
  syncPsaPrices,
  formatPeso,
  formatSyncTimestamp,
  isNfaWindowActiveToday,
  priceDelta,
  toWeeklyBars,
  type MarketPriceFeed,
  type PriceHistoryPoint,
} from '@/services/lgu-console-service';

export type DashboardPageProps = {
  onSignOut: () => void;
};

/** LGU monitoring dashboard — live price feed and PSA history from Supabase (auth stub unchanged). */
export function DashboardPage({ onSignOut }: DashboardPageProps) {
  const { session } = useAuth();
  const [priceFeed, setPriceFeed] = useState<MarketPriceFeed | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [nfaActive, setNfaActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [showNfaModal, setShowNfaModal] = useState(false);
  const [showNfaSuccessModal, setShowNfaSuccessModal] = useState(false);
  const [lastNfaAction, setLastNfaAction] = useState<'activated' | 'disabled'>('activated');
  const [togglingNfa, setTogglingNfa] = useState(false);

  function loadDashboard() {
    setLoading(true);
    setLoadError(null);

    return Promise.all([fetchMarketPriceFeed(), fetchRizalPriceHistory(12), fetchNfaInterventionWindows()])
      .then(([feed, history, windows]) => {
        setPriceFeed(feed);
        setPriceHistory(history);
        setNfaActive(isNfaWindowActiveToday(windows));
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'Hindi ma-load ang dashboard data.');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function handlePsaSync() {
    setSyncing(true);
    setSyncNotice(null);
    try {
      const result = await syncPsaPrices();
      await loadDashboard();
      const dryNote = result.dryBaseRefreshed
        ? 'Na-refresh din ang model dry base.'
        : 'Na-save ang PSA history; dry base nanatili (walang pricing service o kulang ang 12 buwan).';
      setSyncNotice(`Na-sync ang ${result.syncedMonths} buwan mula sa PSA. ${dryNote}`);
    } catch (error) {
      setSyncNotice(error instanceof Error ? error.message : 'Hindi natapos ang PSA sync.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleNfaConfirm() {
    const userId = session?.user.id;
    if (!userId) {
      setLoadError('Kailangan ng LGU login para i-toggle ang NFA window.');
      setShowNfaModal(false);
      return;
    }

    setTogglingNfa(true);
    try {
      if (nfaActive) {
        await deactivateNfaInterventionWindows();
        setLastNfaAction('disabled');
      } else {
        await activateNfaInterventionWindow(userId);
        setLastNfaAction('activated');
      }
      await loadDashboard();
      setShowNfaModal(false);
      setShowNfaSuccessModal(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Hindi ma-update ang NFA window.');
      setShowNfaModal(false);
    } finally {
      setTogglingNfa(false);
    }
  }

  const weeklyBars = useMemo(() => toWeeklyBars(priceHistory, 7), [priceHistory]);
  const latestHistory = priceHistory.at(-1);
  const previousHistory = priceHistory.at(-2);
  const psaFarmgate = latestHistory?.pricePerKg ?? null;
  const dryBase = priceFeed?.dryBasePerKg ?? latestHistory?.pricePerKg ?? null;
  const benchmarkDelta = dryBase != null ? priceDelta(dryBase, previousHistory?.pricePerKg) : null;
  const lastSyncTime = latestHistory ? formatSyncTimestamp(latestHistory.month) : 'Walang talaan pa';

  return (
    <ConsoleLayout
      title="Dashboard"
      subtitle={`Pangunahing Tanaw · Rizal · ${priceFeed?.effectiveDate ?? '—'}`}
      onSignOut={onSignOut}>
      {loading ? <p style={styles.loadNotice}>Naglo-load ng datos mula sa Supabase…</p> : null}
      {loadError ? <p style={styles.errorNotice}>{loadError}</p> : null}
      {/* Top Cards Grid */}
      <section style={styles.topCardsGrid}>
        <article className="animo-card" style={styles.metricCard}>
          <div style={styles.metricTop}>
            <div style={styles.metricHead}>
              <span style={styles.metricLabel}>Model dry base (cached)</span>
              <span style={styles.metricIcon}>
                <TrendingUp size={20} color="var(--animo-green)" />
              </span>
            </div>
            <div style={styles.metricValue}>{dryBase != null ? formatPeso(dryBase) : '—'}</div>
            <div style={styles.comparisonRow}>
              <span style={styles.comparisonText}>marketpricefeed · LSTM-GRU nowcast</span>
            </div>
          </div>
          <div style={styles.metricBottom}>
            <div style={styles.metricDelta}>
              <span>Wet base (survey): {priceFeed ? formatPeso(priceFeed.wetBasePerKg) : '—'}</span>
            </div>
          </div>
        </article>

        <article className="animo-card" style={styles.metricCard}>
          <div style={styles.metricTop}>
            <div style={styles.metricHead}>
              <span style={styles.metricLabel}>PSA Rizal farmgate</span>
              <span style={styles.metricIcon}>
                <Coins size={20} color="var(--animo-green)" />
              </span>
            </div>
            <div style={styles.metricValue}>
              {psaFarmgate != null ? formatPeso(psaFarmgate) : '—'}
            </div>
            {psaFarmgate != null && benchmarkDelta ? (
              <div style={styles.comparisonRow}>
                <span style={styles.trendPillGreen}>
                  <TrendingUp size={14} /> {benchmarkDelta}
                </span>
                <span style={styles.comparisonText}>vs nakaraang buwan sa talaan</span>
              </div>
            ) : null}
          </div>
          <div style={styles.metricBottom}>
            <div style={styles.metricDelta}>
              {psaFarmgate != null ? (
                <span>kada kilo · PSA OpenSTAT · Rizal province</span>
              ) : (
                <span>
                  Walang talaan sa palay_price_history — kailangan ng PSA sync (LGU auth) o manual insert ng Rizal row.
                </span>
              )}
            </div>
          </div>
        </article>

        {/* NFA Volatility Fallback Card (Green borders & subtle tint when activated) */}
        <article
          className="animo-card"
          style={{
            ...styles.actionCard,
            ...(nfaActive ? styles.actionCardActiveBorder : styles.actionCardInactiveBorder),
          }}>
          <div style={styles.actionCardHead}>
            <div>
              <span
                style={
                  nfaActive ? styles.actionBadgeActive : styles.actionBadgeInactive
                }>
                {nfaActive
                  ? 'NFA Volatility Alert · Aktibo'
                  : 'NFA Intervention Fallback'}
              </span>
              <h3 style={styles.actionCardTitle}>NFA Price Volatility Alert</h3>
            </div>
            <span
              style={
                nfaActive
                  ? styles.actionIconCircleActive
                  : styles.actionIconCircleInactive
              }>
              <Gavel
                size={22}
                color={nfaActive ? 'var(--animo-green)' : 'var(--animo-muted)'}
              />
            </span>
          </div>

          <p style={styles.actionCardDesc}>
            Minsan ay biglaang nagbabago ang presyo ng NFA at hindi ito agad nadidiskubre ng sistema.
            Gamitin ang fallback na ito upang abisuhan ang algorithm na mataas ang volatility sa merkado.
          </p>

          <div style={styles.actionCardStatusRow}>
            <span style={styles.actionStatusLabel}>Katayuan ng Alerto:</span>
            <span
              style={{
                ...styles.actionStatusValue,
                color: nfaActive ? 'var(--animo-green)' : 'var(--animo-muted)',
              }}>
              {nfaActive ? '● Aktibo ang Safeguards' : '○ Standby (Hindi Aktibo)'}
            </span>
          </div>

          {nfaActive ? (
            <button
              type="button"
              onClick={() => setShowNfaModal(true)}
              disabled={togglingNfa}
              style={styles.actionButtonDisable}>
              <PauseCircle size={18} />
              I-disable ang NFA Volatility Alert
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowNfaModal(true)}
              disabled={togglingNfa}
              style={styles.actionButtonGreen}>
              <Gavel size={18} />
              I-activate ang NFA Volatility Alert
            </button>
          )}
        </article>

        {/* Sync Market Prices from PSA Card */}
        <article className="animo-card" style={styles.actionCard}>
          <div style={styles.actionCardHead}>
            <div>
              <span style={styles.actionBadgePsa}>PSA Market Data</span>
              <h3 style={styles.actionCardTitle}>Sync Market Prices</h3>
            </div>
            <span style={styles.actionIconCirclePsa}>
              <Database size={22} color="var(--animo-green)" />
            </span>
          </div>

          <p style={styles.actionCardDesc}>
            Hinahatak ang Rizal farmgate prices mula sa PSA OpenSTAT papunta sa palay_price_history.
            Pagkatapos, sinusubukang i-refresh ang model dry base.
          </p>

          <div style={styles.actionCardStatusRow}>
            <span style={styles.actionStatusLabel}>Huling tala:</span>
            <span style={styles.actionStatusValue}>{lastSyncTime}</span>
          </div>

          {syncNotice ? <p style={styles.loadNotice}>{syncNotice}</p> : null}

          <button
            type="button"
            onClick={() => void handlePsaSync()}
            disabled={syncing}
            style={{
              ...styles.actionButtonPsa,
              ...(syncing ? { opacity: 0.7, cursor: 'wait' } : null),
            }}>
            <RefreshCw size={18} />
            {syncing ? 'Sini-sync…' : 'I-sync mula sa PSA'}
          </button>
        </article>
      </section>

      <section style={styles.midRow}>
        <PriceBenchmarkCard
          dryBase={dryBase}
          weeklyBars={weeklyBars}
          effectiveDate={priceFeed?.effectiveDate ?? latestHistory?.month ?? null}
        />
        <PricingConfidenceCard nfaActive={nfaActive} />
      </section>

      {showNfaModal ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={nfaActive ? styles.actionIconCircleDisable : styles.actionIconCircleActive}>
                  {nfaActive ? (
                    <PauseCircle size={24} color="var(--animo-danger)" />
                  ) : (
                    <Gavel size={24} color="var(--animo-green)" />
                  )}
                </span>
                <div>
                  <h2 style={styles.modalTitle}>
                    {nfaActive
                      ? 'I-disable ang NFA Volatility Alert?'
                      : 'I-activate ang NFA Volatility Alert?'}
                  </h2>
                  <p style={styles.modalSubtitle}>NFA Price Fallback Protocol</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowNfaModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                {nfaActive
                  ? 'Sigurado ka bang nais mong i-disable ang NFA Volatility Safeguard? Ibabalik ang karaniwang pricing algorithm sa platform.'
                  : 'Sigurado ka bang nais mong ipaalam sa sistema na may biglaang pagbabago sa presyo ng NFA? Awtomatikong ia-activate ng algorithm ang price stabilization at volatility clamps para sa proteksyon ng merkado.'}
              </p>

              <div style={nfaActive ? styles.calloutInfoBox : styles.calloutWarningBox}>
                <TriangleAlert
                  size={20}
                  color={nfaActive ? '#2563EB' : 'var(--animo-warning)'}
                  style={{ flexShrink: 0 }}
                />
                <span>
                  {nfaActive
                    ? 'Mananatiling sinusubaybayan ng sistema ang live PSA benchmarks kahit naka-disable ang emergency fallback.'
                    : 'Awtomatikong magpapatupad ang ANIMO ng price clamps (Tier 2/3) upang protektahan ang mga magsasaka laban sa abnormal na pagbagsak o pagtaas ng presyo.'}
                </span>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button type="button" onClick={() => setShowNfaModal(false)} style={styles.cancelButton}>
                Huwag Ituloy
              </button>
              {nfaActive ? (
                <button
                  type="button"
                  onClick={() => void handleToggleNfaConfirm()}
                  disabled={togglingNfa}
                  style={styles.confirmButtonDisable}>
                  <PauseCircle size={18} />
                  Oo, I-disable ang Alerto
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleToggleNfaConfirm()}
                  disabled={togglingNfa}
                  style={styles.confirmButtonGreen}>
                  <Gavel size={18} />
                  Oo, I-activate ang Alerto
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showNfaSuccessModal ? (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: 480, textAlign: 'center' }}>
            <div style={styles.successIconBig}>
              <CheckCircle2 size={46} color="var(--animo-green)" />
            </div>

            <h2 style={{ ...styles.modalTitle, marginTop: 14 }}>
              {lastNfaAction === 'activated'
                ? 'Matagumpay na Naitakda ang NFA Alert!'
                : 'Na-disable na ang NFA Volatility Alert'}
            </h2>
            <p style={{ ...styles.modalText, margin: '8px 0 22px' }}>
              {lastNfaAction === 'activated'
                ? 'Naabisuhan na ang sistema ukol sa mataas na volatility mula sa NFA. Aktibo na ang safeguards at price clamps para sa lahat ng transaksyon.'
                : 'Ibinalik na ang karaniwang pricing mode. Mananatiling sinusubaybayan ang PSA benchmarks.'}
            </p>

            <button
              type="button"
              onClick={() => setShowNfaSuccessModal(false)}
              style={styles.submitButtonGreenFull}>
              Naintindihan
            </button>
          </div>
        </div>
      ) : null}
    </ConsoleLayout>
  );
}

function PriceBenchmarkCard({
  dryBase,
  weeklyBars,
  effectiveDate,
}: {
  dryBase: number | null;
  weeklyBars: ReturnType<typeof toWeeklyBars>;
  effectiveDate: string | null;
}) {
  return (
    <article className="animo-card" style={styles.panel}>
      <div>
        <h2 style={styles.panelTitle}>Benchmark ng Presyo sa Rehiyon</h2>
        <p style={styles.panelSubtitle}>PSA Rizal · cached model dry base</p>
      </div>

      <div style={styles.priceHeadline}>
        <span style={styles.priceValue}>{dryBase != null ? formatPeso(dryBase) : '—'}</span>
        <span style={styles.priceUnit}>kada kilo (dry)</span>
      </div>

      <div style={styles.priceMeta}>
        <span style={styles.priceSource}>
          Sanggunian: marketpricefeed{effectiveDate ? ` · ${effectiveDate}` : ''}
        </span>
      </div>

      <div style={styles.chart}>
        {weeklyBars.length === 0 ? (
          <span style={styles.priceSource}>Walang price history pa.</span>
        ) : (
          weeklyBars.map((bar) => (
            <div key={`${bar.day}-${bar.pricePerKg}`} style={styles.chartColumn}>
              {bar.active ? <span style={styles.chartValue}>{formatPeso(bar.pricePerKg)}</span> : null}
              <div
                style={{
                  ...styles.chartBar,
                  height: `${bar.level * 100}%`,
                  background: bar.active ? 'var(--animo-green)' : 'var(--animo-green-tint)',
                }}
              />
              <span style={styles.chartDay}>{bar.day}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function PricingConfidenceCard({ nfaActive }: { nfaActive: boolean }) {
  return (
    <article className="animo-card" style={styles.panel}>
      <div style={styles.panelHead}>
        <div>
          <h2 style={styles.panelTitle}>Market Pricing Confidence</h2>
          <p style={styles.panelSubtitle}>NFA intervention window signal</p>
        </div>
        <span style={nfaActive ? styles.warningBadge : styles.normalBadge}>
          {nfaActive ? 'Elevated' : 'Normal'}
        </span>
      </div>

      <div style={styles.meterTrack}>
        <span style={{ ...styles.meterSegment, background: nfaActive ? 'var(--animo-border)' : 'var(--animo-green)' }} />
        <span style={{ ...styles.meterSegment, background: nfaActive ? 'var(--animo-warning)' : 'var(--animo-border)' }} />
        <span style={{ ...styles.meterSegment, background: 'var(--animo-border)' }} />
      </div>

      <dl style={styles.statList}>
        <StatRow
          label="Kasalukuyang katayuan"
          value={nfaActive ? 'May aktibong NFA window' : 'Normal — walang aktibong window'}
        />
        <StatRow label="Pinagmulan" value="nfa_intervention_window (LGU toggle)" />
      </dl>
    </article>
  );
}


function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statRow}>
      <dt style={styles.statLabel}>{label}</dt>
      <dd style={styles.statValue}>{value}</dd>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 18,
    alignItems: 'stretch',
  },
  metricCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 22,
    background: 'var(--animo-white)',
    border: '1px solid var(--animo-border)',
    borderRadius: 'var(--animo-radius-lg)',
  },
  metricTop: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  metricHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricLabel: { fontSize: 15, fontWeight: 600, color: 'var(--animo-black-secondary)' },
  metricIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    flexShrink: 0,
  },
  metricValue: { fontSize: 34, fontWeight: 800, lineHeight: '38px', color: 'var(--animo-black)', margin: '4px 0 2px' },
  comparisonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  trendPillGreen: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 12,
    fontWeight: 700,
  },
  comparisonText: {
    fontSize: 12.5,
    color: 'var(--animo-black-secondary)',
    fontWeight: 500,
  },
  metricBottom: {
    marginTop: 14,
    paddingTop: 12,
    borderTop: '1px solid var(--animo-border)',
  },
  metricDelta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12.5,
    color: 'var(--animo-black-secondary)',
    flexWrap: 'wrap',
  },
  pastValueText: {
    fontWeight: 700,
    color: 'var(--animo-black)',
  },
  deltaDot: {
    color: 'var(--animo-muted)',
  },
  actionCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 22,
    justifyContent: 'space-between',
    borderRadius: 'var(--animo-radius-lg)',
    transition: 'all 150ms ease',
  },
  actionCardActiveBorder: {
    border: '1.5px solid var(--animo-green)',
    background: '#FAFDF9',
  },
  actionCardInactiveBorder: {
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-white)',
  },
  actionCardHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionBadgeActive: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  actionBadgeInactive: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-surface)',
    color: 'var(--animo-black-secondary)',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  actionBadgePsa: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  actionCardTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: 'var(--animo-black)',
  },
  actionIconCircleActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    background: 'var(--animo-green-tint)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionIconCircleInactive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    background: 'var(--animo-surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionIconCircleDisable: {
    width: 44,
    height: 44,
    borderRadius: 22,
    background: 'var(--animo-danger-tint)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionIconCirclePsa: {
    width: 40,
    height: 40,
    borderRadius: 20,
    background: 'var(--animo-green-tint)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionCardDesc: {
    margin: 0,
    fontSize: 13.5,
    lineHeight: '19px',
    color: 'var(--animo-black-secondary)',
  },
  actionCardStatusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 13.5,
    padding: '8px 0',
    borderTop: '1px solid var(--animo-border)',
  },
  actionStatusLabel: {
    color: 'var(--animo-muted)',
  },
  actionStatusValue: {
    fontWeight: 700,
  },
  actionButtonGreen: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '12px 16px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: 'var(--animo-green)',
    color: 'var(--animo-white)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 120ms ease',
  },
  actionButtonDisable: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '12px 16px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-danger)',
    background: 'var(--animo-danger-tint)',
    color: 'var(--animo-danger)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 120ms ease',
  },
  actionButtonPsa: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '12px 16px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-green)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 120ms ease',
  },
  midRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: 18,
    alignItems: 'start',
  },
  panel: { display: 'flex', flexDirection: 'column', gap: 16, padding: 24 },
  panelHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  panelTitle: { margin: '0 0 4px', fontSize: 20, fontWeight: 800 },
  panelSubtitle: { margin: 0, fontSize: 14, color: 'var(--animo-black-secondary)' },
  priceHeadline: { display: 'flex', alignItems: 'baseline', gap: 10 },
  priceValue: { fontSize: 36, fontWeight: 800, color: 'var(--animo-green)' },
  priceUnit: { fontSize: 15, color: 'var(--animo-black-secondary)' },
  priceMeta: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  pricePill: {
    padding: '5px 12px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 13,
    fontWeight: 700,
  },
  priceSource: { fontSize: 13, color: 'var(--animo-muted)' },
  chart: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 12,
    height: 160,
    alignItems: 'end',
  },
  chartColumn: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    height: '100%',
  },
  chartValue: { fontSize: 13, fontWeight: 700, color: 'var(--animo-green)' },
  chartBar: { width: '100%', borderRadius: 'var(--animo-radius-sm)', minHeight: 10 },
  chartDay: { fontSize: 13, color: 'var(--animo-black-secondary)', fontWeight: 600 },
  normalBadge: {
    padding: '5px 14px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 13,
    fontWeight: 700,
  },
  warningBadge: {
    padding: '5px 14px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-warning-tint, #FEF3C7)',
    color: 'var(--animo-warning, #D97706)',
    fontSize: 13,
    fontWeight: 700,
  },
  loadNotice: {
    margin: '0 0 12px',
    color: 'var(--animo-black-secondary)',
    fontSize: 14,
  },
  errorNotice: {
    margin: '0 0 12px',
    color: 'var(--animo-danger)',
    fontSize: 14,
  },
  meterTrack: { display: 'flex', gap: 8 },
  meterSegment: { flex: 1, height: 8, borderRadius: 'var(--animo-radius-pill)' },
  legendRow: { display: 'flex', gap: 18, flexWrap: 'wrap' },
  legendItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'var(--animo-black-secondary)',
    fontWeight: 600,
  },
  legendDot: { width: 10, height: 10, borderRadius: '50%' },
  statList: { margin: 0, display: 'flex', flexDirection: 'column' },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '11px 0',
    borderTop: '1px solid var(--animo-border)',
  },
  statLabel: { margin: 0, fontSize: 14, color: 'var(--animo-black-secondary)' },
  statValue: { margin: 0, fontSize: 14, fontWeight: 700, textAlign: 'right' },
  calloutWarning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 'var(--animo-radius-md)',
    background: 'var(--animo-warning-tint)',
    border: '1px solid var(--animo-warning-border)',
    fontSize: 14,
    lineHeight: '20px',
    color: 'var(--animo-black-secondary)',
  },
  calloutInfoBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 'var(--animo-radius-md)',
    background: '#EFF6FF',
    border: '1px solid #BFDBFE',
    fontSize: 14,
    lineHeight: '20px',
    color: '#1E40AF',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    background: 'var(--animo-white)',
    borderRadius: 'var(--animo-radius-lg)',
    padding: 26,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
  },
  modalHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalTitle: { margin: 0, fontSize: 20, fontWeight: 800 },
  modalSubtitle: { margin: '2px 0 0', fontSize: 13, color: 'var(--animo-muted)' },
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
    gap: 14,
  },
  modalText: {
    margin: 0,
    fontSize: 15,
    lineHeight: '22px',
    color: 'var(--animo-black-secondary)',
  },
  calloutWarningBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 'var(--animo-radius-md)',
    background: 'var(--animo-warning-tint)',
    border: '1px solid var(--animo-warning-border)',
    fontSize: 14,
    lineHeight: '20px',
    color: 'var(--animo-black-secondary)',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    padding: '12px 20px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'transparent',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmButtonGreen: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 22px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: 'var(--animo-green)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  confirmButtonDisable: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 22px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: 'var(--animo-danger)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  submitButtonGreenFull: {
    padding: '14px 24px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: 'var(--animo-green)',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 700,
    width: '100%',
    cursor: 'pointer',
  },
  successIconBig: {
    width: 68,
    height: 68,
    borderRadius: 34,
    background: 'var(--animo-green-tint)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
};
