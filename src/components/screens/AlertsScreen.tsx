import React, { useState } from 'react';
import { Activity, Bell, CheckCircle2, TrendingDown, Plus, Trash2, Eye, ArrowRight } from 'lucide-react';
import { PriceAlertItem } from '../../types';
import { DemoBadge } from '../DemoBadge';

import { AuthNudge } from '../AuthNudge';

import { t } from '../../i18n';
import { alertDetailsText, alertTimestampText } from '../../utils/alerts';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { Iri } from '../Iri';
interface AlertsScreenProps {
  alerts: PriceAlertItem[];
  onSelectAlert: (alert: PriceAlertItem) => void;
  onRemoveAlert?: (id: string) => void;
  onCreateAlert: () => void;
  onOpenAuth?: () => void;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({
  alerts,
  onSelectAlert,
  onRemoveAlert,
  onCreateAlert,
  onOpenAuth,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'TARGET_REACHED'>('ALL');

  const unreadCount = alerts.filter((a) => a.isUnread).length;
  const targetReachedCount = alerts.filter((a) => a.status === 'TARGET_REACHED').length;

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'UNREAD') return a.isUnread;
    if (filter === 'TARGET_REACHED') return a.status === 'TARGET_REACHED';
    return true;
  });

  const isDesktop = useIsDesktop();
  const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

  const filterTabs = (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {(
        [
          ['ALL', `${t("ALL")} (${alerts.length})`],
          ['UNREAD', `${t("UNREAD")} (${unreadCount})`],
          ['TARGET_REACHED', `${t("TARGET REACHED")} (${targetReachedCount})`],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          onClick={() => setFilter(id)}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const howItWorks = (
    <div className="bg-slate-100/80 rounded-xl p-4 border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
          <Activity className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">{t("How it works now")}</h3>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        {t("Prices in the app are examples. Alerts are only checked when you open the app and do not send notifications. Automatic checks and notifications will be available once real prices are connected.")}
      </p>
    </div>
  );

  if (isDesktop) {
    const reached = alerts.find((a) => a.status === 'TARGET_REACHED');
    return (
      <div className="pb-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start" data-testid="alerts-desktop">
        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("Price alerts")}</h1>
            <DemoBadge />
            <span className="text-xs text-slate-500">{t("Your alerts, saved on this device")}</span>
          </div>
          {onOpenAuth && alerts.length > 0 && (
            <AuthNudge onOpenAuth={onOpenAuth} message={t("Alerts only live on this device for now.")} />
          )}
          {reached && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 flex items-center gap-4" role="status" data-testid="alerts-reached-banner">
              <img src={reached.image} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-white" referrerPolicy="no-referrer" />
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900">{t("The price fell below your target")}</p>
                <p className="text-sm text-slate-700 truncate">
                  {reached.title} · {t("now")} <b className="tnum">{eur(reached.currentPrice)}</b> · {t("your target:")} {eur(reached.targetPrice)}
                </p>
              </div>
              <button onClick={() => onSelectAlert(reached)} className="ml-auto h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
                {t("View offer")} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {filterTabs}
          {alerts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3" data-testid="alerts-empty">
              <Iri pose="sleep" size={170} className="mx-auto" />
              <h2 className="text-base font-bold text-slate-900">{t("You have no alerts")}</h2>
              <p className="text-sm text-slate-500">{t("Pick a product, set your target price and we'll track it for you.")}</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">{t("No alerts in this category.")}</p>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm [&_th]:whitespace-nowrap" data-testid="alerts-desktop-table">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 text-left">
                    <th className="px-3 py-2.5 font-bold">{t("Product")}</th>
                    <th className="px-3 py-2.5 font-bold text-right">{t("Your target")}</th>
                    <th className="px-3 py-2.5 font-bold text-right">{t("Price now")}</th>
                    <th className="px-3 py-2.5 font-bold">{t("Status")}</th>
                    <th className="px-3 py-2.5" aria-label={t("Actions")} />
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alert) => {
                    const isReached = alert.status === 'TARGET_REACHED';
                    const toGo = Math.round((alert.currentPrice - alert.targetPrice) * 100) / 100;
                    return (
                      <tr key={alert.id} className={`border-t border-slate-100 ${isReached ? 'bg-emerald-50/50' : ''}`}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <img src={alert.image} alt="" className="w-11 h-11 rounded-lg object-cover border border-slate-200 bg-white shrink-0" referrerPolicy="no-referrer" />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate max-w-[150px] xl:max-w-[220px]" title={alert.title}>
                                {alert.isUnread && <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 align-middle" aria-label={t("UNREAD")} />}
                                {alert.title}
                              </p>
                              <p className="text-xs text-slate-500">{alert.storeName} · {alertTimestampText(alert)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tnum whitespace-nowrap">{eur(alert.targetPrice)}</td>
                        <td className="px-3 py-3 text-right font-black tnum whitespace-nowrap">{eur(alert.currentPrice)}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {isReached ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t("Target reached")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                              {alert.status === 'PRICE_DROPPED' ? <TrendingDown className="w-3.5 h-3.5 text-blue-600" /> : <Eye className="w-3.5 h-3.5" />}
                              {toGo > 0 ? t('{amount} to go', { amount: eur(toGo) }) : t("Tracking")}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <button onClick={() => onSelectAlert(alert)} aria-label={t("View offer")} title={t("View offer")} className="h-8 w-8 inline-grid place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer align-middle">
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          {onRemoveAlert && (
                            <button
                              onClick={() => onRemoveAlert(alert.id)}
                              className="ml-1 p-1.5 text-slate-400 hover:text-red-600 cursor-pointer align-middle"
                              aria-label={t("Delete alert for {title}", { title: alert.title })}
                              title={t("Delete alert")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <aside className="grid grid-cols-2 xl:grid-cols-1 gap-4">
          {howItWorks}
          <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-200/70 space-y-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">{t("Want to track a product?")}</h4>
              <p className="text-xs text-slate-600 mt-0.5">{t("Pick the product and set your target price")}</p>
            </div>
            <button onClick={onCreateAlert} className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1 cursor-pointer">
              <Plus className="w-4 h-4" /> {t("Create")}
            </button>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-4">
      {/* Title */}
      <div className="flex items-start justify-between gap-2 pt-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("Price alerts")}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t("Your alerts, saved on this device")}</p>
        </div>
        <DemoBadge className="mt-1.5" />
      </div>

      {onOpenAuth && alerts.length > 0 && (
        <AuthNudge onOpenAuth={onOpenAuth} message={t("Alerts only live on this device for now.")} />
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          {t("ALL")} ({alerts.length})
        </button>

        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === 'UNREAD'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          {t("UNREAD")} ({unreadCount})
        </button>

        <button
          onClick={() => setFilter('TARGET_REACHED')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer ${
            filter === 'TARGET_REACHED'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{t("TARGET REACHED")} ({targetReachedCount})</span>
        </button>
      </div>

      {alerts.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
          <div data-testid="alerts-empty">
            <Iri pose="sleep" size={150} className="mx-auto" />
          </div>
          <h2 className="text-base font-bold text-slate-900">{t("You have no alerts")}</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            {t("Pick a product, set your target price and we'll track it for you.")}
          </p>
        </div>
      )}
      {alerts.length > 0 && filteredAlerts.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-4">{t("No alerts in this category.")}</p>
      )}

      {/* Alert Cards */}
      <div className="space-y-3.5">
        {filteredAlerts.map((alert) => {
          const isTargetReached = alert.status === 'TARGET_REACHED';

          return (
            <div
              key={alert.id}
              className={`bg-white rounded-xl border p-4 transition-all relative ${
                isTargetReached
                  ? 'border-emerald-300 shadow-xs'
                  : 'border-slate-200'
              }`}
            >
              {/* Card top banner */}
              <div className="flex items-center justify-between gap-2 mb-3">
                {isTargetReached ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold tracking-wider uppercase">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                      {t("Target reached")}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      · {alertTimestampText(alert)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    {alert.status === 'PRICE_DROPPED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold tracking-wider uppercase border border-blue-100">
                        <TrendingDown className="w-3 h-3 text-blue-600" />
                        {t("Price dropped")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold tracking-wider uppercase border border-slate-200">
                        <Eye className="w-3 h-3 text-slate-500" />
                        {t("Tracking")}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-medium">
                      {alertTimestampText(alert)}
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info Row */}
              <div className="flex gap-3 items-start mb-3.5">
                <div className="w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative flex items-center justify-center">
                  <img
                    src={alert.image}
                    alt={alert.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {alert.dropPercent && (
                    <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] font-bold px-1 py-0.5 rounded-xs tracking-tight">
                      {isTargetReached ? t("{percent}% OFF", { percent: alert.dropPercent }) : `↓ ${alert.dropAmount.toFixed(0)} €`}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                      {alert.storeName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      EAN {alert.ean}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-1">
                    <h2 className="text-sm font-bold text-slate-900 leading-snug truncate">
                      {alert.title}
                    </h2>
                    {onRemoveAlert && (
                      <button
                        onClick={() => onRemoveAlert(alert.id)}
                        className="text-slate-400 hover:text-red-600 p-1 -mt-1 -mr-1 transition-colors cursor-pointer shrink-0"
                        aria-label={t("Delete alert for {title}", { title: alert.title })}
                        title={t("Delete alert")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {alertDetailsText(alert)}
                  </p>
                </div>
              </div>

              {/* Bottom Price + CTA Bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    {alert.dropAmount > 0 ? (
                      <>
                        <span className="line-through tnum">
                          {alert.previousPrice.toFixed(2).replace('.', ',')} €
                        </span>
                        <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded">
                          -{alert.dropAmount.toFixed(2).replace('.', ',')} €
                        </span>
                      </>
                    ) : (
                      <span>{t("Target:")} <span className="tnum font-semibold text-slate-600">{alert.targetPrice.toFixed(2).replace('.', ',')} €</span></span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-bold text-slate-900 tracking-tight tnum">
                      {alert.currentPrice.toFixed(2).replace('.', ',')} €
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {t(alert.shippingNote)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectAlert(alert)}
                  className={`px-4 py-2.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                    isTargetReached
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>{t("View offer")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* How alerts work (honest status) */}
      <div className="bg-slate-100/80 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">{t("How it works now")}</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {t("Prices in the app are examples. Alerts are only checked when you open the app and do not send notifications. Automatic checks and notifications will be available once real prices are connected.")}
        </p>
      </div>

      {/* Want to monitor a new gadget Card */}
      <div className="bg-blue-50/70 rounded-xl p-3.5 border border-blue-200/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">{t("Want to track a product?")}</h4>
            <p className="text-[11px] text-slate-600">{t("Pick the product and set your target price")}</p>
          </div>
        </div>

        <button
          onClick={onCreateAlert}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t("Create")}</span>
        </button>
      </div>
    </div>
  );
};
