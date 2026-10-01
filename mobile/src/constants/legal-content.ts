export type LegalTabKey = 'terms' | 'privacy' | 'faq';

export type LegalSection = {
  id: string;
  title: string;
  badge?: string;
  paragraphs: readonly string[];
  bulletPoints?: readonly string[];
};

export type FaqItem = {
  id: string;
  category: 'general' | 'pricing' | 'farmer' | 'buyer' | 'receipts';
  categoryLabel: string;
  question: string;
  answer: string;
};

export const LEGAL_CONTENT = {
  tl: {
    terms: {
      title: 'Mga Tuntunin at Kundisyon',
      subtitle: 'Kasunduan sa Paggamit ng Animo Agricultural Platform',
      effectiveDate: 'Oktubre 2026',
      sections: [
        {
          id: 'acceptance',
          title: '1. Pagpapakilala at Pagtanggap sa Kasunduan',
          badge: 'Kasunduan',
          paragraphs: [
            'Malugod naming tinatanggap ang inyong paggamit sa Animo, isang digital na platapormang pang-agrikultura na nag-uugnay ng mga lokal na magsasaka ng palay (Farmers) at mga mamimili o mangangalakal (Buyers/Traders) upang itaguyod ang patas, bukas, at transparent na presyuhan.',
            'Sa pagrehistro, pag-access, o paggamit ng Animo app, sumasang-ayon ka sa mga Tuntunin at Kundisyong ito. Kung hindi ka sumasang-ayon sa alinmang bahagi ng kasunduang ito, mangyaring huwag gamitin ang serbisyo.',
          ],
        },
        {
          id: 'eligibility_roles',
          title: '2. Pagiging Karapat-dapat at Mga Papel sa Platform',
          badge: 'User Roles',
          paragraphs: [
            'Ang bawat gumagamit ay dapat nasa legal na edad (18 taong gulang pataas) at may legal na kakayahang pumasok sa mga transaksyong pangkalakalan sa ilalim ng batas ng Republika ng Pilipinas.',
            'May dalawang natatanging papel sa Animo:',
          ],
          bulletPoints: [
            'Magsasaka (Farmer): Mga lehitimong nagtatanim o may-ari ng inaning palay na nagbebenta nang direkta sa merkado.',
            'Mamimili (Buyer/Trader): Mga indibidwal, negosyo, gilingan (rice millers), o kooperatiba na bumibili ng palay.',
            'Permanente ang Papel: Matapos ang pagpapatunay (OTP verification) at pag-setup ng profile, ang napiling papel ay pinal at hindi na mababago sa app.',
            'Seguridad ng Account: Ikaw ang may buong pananagutan sa pag-iingat ng iyong OTP at mobile number.',
          ],
        },
        {
          id: 'listing_pricing',
          title: '3. Paglilista ng Ani at Patas na Benchmark Presyo',
          badge: 'Patas na Presyo',
          paragraphs: [
            'Obligasyon ng magsasaka na magbigay ng makatotohanang impormasyon ukol sa inaning palay, kabilang ang Barayti (Inbred, Hybrid, Tradisyonal), Antas ng Moisture (Tuyo 14% vs Basa), kabuuang kilo (kg), at bilang ng sako.',
            'Awtomatikong nakakabit ang presyo bawat kilo sa opisyal na farmgate market price feed mula sa Philippine Statistics Authority (PSA), Department of Agriculture (DA), at National Food Authority (NFA) kasama ang algorithmic variety premium.',
            'Naka-lock ang presyo kapag nailista ang ani upang maprotektahan ang magsasaka laban sa pambabarat at bigyan ng malinaw na kalkulasyon ang mamimili.',
          ],
          bulletPoints: [
            'Ipinagbabawal ang paglalagay ng pekeng listing na walang aktwal na imbentaryo.',
            'Ipinagbabawal ang artipisyal na pagmamanipula ng timbang o pagsisinungaling sa antas ng moisture.',
          ],
        },
        {
          id: 'purchase_payment',
          title: '4. Daloy ng Transaksyon at Pagbabayad',
          badge: 'Transaksyon',
          paragraphs: [
            'Ang pagpapadala ng Purchase Request ng mamimili ay isang pormal na alok na bilhin ang ani. Nagiging pinal ang kasunduan kapag tinanggap (Accepted) ito ng magsasaka.',
            'Maaaring magbayad gamit ang GCash Mobile Wallet o Cash on Pickup/Delivery.',
            'PAALALA SA MAGSASAKA: Mahigpit na ipinapayo na huwag i-release o ipahakot ang mga sako ng palay hangga\'t hindi nakukumpirma ang buong bayad sa GCash o natatanggap ang buong kabayaran sa Cash.',
          ],
          bulletPoints: [
            'Maaari lamang magkansela kung hindi pa tinatanggap ng magsasaka ang kahilingan o may kapwa kasunduan dahil sa di-maiiwasang kalamidad.',
            'Ang bawat bayad ay dapat itugma sa Reference ID ng transaksyon.',
          ],
        },
        {
          id: 'inspection_delivery',
          title: '5. Pagsusuri ng Timbang, Moisture, at Paghahatid',
          badge: 'Inspeksyon',
          paragraphs: [
            'May karapatan ang mamimili na suriin ang kalidad, antas ng moisture (gamit ang calibrated moisture meter), at timbang sa oras ng turnover.',
            'Kung may malaking discrepancy (hal. idineklarang tuyo pero basa, o kulang ang timbang), may 24 oras ang mamimili upang mag-ulat o humiling ng mediation sa Municipal Agriculture Office bago isara ang order.',
          ],
        },
        {
          id: 'blockchain_receipts',
          title: '6. Blockchain Digital Receipt at Katibayan',
          badge: 'Resibo',
          paragraphs: [
            'Ang bawat natapos na transaksyon ay lumilikha ng digital receipt na may cryptographic transaction hash na itinatala sa secure ledger/blockchain.',
            'Alinsunod sa Republic Act No. 8792 (Electronic Commerce Act of 2000), ang digital receipt at audit log sa Animo ay kinikilalang legal na katibayan ng bentahan.',
          ],
        },
        {
          id: 'conduct_suspension',
          title: '7. Disiplina sa Komunidad at Pagsuspinde ng Account',
          badge: 'Alituntunin',
          paragraphs: [
            'Ang bawat gumagamit ay inaasahang maging tapat, magalang, at responsable. Ipinagbabawal ang anumang uri ng panloloko, panggigipit, o pagtangging magbayad matapos ang kasunduan.',
            'Ang paglabag sa mga patakaran ay maaaring magresulta sa agarang babala, pansamantalang suspensyon, o permanenteng pagka-ban sa Animo platform.',
          ],
        },
        {
          id: 'liability_disclaimer',
          title: '8. Pagtanggi sa Pananagutan (Disclaimers)',
          badge: 'Limitasyon',
          paragraphs: [
            'Ang Animo ay nagsisilbing teknolohiyang tulay upang mapadali ang patas na kalakalan. Hindi direktang nagmamay-ari o nag-iimbak ang Animo ng mga produktong palay.',
            'Hindi mananagot ang Animo sa pinsalang dulot ng bagyo, baha, peste, o maling pag-iimbak matapos ang turnover ng ani.',
          ],
        },
        {
          id: 'governing_law',
          title: '9. Pamamahala ng Batas at Hurisdiksyon',
          badge: 'Batas',
          paragraphs: [
            'Ang mga tuntuning ito ay pinamamahalaan ng mga batas ng Republika ng Pilipinas. Ang anumang hindi pagkakaunawaan ay unang idudulog sa Municipal Agriculture Office (MAO) ng Antipolo City / Rizal bago ang pormal na legal na aksyon.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Patakaran sa Privacy',
      subtitle: 'Proteksyon ng Datos Alinsunod sa Data Privacy Act ng 2012 (RA 10173)',
      effectiveDate: 'Oktubre 2026',
      sections: [
        {
          id: 'privacy_commitment',
          title: '1. Ang Aming Pangako sa Inyong Privacy',
          badge: 'RA 10173',
          paragraphs: [
            'Pinahahalagahan ng Animo ang inyong tiwala. Ang Patakarang ito ay nagpapaliwanag kung paano namin kinokolekta, ginagamit, at pinoprotektahan ang inyong personal na impormasyon alinsunod sa Data Privacy Act of 2012 (Republic Act No. 10173) ng Pilipinas.',
          ],
        },
        {
          id: 'data_collected',
          title: '2. Mga Datos na Aming Kinokolekta',
          badge: 'Koleksyon ng Datos',
          paragraphs: [
            'Kinokolekta lamang namin ang mga datos na mahalaga sa pagpapatakbo ng agricultural marketplace:',
          ],
          bulletPoints: [
            'Personal na Impormasyon: Buong Pangalan, Numero ng Telepono, Barangay sa Antipolo / Rizal, at Laki ng Sakahan.',
            'Impormasyon sa Pagbabayad: GCash mobile number. (HINDI kailanman kinokolekta o iniimbak ng Animo ang inyong GCash MPIN, OTP, o password).',
            'Datos sa Transaksyon: Litrato ng ani, kilo, sako, presyo bawat kilo, antas ng moisture, at kasaysayan ng mga order.',
            'Teknikal na Datos: Device ID at blockchain transaction hashes.',
          ],
        },
        {
          id: 'purpose_processing',
          title: '3. Layunin ng Pagproseso ng Datos',
          badge: 'Layunin',
          paragraphs: [
            'Ginagamit ang inyong impormasyon para sa:',
          ],
          bulletPoints: [
            'Pag-verify ng account gamit ang SMS OTP.',
            'Pagpapakita ng inyong mga palay listing sa Animo Palengke.',
            'Pangangasiwa ng purchase requests, bayaran, at delivery coordination.',
            'Paggawa ng opisyal na digital receipts at blockchain audit logs.',
            'Pagpapakita ng card na Payo sa Bukid mula sa forecast ng ulan sa Antipolo at sa yugto ng iyong pananim.',
            'Pagpigil sa panloloko at pagpapatupad ng alituntunin sa merkado.',
          ],
        },
        {
          id: 'data_sharing',
          title: '4. Pagbabahagi at Pagbubunyag ng Impormasyon',
          badge: 'Pagbabahagi',
          paragraphs: [
            'HINDI kailanman ibinebenta ng Animo ang inyong impormasyon sa mga third-party advertisers.',
            'Ibinabahagi lamang ang impormasyon sa:',
          ],
          bulletPoints: [
            'Katransaksyong Partido: Pangalan, contact number, at lokasyon para sa pagsasakatuparan ng napagkasunduang order.',
            'Tanggapan ng Pagsasaka (LGU-MAO): Pinagsama-samang (anonymized & aggregated) istatistika ng presyo at suplay para sa food security planning.',
            'Mga Katuwang na Tagapaghatid: Secure cloud database at SMS OTP gateway providers.',
          ],
        },
        {
          id: 'security_blockchain',
          title: '5. Seguridad at Blockchain Immutability',
          badge: 'Seguridad',
          paragraphs: [
            'Gumagamit kami ng HTTPS/TLS 1.3 transmission encryption at AES-256 database storage encryption.',
            'Ang mga resibong itinatala sa blockchain ay naglalaman lamang ng cryptographic hash. WALANG sensitibong personal na impormasyon (PII) ang direktang inilalagay sa pampublikong smart contract.',
          ],
        },
        {
          id: 'user_rights',
          title: '6. Ang Inyong mga Karapatan sa Ilalim ng Batas',
          badge: 'Karapatan Mo',
          paragraphs: [
            'Bilang Data Subject sa ilalim ng RA 10173, may karapatan kayong:',
          ],
          bulletPoints: [
            'Malaman (Right to be Informed) kung paano pinoproseso ang inyong datos.',
            'Matingnan at Maiwasto (Right to Access & Rectification) ang inyong personal profile.',
            'Magpabura o Mag-block (Right to Erasure) ng inyong account kapag tapos na ang lahat ng aktibong obligasyon.',
            'Maghain ng reklamo sa National Privacy Commission (NPC) kung may paglabag.',
          ],
        },
        {
          id: 'dpo_contact',
          title: '7. Pakikipag-ugnayan sa Data Protection Officer',
          badge: 'Kontak',
          paragraphs: [
            'Para sa anumang katanungan ukol sa inyong datos o paghingi ng tulong sa privacy:',
            'Email: privacy@animo.ph / support@animo.ph',
            'Tanggapan: City Agriculture Office / MAO, Antipolo City Hall, Rizal.',
          ],
        },
      ],
    },
    faq: {
      title: 'Tulong at Madalas Itanong (FAQ)',
      subtitle: 'Mga sagot sa karaniwang katanungan ng mga magsasaka at mamimili sa Animo',
      categories: [
        { id: 'all', label: 'Lahat' },
        { id: 'general', label: 'Pangkalahatan' },
        { id: 'pricing', label: 'Presyo at Merkado' },
        { id: 'farmer', label: 'Magsasaka' },
        { id: 'buyer', label: 'Mamimili' },
        { id: 'receipts', label: 'Resibo at Suporta' },
      ],
      items: [
        {
          id: 'faq-1',
          category: 'general',
          categoryLabel: 'Pangkalahatan',
          question: 'Ano ang Animo at paano ito nakatutulong sa akin?',
          answer: 'Ang Animo ay isang digital platform na direktang nag-uugnay sa mga lokal na Magsasaka at mga Mamimili ng palay. Tinatanggal nito ang mga mapagsamantalang ahente sa pamamagitan ng pagbibigay ng makatarungang presyo na nakakabit sa datos ng gobyerno (PSA/NFA), ligtas na bayad, at malinaw na resibo.',
        },
        {
          id: 'faq-2',
          category: 'general',
          categoryLabel: 'Pangkalahatan',
          question: 'Paano ako magpaparehistro at bakit kailangang pumili ng papel?',
          answer: 'I-type ang iyong 10-digit mobile number at ilagay ang 6-digit SMS OTP. Piliin kung ikaw ay Magsasaka (nagbebenta) o Mamimili (bumibili). Permanente ang papel matapos ang verification upang mapanatiling ligtas at mapagkakatiwalaan ang kalakalan.',
        },
        {
          id: 'faq-3',
          category: 'general',
          categoryLabel: 'Pangkalahatan',
          question: 'Paano kung hindi ko matanggap ang SMS OTP?',
          answer: 'Siguraduhing maayos ang cellular signal at tama ang numero. Maghintay nang 60 segundo bago pumindot ng "Humiling ng Bagong OTP". Kung magpatuloy ang problema, subukang i-restart ang app o makipag-ugnayan sa aming helpdesk.',
        },
        {
          id: 'faq-4',
          category: 'pricing',
          categoryLabel: 'Presyo at Merkado',
          question: 'Paano kinakalkula ang presyo bawat kilo ng palay sa Animo? Bakit ito "Naka-lock"?',
          answer: 'Awtomatikong kinakalkula ang presyo batay sa: (1) Opisyal na farmgate benchmark ng PSA/DA para sa Rizal, (2) Antas ng moisture (Tuyo vs Basa), at (3) Certified variety premium (hal. dagdag sa Rc218 / Grade A). Naka-lock ang presyo pagkalista upang hindi mabarat ang magsasaka at maging malinaw sa mamimili.',
        },
        {
          id: 'faq-5',
          category: 'pricing',
          categoryLabel: 'Presyo at Merkado',
          question: 'Ano ang pagkakaiba ng Tuyong Palay (Dry) sa Basang Palay (Wet)?',
          answer: 'Ang Tuyo (Dry - 14% Moisture) ay nabilad o nadaan sa mechanical dryer kaya handa nang igiling at mas mataas ang presyo. Ang Basa (Wet) ay sariwang inani na may mataas na moisture kaya kailangan pa itong patuyuin bago igiling.',
        },
        {
          id: 'faq-6',
          category: 'pricing',
          categoryLabel: 'Presyo at Merkado',
          question: 'Ano ang mga barayti ng palay (Inbred, Hybrid, Tradisyonal)?',
          answer: 'Inbred (hal. NSIC Rc222, Rc160) ay sertipikadong binhi na may matatag na ani. Hybrid (hal. SL-8H) ay F1 seed na may mataas na dami ng ani. Tradisyonal/Pamana (hal. Dinorado, Sinandomeng) ay mga espesyal at mababangong barayti na may karagdagang premium.',
        },
        {
          id: 'faq-7',
          category: 'farmer',
          categoryLabel: 'Magsasaka',
          question: 'Paano maglista ng inaning palay para ibenta?',
          answer: 'Pumunta sa tab na "Aking Ani" o pindutin ang "Ibenta ang aking Palay". Mag-upload ng malinaw na litrato, piliin ang barayti, moisture level (Tuyo o Basa), at kabuuang timbang sa kilo. Awtomatikong lilitaw ang patas na presyo. Pindutin ang "Tapusin ang Paglilista".',
        },
        {
          id: 'faq-8',
          category: 'farmer',
          categoryLabel: 'Magsasaka',
          question: 'Kailan ko dapat ibigay ang mga sako ng palay sa mamimili?',
          answer: 'MAHALAGA: Huwag i-release ang mga sako hangga\'t hindi nakukumpirma ang buong bayad sa GCash (tingnan ang sariling GCash app) o natatanggap ang buong halaga sa Cash sa oras ng pickup.',
        },
        {
          id: 'faq-9',
          category: 'farmer',
          categoryLabel: 'Magsasaka',
          question: 'Paano gumagana ang "Payo sa Bukid" at ulat-panahon?',
          answer: 'Gumagamit ang Payo sa Bukid ng isang forecast ng ulan para sa Antipolo at ng yugto ng iyong pananim. Ipinapakita ng card ang Maagang Anihin, Antalahin ang Anihan, o Walang Kailangang Gawin. Binabasa ito sa app.',
        },
        {
          id: 'faq-10',
          category: 'buyer',
          categoryLabel: 'Mamimili',
          question: 'Paano maghanap at mag-order ng palay sa Animo Palengke?',
          answer: 'Buksan ang "Palengke" tab, gamitin ang search at filter ayon sa barayti, moisture level, o barangay. Pindutin ang listing, ilagay ang nais na dami ng bibilhin, at pindutin ang "Magpadala ng Purchase Request".',
        },
        {
          id: 'faq-11',
          category: 'buyer',
          categoryLabel: 'Mamimili',
          question: 'Paano kung kulang ang timbang o hindi tugma ang moisture sa idineklara?',
          answer: 'Suriin ang palay bago tanggapin. Kung may depekto o kulang, huwag markahang kumpleto ang transaksyon at makipag-ugnayan agad sa Helpdesk o sa Municipal Agriculture Office para sa pagresolba.',
        },
        {
          id: 'faq-12',
          category: 'receipts',
          categoryLabel: 'Resibo at Suporta',
          question: 'Ano ang Blockchain Digital Receipt at bakit ito mahalaga?',
          answer: 'Sa bawat natapos na transaksyon, awtomatikong lumilikha ang Animo ng resibo na may cryptographic hash na nakatala sa secure ledger. Ito ay hindi mababago at kinikilalang legal na katibayan sa ilalim ng E-Commerce Act ng Pilipinas.',
        },
        {
          id: 'faq-13',
          category: 'receipts',
          categoryLabel: 'Resibo at Suporta',
          question: 'Kanino ako lalapit kung kailangan ko ng tulong?',
          answer: 'Maaari kang sumulat sa support@animo.ph, bumisita sa City Agriculture Office (MAO) sa Antipolo City Hall, o gamitin ang Support Button sa Profile screen ng app.',
        },
      ] as FaqItem[],
    },
  },
  en: {
    terms: {
      title: 'Terms & Conditions',
      subtitle: 'User Agreement for the Animo Agricultural Platform',
      effectiveDate: 'October 2026',
      sections: [
        {
          id: 'acceptance',
          title: '1. Introduction and Agreement Acceptance',
          badge: 'Agreement',
          paragraphs: [
            'Welcome to Animo, a digital agricultural platform connecting local rice farmers and verified buyers/traders to facilitate fair, transparent, and benchmarked market transactions.',
            'By registering, accessing, or using the Animo application, you agree to comply with and be legally bound by these Terms & Conditions. If you do not agree, please do not use the service.',
          ],
        },
        {
          id: 'eligibility_roles',
          title: '2. Eligibility and User Roles',
          badge: 'User Roles',
          paragraphs: [
            'All users must be at least 18 years old and legally capable of entering into binding commercial contracts under Philippine law.',
            'Animo provides two distinct user roles:',
          ],
          bulletPoints: [
            'Farmer (Magsasaka): Verified agricultural producers listing harvested palay for direct sale.',
            'Buyer (Mamimili/Trader): Verified millers, wholesalers, cooperatives, or individual grain traders purchasing palay.',
            'Role Lock: Once OTP verification and profile registration are completed, your selected role is permanent and cannot be modified within the app.',
            'Account Security: You are solely responsible for keeping your registered phone number and OTP credentials confidential.',
          ],
        },
        {
          id: 'listing_pricing',
          title: '3. Harvest Listing and Fair Benchmark Pricing',
          badge: 'Fair Pricing',
          paragraphs: [
            'Farmers must provide truthful and accurate information regarding variety (Inbred, Hybrid, Traditional), moisture level (Dry 14% vs Wet), total weight in kg, and sack count.',
            'Prices per kilogram are automatically linked to official farmgate market price feeds from the Philippine Statistics Authority (PSA), Department of Agriculture (DA), and National Food Authority (NFA), with algorithmic quality premiums.',
            'Prices are locked upon listing creation to prevent predatory price bargaining and ensure transparency for buyers.',
          ],
          bulletPoints: [
            'Creating fictitious listings without real inventory is strictly prohibited.',
            'Tampering with scales or misrepresenting moisture levels is a severe violation.',
          ],
        },
        {
          id: 'purchase_payment',
          title: '4. Purchase Requests and Payment Flow',
          badge: 'Transactions',
          paragraphs: [
            'Submitting a Purchase Request constitutes a formal offer to purchase the specified palay quantity. The contract becomes binding once accepted by the farmer.',
            'Supported payment channels include GCash Mobile Wallet and Cash on Pickup/Delivery.',
            'FARMER SAFETY NOTICE: Farmers are strongly advised never to release or dispatch sacks until full payment is verified in their GCash app or cash is fully counted on pickup.',
          ],
          bulletPoints: [
            'Cancellations are only permitted before acceptance or upon mutual consent due to documented force majeure.',
            'All payments must reference the specific Transaction ID.',
          ],
        },
        {
          id: 'inspection_delivery',
          title: '5. Inspection, Moisture Testing, and Delivery',
          badge: 'Inspection',
          paragraphs: [
            'Buyers have the right to inspect grain quality, weigh sacks on certified scales, and test moisture levels using calibrated meters during handover.',
            'Discrepancies (e.g. declared dry but delivered wet) must be reported within 24 hours to the Municipal Agriculture Office before completing the order.',
          ],
        },
        {
          id: 'blockchain_receipts',
          title: '6. Blockchain Digital Receipts and Audit Trail',
          badge: 'Receipts',
          paragraphs: [
            'Every completed deal generates a tamper-proof digital receipt with a cryptographic transaction hash recorded on a secure ledger/blockchain.',
            'Pursuant to Republic Act No. 8792 (Electronic Commerce Act of 2000), these digital receipts and audit logs serve as valid electronic evidence of trade.',
          ],
        },
        {
          id: 'conduct_suspension',
          title: '7. Community Code of Conduct and Account Suspension',
          badge: 'Rules',
          paragraphs: [
            'Users must treat community members with respect and honesty. Payment defaults, fraudulent claims, harassment, and OTP spamming are strictly forbidden.',
            'Violations may lead to formal warnings, temporary suspensions, or permanent banning from the Animo platform.',
          ],
        },
        {
          id: 'liability_disclaimer',
          title: '8. Limitation of Liability and Agricultural Disclaimers',
          badge: 'Liability',
          paragraphs: [
            'Animo operates as a technological market facilitator. Animo does not take legal title or custody of physical palay inventory.',
            'Animo is not liable for crop damage caused by natural disasters, monsoon rains, pests, or improper storage after handover.',
          ],
        },
        {
          id: 'governing_law',
          title: '9. Governing Law and Dispute Resolution',
          badge: 'Jurisdiction',
          paragraphs: [
            'These terms are governed by the laws of the Republic of the Philippines. Disputes will undergo mandatory mediation through the Municipal Agriculture Office (MAO) in Antipolo City / Rizal before formal litigation.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'Data Protection in Compliance with Data Privacy Act of 2012 (RA 10173)',
      effectiveDate: 'October 2026',
      sections: [
        {
          id: 'privacy_commitment',
          title: '1. Our Privacy Commitment',
          badge: 'RA 10173',
          paragraphs: [
            'Animo values your trust and is committed to protecting your personal data in full compliance with the Data Privacy Act of 2012 (Republic Act No. 10173) and National Privacy Commission (NPC) regulations.',
          ],
        },
        {
          id: 'data_collected',
          title: '2. Information We Collect',
          badge: 'Data Collection',
          paragraphs: [
            'We collect only the information necessary to provide and operate the agricultural marketplace:',
          ],
          bulletPoints: [
            'Personal Information: Full Name, Mobile Phone Number, Barangay location in Antipolo/Rizal, and Farm Size.',
            'Payment Information: GCash mobile number. (Animo NEVER asks for, collects, or stores your GCash MPIN, OTP, or passwords).',
            'Transaction Information: Harvest photos, sack quantities, weight (kg), price per kg, moisture levels, and order histories.',
            'Technical Information: Device identifiers and cryptographic transaction hashes.',
          ],
        },
        {
          id: 'purpose_processing',
          title: '3. Purpose of Processing',
          badge: 'Purpose',
          paragraphs: [
            'Your data is processed strictly for:',
          ],
          bulletPoints: [
            'Authenticating your account via SMS OTP.',
            'Displaying crop listings on the Animo Marketplace.',
            'Facilitating purchase requests, settlements, and delivery coordination.',
            'Generating official digital receipts and blockchain audit logs.',
            'Showing the Payo sa Bukid card from the Antipolo rainfall forecast and your crop stage.',
            'Preventing fraud and enforcing marketplace standards.',
          ],
        },
        {
          id: 'data_sharing',
          title: '4. Data Sharing and Disclosure',
          badge: 'Data Sharing',
          paragraphs: [
            'Animo never sells your personal data to third-party advertisers.',
            'Data is shared only with:',
          ],
          bulletPoints: [
            'Transaction Counterparties: Name, phone number, and barangay location to fulfill agreed orders.',
            'Municipal Agriculture Office (LGU-MAO): Aggregated and anonymized price and production statistics for city food security planning.',
            'Infrastructure Partners: Encrypted cloud database and SMS OTP gateway providers.',
          ],
        },
        {
          id: 'security_blockchain',
          title: '5. Security and Blockchain Storage',
          badge: 'Security',
          paragraphs: [
            'We apply industry-grade HTTPS/TLS 1.3 transmission encryption and AES-256 database encryption.',
            'Receipts recorded on the blockchain contain only cryptographic verification hashes. NO sensitive Personally Identifiable Information (PII) is written to public smart contracts.',
          ],
        },
        {
          id: 'user_rights',
          title: '6. Your Rights Under Philippine Law',
          badge: 'Your Rights',
          paragraphs: [
            'Under RA 10173, you have the right to:',
          ],
          bulletPoints: [
            'Be informed regarding how your data is collected and processed.',
            'Access and correct your personal profile information.',
            'Request deletion of your account once all active transactions are resolved.',
            'Lodge a formal complaint with the National Privacy Commission (NPC).',
          ],
        },
        {
          id: 'dpo_contact',
          title: '7. Data Protection Officer Contact',
          badge: 'Contact',
          paragraphs: [
            'For privacy inquiries, data subject requests, or account deletion:',
            'Email: privacy@animo.ph / support@animo.ph',
            'Address: City Agriculture Office / MAO, Antipolo City Hall, Rizal.',
          ],
        },
      ],
    },
    faq: {
      title: 'Help & Frequently Asked Questions',
      subtitle: 'Answers to common questions about buying and selling palay on Animo',
      categories: [
        { id: 'all', label: 'All' },
        { id: 'general', label: 'General' },
        { id: 'pricing', label: 'Pricing & Market' },
        { id: 'farmer', label: 'Farmers' },
        { id: 'buyer', label: 'Buyers' },
        { id: 'receipts', label: 'Receipts & Support' },
      ],
      items: [
        {
          id: 'faq-1',
          category: 'general',
          categoryLabel: 'General',
          question: 'What is Animo and how does it help me?',
          answer: 'Animo is a digital platform directly connecting local rice farmers with commercial buyers. It eliminates exploitative intermediaries by providing official government-backed benchmark pricing (PSA/NFA), secure payments, and verifiable receipts.',
        },
        {
          id: 'faq-2',
          category: 'general',
          categoryLabel: 'General',
          question: 'How do I register and why do I need to choose a role?',
          answer: 'Enter your 10-digit mobile number and input the 6-digit SMS OTP. Choose whether you are a Farmer (selling) or Buyer (purchasing). Roles are permanently set upon verification to maintain trust and security across the trading community.',
        },
        {
          id: 'faq-3',
          category: 'general',
          categoryLabel: 'General',
          question: 'What should I do if I did not receive my SMS OTP?',
          answer: 'Ensure your phone has cellular signal and your number was entered correctly. Wait 60 seconds before tapping "Request New OTP". If the issue persists, restart the app or reach out to our support desk.',
        },
        {
          id: 'faq-4',
          category: 'pricing',
          categoryLabel: 'Pricing & Market',
          question: 'How is the palay price per kg calculated? Why is it locked?',
          answer: 'Prices are automatically computed from: (1) Official PSA/DA farmgate benchmarks for Rizal, (2) Moisture level (Dry vs Wet), and (3) Seed variety premiums (e.g. certified Rc218 / Grade A). The price is locked upon listing to protect farmers from price-gouging and give buyers certainty.',
        },
        {
          id: 'faq-5',
          category: 'pricing',
          categoryLabel: 'Pricing & Market',
          question: 'What is the difference between Dry and Wet palay?',
          answer: 'Dry Palay (14% moisture) has been sun-dried or mechanically dried, making it immediately ready for milling and commanding a higher price. Wet Palay is freshly harvested with high moisture that requires drying before milling.',
        },
        {
          id: 'faq-6',
          category: 'pricing',
          categoryLabel: 'Pricing & Market',
          question: 'What are the palay varieties (Inbred, Hybrid, Traditional)?',
          answer: 'Inbred (e.g., NSIC Rc222, Rc160) are certified seeds with consistent yields. Hybrid (e.g., SL-8H) are high-yield F1 seeds. Traditional/Heirloom (e.g., Dinorado, Sinandomeng) are heritage fragrant grains with special market premiums.',
        },
        {
          id: 'faq-7',
          category: 'farmer',
          categoryLabel: 'Farmers',
          question: 'How do I list my harvest for sale?',
          answer: 'Go to the "My Harvest" tab or tap "Sell My Palay Harvest". Upload a clear harvest photo, select variety, moisture level (Dry or Wet), and total weight in kilograms. The benchmark price will calculate automatically. Tap "Publish Listing".',
        },
        {
          id: 'faq-8',
          category: 'farmer',
          categoryLabel: 'Farmers',
          question: 'When should I release the palay sacks to the buyer?',
          answer: 'IMPORTANT: Never release sacks until you see "Payment Confirmed" in the app and verify the incoming funds in your personal GCash app, or receive full cash payment on pickup.',
        },
        {
          id: 'faq-9',
          category: 'farmer',
          categoryLabel: 'Farmers',
          question: 'How do Farm Advisories and Weather Alerts work?',
          answer: 'Payo sa Bukid uses one Antipolo rainfall forecast and your crop stage. The card shows Advance Cut, Delayed Harvest, or No Action Needed. You read it in the app.',
        },
        {
          id: 'faq-10',
          category: 'buyer',
          categoryLabel: 'Buyers',
          question: 'How do I search and place an order on the Marketplace?',
          answer: 'Open the "Market" tab, filter by variety, moisture level, or barangay. Tap a listing to view farmer details and grain specs, enter your desired quantity, and tap "Send Purchase Request".',
        },
        {
          id: 'faq-11',
          category: 'buyer',
          categoryLabel: 'Buyers',
          question: 'What if delivered palay has incorrect moisture or short weight?',
          answer: 'Inspect the grain upon delivery before confirming receipt. If there is a major discrepancy, do not complete the order in the app and contact the MAO or Helpdesk immediately for dispute resolution.',
        },
        {
          id: 'faq-12',
          category: 'receipts',
          categoryLabel: 'Receipts & Support',
          question: 'What is a Blockchain Digital Receipt and why is it important?',
          answer: 'Every completed order creates a digital receipt with a cryptographic hash recorded on an immutable ledger. It serves as permanent legal proof of trade under the Philippine E-Commerce Act.',
        },
        {
          id: 'faq-13',
          category: 'receipts',
          categoryLabel: 'Receipts & Support',
          question: 'Who can I contact for help or disputes?',
          answer: 'Contact support@animo.ph, visit the City Agriculture Office (MAO) at Antipolo City Hall, or use the Support button in the app profile screen.',
        },
      ] as FaqItem[],
    },
  },
} as const;
