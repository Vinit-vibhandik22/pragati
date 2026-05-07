
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'mr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav items
    dashboard: "Dashboard",
    applications: "Applications",
    review: "Review",
    // Status badges
    verified: "Verified",
    rejected: "Rejected",
    manual_review: "Manual Review",
    // Buttons
    submit: "Submit",
    approve: "Approve",
    reject: "Reject",
    // Timeline steps
    step1: "Application Submitted",
    step2: "AI Verification",
    step3: "L1 Clearance",
    step4: "Field Visit",
    step5: "TAO Review",
    step6: "Sanctioned"
  },
  mr: {
    // Nav items
    dashboard: "डॅशबोर्ड",
    applications: "अर्ज",
    review: "आढावा",
    // Status badges
    verified: "सत्यापित",
    rejected: "नाकारले",
    manual_review: "हस्तचालित आढावा",
    // Buttons
    submit: "सादर करा",
    approve: "मंजूर करा",
    reject: "नाकारा",
    // Timeline steps
    step1: "अर्ज सादर",
    step2: "AI तपासणी",
    step3: "L1 मंजुरी",
    step4: "क्षेत्र भेट",
    step5: "TAO आढावा",
    step6: "मंजूर"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
