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
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/lib/auth-context';
import {
  activateNfaInterventionWindow,
  deactivateNfaInterventionWindows,
  fetchMarketPriceFeed,
  fetchMarketStatus,
  fetchNfaInterventionWindows,
  fetchRizalPriceHistory,
  syncPsaPrices,
  formatPeso,
  formatSyncTimestamp,
  isNfaWindowActiveToday,
  priceDelta,
  toMonthlyBars,
  type MarketPriceFeed,
  type MarketStatus,
  type PriceHistoryPoint,
} from '@/services/lgu-console-service';

export type DashboardPageProps = {
  onSignOut: () => void;
};

/** LGU monitoring dashboard — live price feed and PSA history from Supabase (auth stub unchanged). */
export function DashboardPage({ onSignOut }: DashboardPageProps) {
  const { session } = useAuth();
  const { t, isTagalog } = useLanguage();
  const [priceFeed, setPriceFeed] = useState<MarketPriceFeed | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [nfaActive, setNfaActive] = useState(false);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
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

    // Market status is fetched separately from the rest: it depends on a
    // temporary demo-only tunnel (Sec. 21.16/21.17) that's often not
    // running, so its own unavailability must never block or error out the
    // rest of the dashboard.
    fetchMarketStatus()
      .then(setMarketStatus)
      .catch(() => setMarketStatus({ available: false, reason: t('common.notAvailable') }));

    return Promise.all([fetchMarketPriceFeed(), fetchRizalPriceHistory(12), fetchNfaInterventionWindows()])
      .then(([feed, history, windows]) => {
        setPriceFeed(feed);
        setPriceHistory(history);
        setNfaActive(isNfaWindowActiveToday(windows));
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : t('common.error'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useAutoRefresh(() => void loadDashboard());

  async function handlePsaSync() {
    setSyncing(true);
    setSyncNotice(null);
    try {
      const result = await syncPsaPrices();
      await loadDashboard();
      const dryNote = result.dryBaseRefreshed
        ? isTagalog
          ? 'Na-refresh din ang model dry base.'
          : 'Model dry base refreshed.'
        : isTagalog
          ? 'Na-save ang PSA history; dry base nanatili (walang pricing service o kulang ang 12 buwan).'
          : 'PSA history saved; dry base unchanged (no pricing service or fewer than 12 months).';
      setSyncNotice(
        isTagalog
          ? `Na-sync ang ${result.syncedMonths} buwan mula sa PSA. ${dryNote}`
          : `Synced ${result.syncedMonths} months from PSA. ${dryNote}`,
      );
    } catch (error) {
      setSyncNotice(
        error instanceof Error
          ? error.message
          : isTagalog
            ? 'Hindi natapos ang PSA sync.'
            : 'PSA sync failed.',
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleNfaConfirm() {
    const userId = session?.userId;
    if (!userId) {
      setLoadError(
        isTagalog
          ? 'Kailangan ng LGU login para i-toggle ang NFA window.'
          : 'LGU login required to toggle NFA window.',
      );
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
      setLoadError(
        error instanceof Error
          ? error.message
          : isTagalog
            ? 'Hindi ma-update ang NFA window.'
            : 'Failed to update NFA window.',
      );
      setShowNfaModal(false);
    } finally {
      setTogglingNfa(false);
    }
  }

  const monthlyBars = useMemo(() => toMonthlyBars(priceHistory, 7, isTagalog), [priceHistory, isTagalog]);
  const latestHistory = priceHistory.at(-1);
  const previousHistory = priceHistory.at(-2);
  const psaFarmgate = latestHistory?.pricePerKg ?? null;
  const dryBase = priceFeed?.dryBasePerKg ?? latestHistory?.pricePerKg ?? null;
  const benchmarkDelta = dryBase != null ? priceDelta(dryBase, previousHistory?.pricePerKg) : null;
  const lastSyncTime = latestHistory ? formatSyncTimestamp(latestHistory.month, isTagalog) : t('common.none');

  return (
    <ConsoleLayout
      title={t('dash.title')}
      subtitle={`${t('dash.subtitle')} · Rizal · ${priceFeed?.effectiveDate ?? '—'}`}
      onSignOut={onSignOut}>
      {loading ? <p style={styles.loadNotice}>{t('common.loading')}</p> : null}
      {loadError ? <p style={styles.errorNotice}>{loadError}</p> : null}
      {/* Top Cards Grid */}
      <section style={styles.topCardsGrid}>
        <article className="animo-card" style={styles.metricCard}>
          <div style={styles.metricTop}>
            <div style={styles.metricHead}>
              <span style={styles.metricLabel}>
                {isTagalog ? 'Presyo ng Patuyong Palay (Dry Base)' : 'Dry Base Price'}
              </span>
              <span style={styles.metricIcon}>
                <TrendingUp size={20} color="var(--animo-green)" />
              </span>
            </div>
            <div style={styles.metricValue}>{dryBase != null ? formatPeso(dryBase) : '—'}</div>
            <div style={styles.comparisonRow}>
              <span style={styles.comparisonText}>
                {isTagalog ? 'Awtomatikong pagtantiya batay sa datos ng PSA' : 'Automated estimate based on PSA data'}
              </span>
            </div>
          </div>
          <div style={styles.metricBottom}>
            <div style={styles.metricDelta}>
              <span>
                {isTagalog ? 'Presyo ng Basang Palay (survey):' : 'Wet Base Price (survey):'}{' '}
                {priceFeed ? formatPeso(priceFeed.wetBasePerKg) : '—'}
              </span>
            </div>
          </div>
        </article>

        <article className="animo-card" style={styles.metricCard}>
          <div style={styles.metricTop}>
            <div style={styles.metricHead}>
              <span style={styles.metricLabel}>{isTagalog ? 'PSA Farmgate sa Rizal' : 'PSA Rizal Farmgate'}</span>
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
                <span style={styles.comparisonText}>
                  {isTagalog ? 'vs nakaraang buwan sa talaan' : 'vs previous month in record'}
                </span>
              </div>
            ) : null}
          </div>
          <div style={styles.metricBottom}>
            <div style={styles.metricDelta}>
              {psaFarmgate != null ? (
                <span>{isTagalog ? 'kada kilo · PSA OpenSTAT · Lalawigan ng Rizal' : 'per kg · PSA OpenSTAT · Rizal province'}</span>
              ) : (
                <span>
                  {isTagalog
                    ? 'Wala pang PSA price history para sa Rizal. I-click ang "I-sync mula sa PSA" sa ibaba.'
                    : 'No PSA price history for Rizal yet. Click "Sync from PSA" below.'}
                </span>
              )}
            </div>
          </div>
        </article>

        {/* NFA Volatility Fallback Card */}
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
                  ? isTagalog
                    ? 'AKTIBO ANG NFA WINDOW'
                    : 'NFA SAFEGUARD WINDOW IS ACTIVE'
                  : isTagalog
                    ? 'NFA Volatility Safeguard Window'
                    : 'NFA Volatility Safeguard Window'}
              </span>
              <h3 style={styles.actionCardTitle}>NFA Volatility Safeguard Window</h3>
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
            {nfaActive
              ? isTagalog
                ? 'Naka-clamp ang presyo sa merkado upang maprotektahan ang mga magsasaka laban sa pagbaba ng presyo.'
                : 'Market prices are clamped with a price floor to protect farmers against extreme drops.'
              : isTagalog
                ? 'Standard na market pricing ang kasalukuyang umiiral nang walang artipisyal na floor clamp.'
                : 'Standard market pricing is in effect without artificial price floor clamps.'}
          </p>

          <div style={styles.actionCardStatusRow}>
            <span style={styles.actionStatusLabel}>{isTagalog ? 'Katayuan:' : 'Status:'}</span>
            <span
              style={{
                ...styles.actionStatusValue,
                color: nfaActive ? 'var(--animo-green)' : 'var(--animo-muted)',
              }}>
              {nfaActive
                ? `● ${isTagalog ? 'Aktibo' : 'Active'}`
                : `○ ${isTagalog ? 'Hindi aktibo' : 'Inactive'}`}
            </span>
          </div>

          {nfaActive ? (
            <button
              type="button"
              onClick={() => setShowNfaModal(true)}
              disabled={togglingNfa}
              style={styles.actionButtonDisable}>
              <PauseCircle size={18} />
              {isTagalog ? 'I-disable ang NFA Volatility Alert' : 'Disable NFA Volatility Alert'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowNfaModal(true)}
              disabled={togglingNfa}
              style={styles.actionButtonGreen}>
              <Gavel size={18} />
              {isTagalog ? 'I-activate ang NFA Volatility Alert' : 'Activate NFA Volatility Alert'}
            </button>
          )}
        </article>

        {/* Sync Market Prices from PSA Card */}
        <article className="animo-card" style={styles.actionCard}>
          <div style={styles.actionCardHead}>
            <div>
              <span style={styles.actionBadgePsa}>
                {isTagalog ? 'Datos ng Merkado mula sa PSA' : 'PSA Market Data'}
              </span>
              <h3 style={styles.actionCardTitle}>
                {isTagalog ? 'I-sync ang Presyo sa Merkado' : 'Sync Market Prices'}
              </h3>
            </div>
            <span style={styles.actionIconCirclePsa}>
              <Database size={22} color="var(--animo-green)" />
            </span>
          </div>

          <p style={styles.actionCardDesc}>
            {isTagalog
              ? 'Kinukuha ang pinakabagong Rizal farmgate prices mula sa PSA. Pagkatapos, awtomatikong iaaply ito sa presyo ng modelo ng ANIMO.'
              : 'Fetches the latest Rizal farmgate prices from PSA, then automatically applies them to the ANIMO pricing model.'}
          </p>

          <div style={styles.actionCardStatusRow}>
            <span style={styles.actionStatusLabel}>{isTagalog ? 'Huling tala:' : 'Last record:'}</span>
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
            {syncing
              ? isTagalog
                ? 'Sini-sync…'
                : 'Syncing…'
              : isTagalog
                ? 'I-sync mula sa PSA'
                : 'Sync from PSA'}
          </button>
        </article>
      </section>

      <section style={styles.midRow}>
        <PriceBenchmarkCard
          dryBase={dryBase}
          monthlyBars={monthlyBars}
          effectiveDate={priceFeed?.effectiveDate ?? latestHistory?.month ?? null}
          isTagalog={isTagalog}
        />
        <MarketPricingConfidenceCard nfaActive={nfaActive} marketStatus={marketStatus} isTagalog={isTagalog} />
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
                      ? isTagalog
                        ? 'I-disable ang NFA Volatility Alert?'
                        : 'Disable NFA Volatility Alert?'
                      : isTagalog
                        ? 'I-activate ang NFA Volatility Alert?'
                        : 'Activate NFA Volatility Alert?'}
                  </h2>
                  <p style={styles.modalSubtitle}>
                    {isTagalog ? 'Protokol sa Pagbabago ng Presyo ng NFA' : 'NFA Price Fallback Protocol'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowNfaModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                {nfaActive
                  ? isTagalog
                    ? 'Sigurado ka bang nais mong i-disable ang NFA Volatility Safeguard? Ibabalik ang karaniwang pricing algorithm sa platform.'
                    : 'Are you sure you want to disable the NFA Volatility Safeguard? Standard pricing algorithm will be restored.'
                  : isTagalog
                    ? 'Sigurado ka bang nais mong ipaalam sa sistema na may biglaang pagbabago sa presyo ng NFA? Awtomatikong ia-activate ng algorithm ang price stabilization at volatility clamps para sa proteksyon ng merkado.'
                    : 'Are you sure you want to notify the system of sudden NFA price volatility? The algorithm will automatically activate price stabilization and volatility clamps to protect the market.'}
              </p>

              <div style={nfaActive ? styles.calloutInfoBox : styles.calloutWarningBox}>
                <TriangleAlert
                  size={20}
                  color={nfaActive ? 'var(--animo-green)' : 'var(--animo-warning)'}
                  style={{ flexShrink: 0 }}
                />
                <span>
                  {nfaActive
                    ? isTagalog
                      ? 'Mananatiling sinusubaybayan ng sistema ang live PSA benchmarks kahit naka-disable ang emergency fallback.'
                      : 'The system will continue monitoring live PSA benchmarks even when the emergency fallback is disabled.'
                    : isTagalog
                      ? 'Awtomatikong magpapatupad ang ANIMO ng price clamps (Tier 2/3) upang protektahan ang mga magsasaka laban sa abnormal na pagbagsak o pagtaas ng presyo.'
                      : 'ANIMO will automatically implement price clamps (Tier 2/3) to protect farmers against abnormal price drops or spikes.'}
                </span>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button type="button" onClick={() => setShowNfaModal(false)} style={styles.cancelButton}>
                {isTagalog ? 'Huwag Ituloy' : 'Cancel'}
              </button>
              {nfaActive ? (
                <button
                  type="button"
                  onClick={() => void handleToggleNfaConfirm()}
                  disabled={togglingNfa}
                  style={styles.confirmButtonDisable}>
                  <PauseCircle size={18} />
                  {isTagalog ? 'Oo, I-disable ang Alerto' : 'Yes, Disable Alert'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleToggleNfaConfirm()}
                  disabled={togglingNfa}
                  style={styles.confirmButtonGreen}>
                  <Gavel size={18} />
                  {isTagalog ? 'Oo, I-activate ang Alerto' : 'Yes, Activate Alert'}
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
                ? isTagalog
                  ? 'Matagumpay na Naitakda ang NFA Alert!'
                  : 'NFA Alert Successfully Activated!'
                : isTagalog
                  ? 'Na-disable na ang NFA Volatility Alert'
                  : 'NFA Volatility Alert Disabled'}
            </h2>
            <p style={{ ...styles.modalText, margin: '8px 0 22px' }}>
              {lastNfaAction === 'activated'
                ? isTagalog
                  ? 'Naabisuhan na ang sistema ukol sa mataas na volatility mula sa NFA. Aktibo na ang safeguards at price clamps para sa lahat ng transaksyon.'
                  : 'The system has been notified of high volatility from NFA. Safeguards and price clamps are now active for all transactions.'
                : isTagalog
                  ? 'Ibinalik na ang karaniwang pricing mode. Mananatiling sinusubaybayan ang PSA benchmarks.'
                  : 'Standard pricing mode has been restored. PSA benchmarks will continue to be monitored.'}
            </p>

            <button
              type="button"
              onClick={() => setShowNfaSuccessModal(false)}
              style={styles.submitButtonGreenFull}>
              {isTagalog ? 'Naintindihan' : 'Understood'}
            </button>
          </div>
        </div>
      ) : null}
    </ConsoleLayout>
  );
}

function PriceBenchmarkCard({
  dryBase,
  monthlyBars,
  effectiveDate,
  isTagalog,
}: {
  dryBase: number | null;
  monthlyBars: ReturnType<typeof toMonthlyBars>;
  effectiveDate: string | null;
  isTagalog: boolean;
}) {
  return (
    <article className="animo-card" style={styles.panel}>
      <div>
        <h2 style={styles.panelTitle}>
          {isTagalog ? 'Benchmark ng Presyo sa Rehiyon' : 'Regional Price Benchmark'}
        </h2>
        <p style={styles.panelSubtitle}>
          {isTagalog ? 'Kasaysayan ng PSA farmgate price sa Rizal' : 'PSA farmgate price history in Rizal'}
        </p>
      </div>

      <div style={styles.priceHeadline}>
        <span style={styles.priceValue}>{dryBase != null ? formatPeso(dryBase) : '—'}</span>
        <span style={styles.priceUnit}>{isTagalog ? 'kada kilo (dry)' : 'per kg (dry)'}</span>
      </div>

      <div style={styles.priceMeta}>
        <span style={styles.priceSource}>
          {isTagalog
            ? `Sanggunian: Presyo ng Modelo ng ANIMO${effectiveDate ? ` · ${effectiveDate}` : ''}`
            : `Source: ANIMO Model Pricing${effectiveDate ? ` · ${effectiveDate}` : ''}`}
        </span>
      </div>

      <div style={styles.chart}>
        {monthlyBars.length === 0 ? (
          <span style={styles.priceSource}>
            {isTagalog ? 'Walang price history pa.' : 'No price history yet.'}
          </span>
        ) : (
          monthlyBars.map((bar) => (
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

/**
 * One combined confidence signal, from two independent sources: whether an
 * LGU official has manually flagged NFA intervention volatility
 * (`nfa_intervention_window`), and whether the pricing model's automated
 * check (`get-market-status`) independently detects a real deviation in the
 * PSA price data. Shown together, plain-language, so an LGU official reading
 * this doesn't need to know what an RF/SVR model or an edge function is —
 * only "may we trust the current price, and why or why not."
 */
function MarketPricingConfidenceCard({
  nfaActive,
  marketStatus,
  isTagalog,
}: {
  nfaActive: boolean;
  marketStatus: MarketStatus | null;
  isTagalog: boolean;
}) {
  const checkLoading = marketStatus === null;
  const anomalyFlagged = marketStatus?.available === true && marketStatus.flagged;
  const elevated = nfaActive || anomalyFlagged;

  return (
    <article className="animo-card" style={styles.panel}>
      <div style={styles.panelHead}>
        <div>
          <h2 style={styles.panelTitle}>
            {isTagalog ? 'Tiwala sa Presyo ng Merkado' : 'Market Pricing Confidence'}
          </h2>
          <p style={styles.panelSubtitle}>
            {isTagalog
              ? 'Opisyal na alerto + awtomatikong pagsusuri ng presyo'
              : 'Official alert + automated price analysis'}
          </p>
        </div>
        <span style={elevated ? styles.warningBadge : styles.normalBadge}>
          {elevated
            ? isTagalog
              ? 'May Alerto'
              : 'Alert Active'
            : isTagalog
              ? 'Normal'
              : 'Normal'}
        </span>
      </div>

      <div style={styles.meterTrack}>
        <span style={{ ...styles.meterSegment, background: elevated ? 'var(--animo-border)' : 'var(--animo-green)' }} />
        <span style={{ ...styles.meterSegment, background: elevated ? 'var(--animo-warning)' : 'var(--animo-border)' }} />
        <span style={{ ...styles.meterSegment, background: 'var(--animo-border)' }} />
      </div>

      <dl style={styles.statList}>
        <StatRow
          label={isTagalog ? 'Opisyal na NFA Alert' : 'Official NFA Alert'}
          value={
            nfaActive
              ? isTagalog
                ? '● May aktibong NFA window'
                : '● Active NFA window'
              : isTagalog
                ? '○ Walang aktibong NFA window'
                : '○ No active NFA window'
          }
        />
        <StatRow
          label={isTagalog ? 'Awtomatikong Pagsusuri' : 'Automated Analysis'}
          value={
            checkLoading
              ? isTagalog
                ? 'Sinusuri…'
                : 'Analyzing…'
              : marketStatus.available
                ? anomalyFlagged
                  ? isTagalog
                    ? `● May naramdamang biglaang pagbabago (${marketStatus.deviationPct.toFixed(1)}%)`
                    : `● Sudden change detected (${marketStatus.deviationPct.toFixed(1)}%)`
                  : isTagalog
                    ? `○ Normal na pagbabago ng presyo (${marketStatus.deviationPct.toFixed(1)}%)`
                    : `○ Normal price variation (${marketStatus.deviationPct.toFixed(1)}%)`
                : isTagalog
                  ? 'Hindi available ngayon'
                  : 'Not available right now'
          }
        />
      </dl>

      {!checkLoading && marketStatus.available ? (
        <div style={anomalyFlagged ? styles.calloutWarningBox : styles.calloutInfoBox}>
          <TriangleAlert
            size={20}
            color={anomalyFlagged ? 'var(--animo-warning)' : 'var(--animo-green)'}
            style={{ flexShrink: 0 }}
          />
          <span>{marketStatus.statusLabel}</span>
        </div>
      ) : !checkLoading ? (
        <div style={styles.calloutInfoBox}>
          <TriangleAlert size={20} color="var(--animo-green)" style={{ flexShrink: 0 }} />
          <span>
            {isTagalog
              ? "Hindi pa magagamit ang awtomatikong pagsusuri ngayon. Ang alerto mula sa NFA toggle sa itaas ang magiging basehan hangga't hindi ito available."
              : "Automated analysis is not yet available right now. The alert from the NFA toggle above will serve as the basis until it becomes available."}
          </span>
        </div>
      ) : null}
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
    background: 'var(--animo-green-tint)',
    border: '1px solid var(--animo-green-disabled)',
    fontSize: 14,
    lineHeight: '20px',
    color: 'var(--animo-green-dark)',
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
