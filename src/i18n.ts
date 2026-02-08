import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "dashboard": "Dashboard",
            "orders": "Orders",
            "stock": "Stock",
            "client_material": "Client Material Ledger",
            "catalog": "Unified Catalog",
            "karigar": "Artisan Portal",
            "settlement": "Artisan Settlement",
            "rates": "Market Terminal",
            "accounting": "Accounting Dashboard",
            "expenses": "Expense Manager",
            "ledger": "Ledger",
            "gst_reports": "GST Reports",
            "customers": "Customers",
            "vendors": "Vendors",
            "settings": "Settings",
            "logout": "Logout",
            "search": "Search...",
            "apply_save": "Apply & Save All Changes",
            "user_preferences": "User Preferences",
            "language": "Language",
            "theme": "Application Theme",
            "business_profile": "Business Profile",
            "tax_gst": "Tax & GST",
            "invoicing": "Invoicing",
            "inventory": "Inventory",
            "pricing_rates": "Pricing & Rates",
            "karigar_settings": "Karigar Settings",
            "customer_settings": "Customer Settings",
            "notifications": "Notifications",
            "advanced_backup": "Advanced & Backup",
            "hindi": "Hindi",
            "english": "English",
            "orders_sales": "Orders & Sales",
            "inventory_production": "Inventory & Production",
            "accounting_finance": "Accounting & Finance",
            "masters": "Masters",
            "contacts": "Contacts",
            "system": "System",
            "base_material_types": "Base Material Types",
            "stock_management": "Stock Management",
            "current_date": "Current Date",
            "gold_member": "Gold Member"
        }
    },
    hi: {
        translation: {
            "dashboard": "डैशबोर्ड",
            "orders": "ऑर्डर",
            "stock": "स्टॉक",
            "client_material": "क्लाइंट मटेरियल लेजर",
            "catalog": "एकीकृत कैटलॉग",
            "karigar": "कारीगर पोर्टल",
            "settlement": "कारीगर सेटलमेंट",
            "rates": "मार्केट टर्मिनल",
            "accounting": "लेखा डैशबोर्ड",
            "expenses": "खर्च प्रबंधक",
            "ledger": "लेजर",
            "gst_reports": "जीएसटी रिपोर्ट",
            "customers": "ग्राहक",
            "vendors": "विक्रेता",
            "settings": "सेटिंग्स",
            "logout": "लॉगआउट",
            "search": "खोजें...",
            "apply_save": "सभी परिवर्तन सहेजें",
            "user_preferences": "उपयोगकर्ता प्राथमिकताएं",
            "language": "भाषा",
            "theme": "एप्लिकेशन थीम",
            "business_profile": "व्यापार प्रोफ़ाइल",
            "tax_gst": "टैक्स और जीएसटी",
            "invoicing": "इनवॉइसिंग",
            "inventory": "इन्वेंट्री",
            "pricing_rates": "मूल्य निर्धारण और दरें",
            "karigar_settings": "कारीगर सेटिंग्स",
            "customer_settings": "ग्राहक सेटिंग्स",
            "notifications": "सूचनाएं",
            "advanced_backup": "उन्नत और बैकअप",
            "hindi": "हिंदी",
            "english": "अंग्रेज़ी",
            "orders_sales": "ऑर्डर और बिक्री",
            "inventory_production": "इन्वेंट्री और उत्पादन",
            "accounting_finance": "लेखांकन और वित्त",
            "masters": "मास्टर डेटा",
            "contacts": "संपर्क",
            "system": "सिस्टम",
            "base_material_types": "आधार सामग्री के प्रकार",
            "stock_management": "स्टॉक प्रबंधन",
            "current_date": "आज की तारीख",
            "gold_member": "गोल्ड मेंबर"
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        },
        react: {
            useSuspense: false
        }
    });

export default i18n;
