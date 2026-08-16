import { useState } from 'react';
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
import {
  PRICE_WEEK,
  VOLATILITY_LOG,
} from '@/constants/dashboard';

export type DashboardPageProps = {
  onSignOut: () => void;
};

/** LGU monitoring dashboard — metrics row with historical comparison, NFA Fallback & PSA cards, price benchmark, and volatility log. */
export function DashboardPage({ onSignOut }: DashboardPageProps) {
  // NFA Volatility Warning Toggle State
  const [nfaActive, setNfaActive] = useState(true);
  const [showNfaModal, setShowNfaModal] = useState(false);
  const [showNfaSuccessModal, setShowNfaSuccessModal] = useState(false);
  const [lastNfaAction, setLastNfaAction] = useState<'activated' | 'disabled'>('activated');

  // PSA Sync Modal / State
  const [isSyncingPsa, setIsSyncingPsa] = useState(false);
  const [showPsaSuccessModal, setShowPsaSuccessModal] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Okt 12, 2025 · 08:00 AM');

  const handleToggleNfaConfirm = () => {
    if (nfaActive) {
      setNfaActive(false);
      setLastNfaAction('disabled');
    } else {
      setNfaActive(true);
      setLastNfaAction('activated');
    }
    setShowNfaModal(false);
    setShowNfaSuccessModal(true);
  };

  const handleSyncPsa = () => {
    setIsSyncingPsa(true);
    setTimeout(() => {
      setIsSyncingPsa(false);
      setLastSyncTime(
        `Ngayong ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
      );
      setShowPsaSuccessModal(true);
    }, 1000);
  };

  return (
    <ConsoleLayout
      title="Dashboard"
      subtitle="Pangunahing Tanaw · LGU San Mateo, Rizal · Okt 12, 2025"
      onSignOut={onSignOut}>
      {/* Top Cards Grid */}
      <section style={styles.topCardsGrid}>
        {/* Forecast Accuracy Card with Historical Comparison */}
        <article className="animo-card" style={styles.metricCard}>
          <div style={styles.metricTop}>
            <div style={styles.metricHead}>
              <span style={styles.metricLabel}>Forecast accuracy</span>
              <span style={styles.metricIcon}>
                <TrendingUp size={20} color="var(--animo-green)" />
              </span>
            </div>
            <div style={styles.metricValue}>88.5%</div>
            <div style={styles.comparisonRow}>
              <span style={styles.trendPillGreen}>
                <TrendingUp size={14} /> +3.2%
              </span>
              <span style={styles.comparisonText}>kumpara noong nakaraang buwan</span>
            </div>
          </div>

          <div style={styles.metricBottom}>
            <div style={styles.metricDelta}>
              <span style={styles.pastValueText}>Dating 85.3%</span>
              <span style={styles.deltaDot}>•</span>
              <span>Batay sa 30-araw na tala ng panahon</span>
            </div>
          </div>
        </article>

        {/* Farmgate Benchmark Card with Historical Comparison */}
        <article className="animo-card" style={styles.metricCard}>
          <div style={styles.metricTop}>
            <div style={styles.metricHead}>
              <span style={styles.metricLabel}>Farmgate benchmark</span>
              <span style={styles.metricIcon}>
                <Coins size={20} color="var(--animo-green)" />
              </span>
            </div>
            <div style={styles.metricValue}>₱16.40</div>
            <div style={styles.comparisonRow}>
              <span style={styles.trendPillGreen}>
                <TrendingUp size={14} /> +₱0.40 (+2.5%)
              </span>
              <span style={styles.comparisonText}>tumaas vs nakaraang linggo</span>
            </div>
          </div>

          <div style={styles.metricBottom}>
            <div style={styles.metricDelta}>
              <span style={styles.pastValueText}>Dating ₱16.00/kg</span>
              <span style={styles.deltaDot}>•</span>
              <span>kada kilo · Region III Average</span>
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

          {/* Toggle Button: Activate or Disable */}
          {nfaActive ? (
            <button
              type="button"
              onClick={() => setShowNfaModal(true)}
              style={styles.actionButtonDisable}>
              <PauseCircle size={18} />
              I-disable ang NFA Volatility Alert
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowNfaModal(true)}
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
            Kumuha ng pinakabagong opisyal na presyo ng palay mula sa Philippine Statistics Authority.
          </p>

          <div style={styles.actionCardStatusRow}>
            <span style={styles.actionStatusLabel}>Huling na-sync:</span>
            <span style={styles.actionStatusValue}>{lastSyncTime}</span>
          </div>

          <button
            type="button"
            onClick={handleSyncPsa}
            disabled={isSyncingPsa}
            style={styles.actionButtonPsa}>
            <RefreshCw
              size={18}
              style={{
                animation: isSyncingPsa ? 'spin 1s linear infinite' : undefined,
              }}
            />
            {isSyncingPsa ? 'Kasalukuyang nag-si-sync...' : 'I-sync mula sa PSA'}
          </button>
        </article>
      </section>

      {/* Middle Row */}
      <section style={styles.midRow}>
        <PriceBenchmarkCard />
        <PricingConfidenceCard />
      </section>

      {/* Volatility Log Table */}
      <VolatilityLogCard />

      {/* NFA Confirmation Modal */}
      {showNfaModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={
                    nfaActive
                      ? styles.actionIconCircleDisable
                      : styles.actionIconCircleActive
                  }>
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
              <button
                type="button"
                onClick={() => setShowNfaModal(false)}
                style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                {nfaActive
                  ? 'Sigurado ka bang nais mong i-disable ang NFA Volatility Safeguard? Ibabalik ang karaniwang pricing algorithm sa platform.'
                  : 'Sigurado ka bang nais mong ipaalam sa sistema na may biglaang pagbabago sa presyo ng NFA? Awtomatikong ia-activate ng algorithm ang price stabilization at volatility clamps para sa proteksyon ng merkado.'}
              </p>

              <div
                style={
                  nfaActive
                    ? styles.calloutInfoBox
                    : styles.calloutWarningBox
                }>
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
              <button
                type="button"
                onClick={() => setShowNfaModal(false)}
                style={styles.cancelButton}>
                Huwag Ituloy
              </button>
              {nfaActive ? (
                <button
                  type="button"
                  onClick={handleToggleNfaConfirm}
                  style={styles.confirmButtonDisable}>
                  <PauseCircle size={18} />
                  Oo, I-disable ang Alerto
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleNfaConfirm}
                  style={styles.confirmButtonGreen}>
                  <Gavel size={18} />
                  Oo, I-activate ang Alerto
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NFA Success Modal */}
      {showNfaSuccessModal && (
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
                : 'Matagumpay na ibinalik ang standard pricing algorithm sa marketplace.'}
            </p>

            <button
              type="button"
              onClick={() => setShowNfaSuccessModal(false)}
              style={styles.submitButtonGreenFull}>
              Naiintindihan Ko
            </button>
          </div>
        </div>
      )}

      {/* PSA Sync Success Modal */}
      {showPsaSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: 480, textAlign: 'center' }}>
            <div style={styles.successIconBig}>
              <CheckCircle2 size={46} color="var(--animo-green)" />
            </div>

            <h2 style={{ ...styles.modalTitle, marginTop: 14 }}>
              Matagumpay na Na-sync mula sa PSA!
            </h2>
            <p style={{ ...styles.modalText, margin: '8px 0 22px' }}>
              Na-update na ang pinakabagong lingguhang opisyal na presyo ng palay mula sa
              Philippine Statistics Authority (PSA Region III average: ₱16.40/kg).
            </p>

            <button
              type="button"
              onClick={() => setShowPsaSuccessModal(false)}
              style={styles.submitButtonGreenFull}>
              Magpatuloy
            </button>
          </div>
        </div>
      )}
    </ConsoleLayout>
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
          size={18}
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
    gridTemplateColumns: `repeat(${PRICE_WEEK.length}, 1fr)`,
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
