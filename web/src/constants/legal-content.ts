export type WebLegalSection = {
  id: string;
  title: string;
  badge?: string;
  paragraphs: readonly string[];
  bulletPoints?: readonly string[];
};

export type WebFaqItem = {
  id: string;
  category: 'general' | 'pricing' | 'farmer' | 'buyer' | 'lgu' | 'receipts';
  categoryLabel: string;
  question: string;
  answer: string;
};

export const WEB_LEGAL_CONTENT = {
  tl: {
    terms: {
      title: 'Mga Tuntunin at Kundisyon',
      subtitle: 'ANIMO Agricultural Platform & LGU Monitoring System',
      effectiveDate: 'Oktubre 2026',
      sections: [
        {
          id: 'intro',
          title: '1. Layunin ng Platform at Awtorisasyon ng LGU',
          badge: 'LGU Governance',
          paragraphs: [
            'Ang ANIMO LGU Console ay isang opisyal na monitoring at policy management platform para sa Municipal Agriculture Office (MAO) ng Antipolo City at Lalawigan ng Rizal.',
            'Ito ay binuo upang subaybayan ang pagpapatupad ng makatarungang presyo ng palay, pamamahagi ng advisory sa panahon at pananim, at pangangalaga sa mga magsasaka laban sa pambabarat.',
          ],
        },
        {
          id: 'user_roles',
          title: '2. Mga Papel at Responsibilidad sa Merkado',
          badge: 'Mga Alituntunin',
          paragraphs: [
            'Magsasaka (Farmer): Nagtatala ng inaning palay na may kaukulang barayti, timbang, at antas ng moisture (Tuyo 14% vs Basa).',
            'Mamimili (Buyer/Trader): Nagpapadala ng purchase requests, nagbabayad sa pamamagitan ng GCash o Cash, at nagkukumpirma ng turnover.',
            'LGU Officers / Inspectors: May tungkuling mamagitan sa mga hindi pagkakaunawaan (mediation), magpalabas ng mga abiso sa sakahan, at sumubaybay sa price volatility.',
          ],
        },
        {
          id: 'pricing_benchmarks',
          title: '3. Pagpapatupad ng Sahig ng Presyo at PSA Benchmarks',
          badge: 'Patas na Presyo',
          paragraphs: [
            'Ang batayang presyo ay nakakabit sa datos ng Philippine Statistics Authority (PSA) at Department of Agriculture (DA).',
            'Maaaring i-activate ng LGU ang NFA Price Floor kapag bumabagsak ang presyo ng palay sa merkado upang protektahan ang kabuhayan ng mga magsasaka sa lalawigan.',
          ],
        },
        {
          id: 'blockchain_compliance',
          title: '4. Katibayan ng Transaksyon at E-Commerce Act (RA 8792)',
          badge: 'Legal na Resibo',
          paragraphs: [
            'Lahat ng natapos na kalakalan ay may automated digital receipt na nakatala sa blockchain network.',
            'Kinikilala ang mga resibong ito bilang opisyal na rekord ng bentahan para sa monitoring, buwis, at pagresolba sa mga dispute.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Patakaran sa Privacy',
      subtitle: 'Alinsunod sa Data Privacy Act of 2012 (Republic Act No. 10173)',
      effectiveDate: 'Oktubre 2026',
      sections: [
        {
          id: 'data_protection_mandate',
          title: '1. Proteksyon ng Impormasyon ng Magsasaka at Mamimili',
          badge: 'RA 10173',
          paragraphs: [
            'Mahigpit na ipinagbabawal ang paggamit ng personal na datos ng mga magsasaka at mamimili sa labas ng lehitimong layunin ng pagsasaka at kalakalan.',
            'Ang mga opisyal ng LGU na may access sa console ay may legal na pananagutan sa ilalim ng RA 10173 na panatilihing kumpidensyal ang mga talaan.',
          ],
        },
        {
          id: 'data_processing_scope',
          title: '2. Saklaw ng Pagproseso ng Datos',
          badge: 'Saklaw',
          paragraphs: [
            'Kinokolekta at pinoproseso ang buong pangalan, contact number, barangay, sukat ng sakahan, at transaksyon para sa pagbibigay ng subsidiya, payo sa sakahan, at monitoring ng suplay ng pagkain.',
            'Ang mga ulat na inilalabas sa publiko ay aggregated at anonymized upang maiwasan ang pagbubunyag ng sensitibong personal na impormasyon.',
          ],
        },
        {
          id: 'security_controls',
          title: '3. Mga Kontrol sa Seguridad at Access Rights',
          badge: 'Seguridad',
          paragraphs: [
            'Gumagamit ang system ng Row-Level Security (RLS) at role-based access control. Ang mga opisyal lamang na may beripikadong LGU credentials ang maaaring makapasok sa console.',
          ],
        },
      ],
    },
    'data-sharing': {
      title: 'Kasunduan sa Pagbabahagi ng Datos',
      subtitle: 'Inter-Agency Framework: LGU · DA · PhilRice · PSA',
      effectiveDate: 'Oktubre 2026',
      sections: [
        {
          id: 'inter_agency_scope',
          title: '1. Layunin ng Pagsasama ng Datos',
          badge: 'Inter-Agency',
          paragraphs: [
            'Pinagtitibay ng kasunduang ito ang koordinasyon sa pagitan ng Lokal na Pamahalaan ng Antipolo, Kagawaran ng Pagsasaka (DA), Philippine Rice Research Institute (PhilRice), at Philippine Statistics Authority (PSA).',
            'Ang layunin ay makabuo ng real-time na price forecasting, supply chain transparency, at maagap na paghahanda sa kalamidad.',
          ],
        },
        {
          id: 'data_governance',
          title: '2. Pamamahala at Pamantayan ng Datos',
          badge: 'Governance',
          paragraphs: [
            'Ang lahat ng datos sa farmgate prices, moisture readings, at ani ay kailangang dumaan sa validation bago isama sa pambansang database.',
          ],
        },
      ],
    },
    faq: {
      title: 'Tulong at Madalas Itanong (FAQ)',
      subtitle: 'Gabay para sa LGU Officers, Magsasaka, at Mamimili sa Animo Console',
      items: [
        {
          id: 'faq-1',
          category: 'lgu',
          categoryLabel: 'LGU Monitoring',
          question: 'Paano sinusubaybayan ng LGU ang presyo ng palay sa mga barangay?',
          answer: 'Gamit ang Dashboard at Live Price Feed, makikita ng LGU officers ang real-time farmgate prices na nakakabit sa PSA benchmarks at AI price prediction engine. May volatility alerts kapag may biglaang pagbabago sa merkado.',
        },
        {
          id: 'faq-2',
          category: 'pricing',
          categoryLabel: 'Presyo at Merkado',
          question: 'Kailan dapat i-activate ang NFA Price Floor intervention?',
          answer: 'Ina-activate ang NFA Price Floor kapag ang umiiral na farmgate price ay bumaba sa minimum support price na itinakda ng pamahalaan upang masigurong hindi malulugi ang mga lokal na magsasaka.',
        },
        {
          id: 'faq-3',
          category: 'farmer',
          categoryLabel: 'Magsasaka',
          question: 'Paano nakatatanggap ang mga magsasaka ng weather at planting advisories?',
          answer: 'Kapag naglabas ang LGU ng advisory sa Advisory Monitoring tab (hal. babala sa monsoon rain o pest outbreak), awtomatikong nagpapadala ang Animo ng Push Notification at SMS sa lahat ng rehistradong magsasaka sa apektadong barangay.',
        },
        {
          id: 'faq-4',
          category: 'receipts',
          categoryLabel: 'Disputes at Resibo',
          question: 'Paano tumutulong ang LGU sa pagresolba ng alitan sa timbang o moisture?',
          answer: 'Kung may discrepancy ang mamimili o magsasaka, maaaring buksan ng LGU officer ang Transaction Record at Blockchain Receipt upang suriin ang orihinal na kasunduan, calibrated moisture reading, at magsagawa ng patas na mediation sa Municipal Agriculture Office.',
        },
      ] as WebFaqItem[],
    },
  },
  en: {
    terms: {
      title: 'Terms and Conditions',
      subtitle: 'ANIMO Agricultural Platform & LGU Monitoring System',
      effectiveDate: 'October 2026',
      sections: [
        {
          id: 'intro',
          title: '1. Platform Purpose and LGU Governance',
          badge: 'LGU Governance',
          paragraphs: [
            'The ANIMO LGU Console is the official monitoring and policy enforcement console for the Municipal Agriculture Office (MAO) in Antipolo City and the Province of Rizal.',
            'It enables agricultural officers to monitor rice trading, enforce fair benchmark pricing, issue weather/farming advisories, and protect local farmers from predatory price-gouging.',
          ],
        },
        {
          id: 'user_roles',
          title: '2. Market Roles and Trading Obligations',
          badge: 'Market Policies',
          paragraphs: [
            'Farmers: List verified harvested grain with truthful declarations of variety, weight (kg), and moisture content (Dry 14% vs Wet).',
            'Buyers/Traders: Submit purchase requests, disburse payments via GCash or Cash, and complete handover inspections.',
            'LGU Officers / Inspectors: Mediate discrepancies, issue localized crop advisories, and track price stability.',
          ],
        },
        {
          id: 'pricing_benchmarks',
          title: '3. Price Floor Policy and PSA Benchmarks',
          badge: 'Fair Pricing',
          paragraphs: [
            'Benchmark prices are dynamically linked to Philippine Statistics Authority (PSA) and Department of Agriculture (DA) farmgate data.',
            'LGU administrators can trigger the NFA Price Floor intervention when market drops threaten farmer sustainability.',
          ],
        },
        {
          id: 'blockchain_compliance',
          title: '4. Legal Evidence and E-Commerce Act (RA 8792)',
          badge: 'Digital Evidence',
          paragraphs: [
            'All concluded trades generate tamper-proof digital receipts recorded on a distributed ledger/blockchain.',
            'These records constitute official electronic evidence under Republic Act No. 8792 for monitoring, audits, and dispute resolution.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'Pursuant to the Data Privacy Act of 2012 (Republic Act No. 10173)',
      effectiveDate: 'October 2026',
      sections: [
        {
          id: 'data_protection_mandate',
          title: '1. Protection of Farmer and Buyer Records',
          badge: 'RA 10173',
          paragraphs: [
            'Personal information of agricultural producers and buyers is confidential and restricted strictly to legitimate agricultural support and trade governance.',
            'LGU personnel accessing this console are legally bound by RA 10173 non-disclosure obligations.',
          ],
        },
        {
          id: 'data_processing_scope',
          title: '2. Scope of Processing and Analytics',
          badge: 'Scope',
          paragraphs: [
            'Full names, contact numbers, farm locations, and harvest histories are processed for agricultural subsidies, advisories, and food security forecasting.',
            'Public reports and analytics dashboards use strictly anonymized and aggregated datasets.',
          ],
        },
        {
          id: 'security_controls',
          title: '3. Security Architecture and Access Controls',
          badge: 'Security',
          paragraphs: [
            'The platform enforces Row-Level Security (RLS) and cryptographic access tokens. Only verified municipal officers with authorized credentials can access registry records.',
          ],
        },
      ],
    },
    'data-sharing': {
      title: 'Data Sharing Agreement',
      subtitle: 'Inter-Agency Framework: LGU · DA · PhilRice · PSA',
      effectiveDate: 'October 2026',
      sections: [
        {
          id: 'inter_agency_scope',
          title: '1. Scope of Inter-Agency Cooperation',
          badge: 'Inter-Agency',
          paragraphs: [
            'This agreement governs data harmonization between the Local Government Unit of Antipolo, the Department of Agriculture (DA), Philippine Rice Research Institute (PhilRice), and the Philippine Statistics Authority (PSA).',
            'Objectives include real-time price forecasting, supply chain transparency, and coordinated disaster response.',
          ],
        },
        {
          id: 'data_governance',
          title: '2. Data Quality and Standards',
          badge: 'Governance',
          paragraphs: [
            'Farmgate price feeds, moisture levels, and yield statistics must meet national validation standards prior to integration.',
          ],
        },
      ],
    },
    faq: {
      title: 'Help & Frequently Asked Questions',
      subtitle: 'Guide for LGU Officers, Agricultural Technicians, and Market Monitors',
      items: [
        {
          id: 'faq-1',
          category: 'lgu',
          categoryLabel: 'LGU Monitoring',
          question: 'How does the LGU monitor palay farmgate prices across barangays?',
          answer: 'Through the Dashboard and Live Feed, officers observe real-time prices synced with PSA datasets and machine-learning price forecasts. Automated alerts trigger when abnormal price swings occur.',
        },
        {
          id: 'faq-2',
          category: 'pricing',
          categoryLabel: 'Price Benchmarks',
          question: 'When should the NFA Price Floor be engaged?',
          answer: 'The NFA Price Floor should be enabled when open market farmgate prices drop below government-mandated support thresholds, protecting farmers from unsustainable losses.',
        },
        {
          id: 'faq-3',
          category: 'farmer',
          categoryLabel: 'Farmer Outreach',
          question: 'How are weather and farm advisories delivered to farmers?',
          answer: 'When an officer publishes an advisory in the Advisory Monitoring module (e.g. monsoon warnings or pest advisories), push notifications and SMS alerts are instantly dispatched to all registered farmers in the affected barangays.',
        },
        {
          id: 'faq-4',
          category: 'receipts',
          categoryLabel: 'Disputes & Receipts',
          question: 'How does the LGU handle moisture or weight disputes?',
          answer: 'Officers can inspect the official Transaction Record and cryptographic Blockchain Receipt to verify original listing terms and calibrated moisture readings, facilitating neutral mediation at the Municipal Agriculture Office.',
        },
      ] as WebFaqItem[],
    },
  },
} as const;
