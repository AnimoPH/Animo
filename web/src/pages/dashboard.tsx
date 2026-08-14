import { CloudDrizzle, Coins, TrendingUp, TriangleAlert } from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import {
  METRICS,
  PRICE_WEEK,
  VOLATILITY_LOG,
  type Metric,
} from '@/constants/dashboard';

export type DashboardPageProps = {
  onSignOut: () => void;
};

const METRIC_ICONS = {
  advisory: CloudDrizzle,
  forecast: TrendingUp,
  benchmark: Coins,
} as const;

/** LGU monitoring dashboard — metric row, price benchmark and volatility log. */
export function DashboardPage({ onSignOut }: DashboardPageProps) {
  return (
    <ConsoleLayout
      title="Dashboard"
      subtitle="Pangunahing Tanaw · LGU San Mateo, Rizal · Okt 12, 2025"
      onSignOut={onSignOut}>
      <section style={styles.metricRow}>
        {METRICS.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </section>

      <section style={styles.midRow}>
        <PriceBenchmarkCard />
        <PricingConfidenceCard />
      </section>

      <VolatilityLogCard />
    </ConsoleLayout>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = METRIC_ICONS[metric.icon];
  return (
    <article className="animo-card" style={styles.metricCard}>
      <div style={styles.metricHead}>
        <span style={styles.metricLabel}>{metric.label}</span>
        <span style={styles.metricIcon}>
          <Icon size={18} color="var(--animo-green)" />
        </span>
      </div>
      <div style={styles.metricValue}>{metric.value}</div>
      <div style={styles.metricDelta}>
        <TrendingUp size={14} color="var(--animo-green)" />
        {metric.delta}
      </div>
    </article>
  );
}

function PriceBenchmarkCard() {
  return (
    <article className="animo-card" style={styles.panel}>
      <div>
        <h2 style={styles.panelTitle}>Benchmark ng Presyo sa Rehiyon</h2>
        <p style={styles.panelSubtitle}>Regional farmgate price · Region III</p>
      </div>

      <div style={styles.priceHeadline}>
        <span style={styles.priceValue}>₱16.40</span>
        <span style={styles.priceUnit}>kada kilo</span>
      </div>

      <div style={styles.priceMeta}>
        <span style={styles.pricePill}>+2.4% vs nakaraang linggo</span>
        <span style={styles.priceSource}>Sanggunian: DA–PhilRice, Okt 12</span>
      </div>

      <div style={styles.chart}>
        {PRICE_WEEK.map((bar) => (
          <div key={bar.day} style={styles.chartColumn}>
            {bar.active ? <span style={styles.chartValue}>₱16.40</span> : null}
            <div
              style={{
                ...styles.chartBar,
                height: `${bar.level * 100}%`,
                background: bar.active
                  ? 'var(--animo-green)'
                  : 'var(--animo-green-tint)',
              }}
            />
            <span style={styles.chartDay}>{bar.day}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function PricingConfidenceCard() {
  return (
    <article className="animo-card" style={styles.panel}>
      <div style={styles.panelHead}>
        <div>
          <h2 style={styles.panelTitle}>Market Pricing Confidence</h2>
          <p style={styles.panelSubtitle}>Antas ng volatility ng presyo</p>
        </div>
        <span style={styles.normalBadge}>Normal</span>
      </div>

      <div style={styles.meterTrack}>
        <span style={{ ...styles.meterSegment, background: 'var(--animo-green)' }} />
        <span style={{ ...styles.meterSegment, background: 'var(--animo-border)' }} />
        <span style={{ ...styles.meterSegment, background: 'var(--animo-border)' }} />
      </div>

      <div style={styles.legendRow}>
        <Legend color="var(--animo-green)" label="Normal" />
        <Legend color="var(--animo-warning)" label="Elevated volatility" />
        <Legend color="var(--animo-danger)" label="High volatility" />
      </div>

      <dl style={styles.statList}>
        <StatRow label="Volatility index" value="0.42 (threshold 0.75)" />
        <StatRow label="Kasalukuyang katayuan" value="Normal — walang clamp na aktibo" />
        <StatRow label="Huling pagbabago" value="Okt 11, 2025 · 06:00 PM" />
      </dl>

      <div style={styles.calloutWarning}>
        <TriangleAlert
          size={16}
          color="var(--animo-warning)"
          style={{ flexShrink: 0, marginTop: 1 }}
        />
        <span>
          Kapag Elevated: awtomatikong nagki-clamp ng presyo (Tier 2) at
          humihingi ng kumpirmasyon sa magsasaka (Tier 3).
        </span>
      </div>
    </article>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={styles.legendItem}>
      <span style={{ ...styles.legendDot, background: color }} />
      {label}
    </span>
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
                <td style={{ ...styles.td, fontWeight: 600 }}>{row.listingId}</td>
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
  metricRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 16,
  },
  metricCard: { display: 'flex', flexDirection: 'column', gap: 10, padding: 18 },
  metricHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricLabel: { fontSize: 13, color: 'var(--animo-black-secondary)' },
  metricIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    flexShrink: 0,
  },
  metricValue: { fontSize: 32, fontWeight: 700, lineHeight: '38px' },
  metricDelta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: 'var(--animo-black-secondary)',
  },
  midRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: 16,
    alignItems: 'start',
  },
  panel: { display: 'flex', flexDirection: 'column', gap: 14, padding: 20 },
  panelHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  panelTitle: { margin: '0 0 4px', fontSize: 18, fontWeight: 700 },
  panelSubtitle: { margin: 0, fontSize: 12, color: 'var(--animo-black-secondary)' },
  priceHeadline: { display: 'flex', alignItems: 'baseline', gap: 8 },
  priceValue: { fontSize: 32, fontWeight: 700, color: 'var(--animo-green)' },
  priceUnit: { fontSize: 13, color: 'var(--animo-black-secondary)' },
  priceMeta: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  pricePill: {
    padding: '4px 10px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 11,
    fontWeight: 600,
  },
  priceSource: { fontSize: 11, color: 'var(--animo-muted)' },
  chart: {
    display: 'grid',
    gridTemplateColumns: `repeat(${PRICE_WEEK.length}, 1fr)`,
    gap: 10,
    height: 150,
    alignItems: 'end',
  },
  chartColumn: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    height: '100%',
  },
  chartValue: { fontSize: 11, fontWeight: 600, color: 'var(--animo-green)' },
  chartBar: { width: '100%', borderRadius: 'var(--animo-radius-sm)', minHeight: 8 },
  chartDay: { fontSize: 11, color: 'var(--animo-black-secondary)' },
  normalBadge: {
    padding: '4px 12px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 11,
    fontWeight: 600,
  },
  meterTrack: { display: 'flex', gap: 6 },
  meterSegment: { flex: 1, height: 6, borderRadius: 'var(--animo-radius-pill)' },
  legendRow: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  legendItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: 'var(--animo-black-secondary)',
  },
  legendDot: { width: 8, height: 8, borderRadius: '50%' },
  statList: { margin: 0, display: 'flex', flexDirection: 'column' },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '9px 0',
    borderTop: '1px solid var(--animo-border)',
  },
  statLabel: { margin: 0, fontSize: 12, color: 'var(--animo-black-secondary)' },
  statValue: { margin: 0, fontSize: 12, fontWeight: 600, textAlign: 'right' },
  calloutWarning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 'var(--animo-radius-md)',
    background: 'var(--animo-warning-tint)',
    border: '1px solid var(--animo-warning-border)',
    fontSize: 12,
    lineHeight: '17px',
    color: 'var(--animo-black-secondary)',
  },
  tierLegend: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  tierBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 'var(--animo-radius-pill)',
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  tierClamped: { background: 'var(--animo-caution-tint)', color: '#8A6D12' },
  tierFallback: {
    background: 'var(--animo-danger-tint)',
    color: 'var(--animo-danger)',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 760 },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    background: 'var(--animo-surface)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.4,
    color: 'var(--animo-black-secondary)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '14px 12px',
    borderTop: '1px solid var(--animo-border)',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
};
