import { useNavigate } from "react-router-dom";
import AppIcon from "./app-icon";

export default function BackButton({ fallback = "/inicio", label = "Volver" }) {
  const navigate = useNavigate();
  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  }
  return <button className="back-button" type="button" onClick={goBack}><AppIcon name="arrow-left" size={16} />{label}</button>;
}
