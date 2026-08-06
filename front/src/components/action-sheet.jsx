import { Link } from "react-router-dom";
import BottomSheet from "./bottom-sheet";
import AppIcon from "./app-icon";

function itemClassName(item) {
  if (item.danger || item.variant === "danger") return "danger";
  if (item.variant === "primary") return "primary";
  return "";
}

export default function ActionSheet({
  open,
  title = "Acciones",
  items = [],
  onClose,
}) {
  return (
    <BottomSheet open={open} title={title} onClose={onClose} className="action-sheet">
      <div className="action-sheet-list">
        {items
          .filter((item) => !item.hidden)
          .map((item) => {
            const content = (
              <>
                <AppIcon name={item.icon} size={21} />
                <span>
                  <strong>{item.label}</strong>
                  {item.description && <small>{item.description}</small>}
                </span>
              </>
            );
            const className = itemClassName(item);

            if (item.to) {
              return (
                <Link className={className} to={item.to} key={item.label} onClick={onClose}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                className={className}
                type="button"
                key={item.label}
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect?.();
                  if (!item.keepOpen) onClose();
                }}
              >
                {content}
              </button>
            );
          })}
      </div>
    </BottomSheet>
  );
}
