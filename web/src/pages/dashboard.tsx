import { useEffect, useMemo, useState } from 'react';
import {
  Coins,
  Database,
  Gavel,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import { VOLATILITY_LOG } from '@/constants/dashboard';
import {
  fetchMarketPriceFeed,
  fetchNfaInterventionWindows,
  fetchRizalPriceHistory,
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
  const [priceFeed, setPriceFeed] = useState<MarketPriceFeed | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [nfaActive, setNfaActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([fetchMarketPriceFeed(), fetchRizalPriceHistory(12), fetchNfaInterventionWindows()])
      .then(([feed, history, windows]) => {
        if (cancelled) return;
        setPriceFeed(feed);
        setPriceHistory(history);
        setNfaActive(isNfaWindowActiveToday(windows));
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Hindi ma-load ang dashboard data.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const weeklyBars = useMemo(() => toWeeklyBars(priceHistory, 7), [priceHistory]);
  const latestHistory = priceHistory.at(-1);
  const previousHistory = priceHistory.at(-2);
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
              {latestHistory ? formatPeso(latestHistory.pricePerKg) : '—'}
            </div>
            {benchmarkDelta ? (
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
              <span>kada kilo · PSA OpenSTAT · Rizal province</span>
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
            Binabasa mula sa nfa_intervention_window. Ang pag-edit ay nangangailangan ng LGU login (paparating).
          </p>

          <div style={styles.actionCardStatusRow}>
            <span style={styles.actionStatusLabel}>Katayuan ngayon:</span>
            <span
              style={{
                ...styles.actionStatusValue,
                color: nfaActive ? 'var(--animo-green)' : 'var(--animo-muted)',
              }}>
              {nfaActive ? '● May aktibong window' : '○ Walang aktibong window'}
            </span>
          </div>
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
            Huling buwan sa palay_price_history. Ang sync-psa-prices edge function ay ops/LGU auth — hindi pa naka-wire dito.
          </p>

          <div style={styles.actionCardStatusRow}>
            <span style={styles.actionStatusLabel}>Huling tala:</span>
            <span style={styles.actionStatusValue}>{lastSyncTime}</span>
          </div>

          <button type="button" disabled style={{ ...styles.actionButtonPsa, opacity: 0.55, cursor: 'not-allowed' }}>
            <RefreshCw size={18} />
            I-sync mula sa PSA (kailangan ng auth)
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

      <VolatilityLogCard />
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
        <StatRow label="Pinagmulan" value="nfa_intervention_window (read-only)" />
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

function VolatilityLogCard() {
  return (
    <article className="animo-card" style={styles.panel}>
      <div style={styles.panelHead}>
        <div>
          <h2 style={styles.panelTitle}>Price Volatility Log</h2>
          <p style={styles.panelSubtitle}>
            Tier 2 (clamped) at Tier 3 (fallback · kinumpirma ng magsasaka) na
            listing lamang
          </p>
        </div>
        <div style={styles.tierLegend}>
          <span style={{ ...styles.tierBadge, ...styles.tierClamped }}>
            Tier 2 · Clamped
          </span>
          <span style={{ ...styles.tierBadge, ...styles.tierFallback }}>
            Tier 3 · Fallback
          </span>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Listing ID', 'Uri ng Palay', 'Presyo/Kilo', 'Tier', 'Katayuan', 'Petsa'].map(
                (heading) => (
                  <th key={heading} style={styles.th}>
                    {heading.toUpperCase()}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {VOLATILITY_LOG.map((row) => (
              <tr key={row.listingId}>
                <td style={{ ...styles.td, fontWeight: 700 }}>{row.listingId}</td>
                <td style={styles.td}>{row.variety}</td>
                <td style={styles.td}>
                  {row.priceFrom} → {row.priceTo}
                </td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.tierBadge,
                      ...(row.tier === 'clamped'
                        ? styles.tierClamped
                        : styles.tierFallback),
                    }}>
                    {row.tier === 'clamped' ? 'Tier 2 · Clamped' : 'Tier 3 · Fallback'}
                  </span>
                </td>
                <td style={styles.td}>{row.status}</td>
                <td style={{ ...styles.td, color: 'var(--animo-black-secondary)' }}>
                  {row.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
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
  tierLegend: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  tierBadge: {
    display: 'inline-block',
    padding: '5px 12px',
    borderRadius: 'var(--animo-radius-pill)',
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  tierClamped: { background: 'var(--animo-caution-tint)', color: '#8A6D12' },
  tierFallback: {
    background: 'var(--animo-danger-tint)',
    color: 'var(--animo-danger)',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 780 },
  th: {
    textAlign: 'left',
    padding: '12px 14px',
    background: 'var(--animo-surface)',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.4,
    color: 'var(--animo-black-secondary)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '14px',
    borderTop: '1px solid var(--animo-border)',
    fontSize: 15,
    whiteSpace: 'nowrap',
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
