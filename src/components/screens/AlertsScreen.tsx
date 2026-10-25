import React, { useState } from 'react';
import { Activity, Bell, CheckCircle2, TrendingDown, Plus, Trash2, Eye, ArrowRight } from 'lucide-react';
import { PriceAlertItem } from '../../types';
import { DemoBadge } from '../DemoBadge';

import { AuthNudge } from '../AuthNudge';

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

  return (
    <div className="pb-8 space-y-4">
      {/* Title */}
      <div className="flex items-start justify-between gap-2 pt-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Price alerts</h1>
          <p className="text-xs text-slate-500 mt-0.5">Your alerts, saved on this device</p>
        </div>
        <DemoBadge className="mt-1.5" />
      </div>

      {onOpenAuth && alerts.length > 0 && (
        <AuthNudge onOpenAuth={onOpenAuth} message="Alerts only live on this device for now." />
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
          TOATE ({alerts.length})
        </button>

        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === 'UNREAD'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          NECITITE ({unreadCount})
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
          <span>TARGET REACHED ({targetReachedCount})</span>
        </button>
      </div>

      {alerts.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">You have no alerts</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            Pick a product, set your target price and we'll track it for you.
          </p>
        </div>
      )}
      {alerts.length > 0 && filteredAlerts.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-4">No alerts in this category.</p>
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
                      Target reached
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      · {alert.timestamp}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    {alert.status === 'PRICE_DROPPED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold tracking-wider uppercase border border-blue-100">
                        <TrendingDown className="w-3 h-3 text-blue-600" />
                        Price dropped
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold tracking-wider uppercase border border-slate-200">
                        <Eye className="w-3 h-3 text-slate-500" />
                        Tracking
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-medium">
                      {alert.timestamp}
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
                      {isTargetReached ? `${alert.dropPercent}% OFF` : `↓ ${alert.dropAmount.toFixed(0)} €`}
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
                        aria-label={`Delete alert for ${alert.title}`}
                        title="Delete alert"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {alert.matchDetails}
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
                      <span>Target: <span className="tnum font-semibold text-slate-600">{alert.targetPrice.toFixed(2).replace('.', ',')} €</span></span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-bold text-slate-900 tracking-tight tnum">
                      {alert.currentPrice.toFixed(2).replace('.', ',')} €
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {alert.shippingNote}
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
                  <span>View offer</span>
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
          <h3 className="text-sm font-bold text-slate-900">How it works now</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Prices in the app are examples. Alerts are only checked when you open the app and do not send
          notifications. Automatic checks and notifications will be available once real prices are connected.
        </p>
      </div>

      {/* Want to monitor a new gadget Card */}
      <div className="bg-blue-50/70 rounded-xl p-3.5 border border-blue-200/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Want to track a product?</h4>
            <p className="text-[11px] text-slate-600">Pick the product and set your target price</p>
          </div>
        </div>

        <button
          onClick={onCreateAlert}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create</span>
        </button>
      </div>
    </div>
  );
};
