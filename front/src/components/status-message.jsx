import { useEffect, useState } from "react";

export default function StatusMessage({ type = "info", children }) {
  const [visible, setVisible] = useState(Boolean(children));

  useEffect(() => {
    setVisible(Boolean(children));
    if (!children || type === "error") return undefined;
    const timer = window.setTimeout(() => setVisible(false), 4800);
    return () => window.clearTimeout(timer);
  }, [children, type]);

  if (!children || !visible) return null;
  return <div className={`status-banner status-banner--${type}`} role={type === "error" ? "alert" : "status"}>{children}</div>;
}
