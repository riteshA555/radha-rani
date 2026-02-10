import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import "./i18n";
import { initPWA } from "./shared/utils/pwaInstall";

// Initialize PWA
initPWA();

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration.scope);
            })
            .catch((error) => {
                console.error('Service Worker registration failed:', error);
            });
    });
}

createRoot(document.getElementById("root")!).render(<App />);
