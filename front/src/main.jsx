import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./design-system.css";
import "./responsive-system.css";
import "./mobile-polish.css";
import "./list-editor-mobile-fix.css";
import Router from "./routes/router";
import { AuthProvider } from "./context/auth-context";
import PwaUpdateNotice from "./components/pwa-update-notice";
import { registerPwa } from "./services/pwa.service";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <Router />
      <PwaUpdateNotice />
    </AuthProvider>
  </StrictMode>,
);

registerPwa();
