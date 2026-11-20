/** Aviso de conexión: sin red, o con gastos anotados que aún no se han enviado. */
import { useTranslation } from "react-i18next";
import { IoCloudOffline, IoCloudUpload } from "react-icons/io5";
import { TYPE_CAPTION } from "@/lib/typography";
import { BTN_SECONDARY } from "@/lib/ui-a11y";

type Props = {
  pending: number;
  online: boolean;
  flushing: boolean;
  onFlush: () => void;
};

export function OfflineQueueNotice({ pending, online, flushing, onFlush }: Props) {
  const { t } = useTranslation();
  if (online && pending === 0) return null;

  const Icon = online ? IoCloudUpload : IoCloudOffline;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-warn-border)] bg-[var(--color-warn-dim)] px-4 py-3 sm:rounded-xl"
    >
      <Icon className="h-5 w-5 shrink-0 text-[var(--color-warn)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--color-text)]">
          {pending > 0
            ? t("offline.pending", { count: pending })
            : t("offline.title")}
        </p>
        <p className={`mt-0.5 ${TYPE_CAPTION}`}>
          {pending > 0 ? t("offline.pendingHint") : t("offline.hint")}
        </p>
      </div>
      {online && pending > 0 ? (
        <button
          type="button"
          onClick={onFlush}
          disabled={flushing}
          className={`${BTN_SECONDARY} disabled:opacity-60`}
        >
          {flushing ? t("offline.sending") : t("offline.sendNow")}
        </button>
      ) : null}
    </div>
  );
}
