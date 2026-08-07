import { useNavigate } from "react-router-dom";
import AppIcon from "./app-icon";
import { canGoBackInApp } from "../services/navigation.service";

export default function BackButton({ fallback = "/inicio", label = "Volver", forceFallback = false }) {
  const navigate = useNavigate();

  function goBack() {
    if (forceFallback || !canGoBackInApp()) {
      navigate(fallback);
      return;
    }

    navigate(-1);
  }

  return (
    <button className="back-button" type="button" onClick={goBack}>
      <AppIcon name="arrow-left" size={16} />
      {label}
    </button>
  );
}
