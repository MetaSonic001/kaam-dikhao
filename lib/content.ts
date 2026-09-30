import type { Lang } from "./types";

export type Section = { id: string; title: string; body: string[] };

/** Long-form trust pages. Written per language (not machine-translated) so the legal meaning stays precise. */
export const METHODOLOGY: Record<Lang, { title: string; intro: string; sections: Section[] }> = {
  en: {
    title: "How Kaam Dikhao works",
    intro: "Every claim on this site has a source, a date and a way to challenge it. This page explains exactly what we do and what we do not do.",
    sections: [
      { id: "sources", title: "Where the data comes from", body: [
        "Public works are discovered from OpenStreetMap, where volunteers tag roads, rail lines, bridges and public buildings that are under construction. It is refreshed every six hours for each city. OpenStreetMap does not contain sanctioned amounts or contractor names.",
        "Money, contractors and dates appear only when an official document (tender, work order, completion certificate or RTI reply) has been attached to a project and checked by a moderator. Each figure links to its source.",
        "Satellite imagery is Sentinel-2 from the Copernicus programme (ESA), read live from open cloud storage. The historical slider uses Sentinel-2 cloudless mosaics (EOX). Localities and wards come from OpenStreetMap geocoding.",
      ] },
      { id: "verified", title: "What Verified, Under review and Disputed mean", body: [
        "Verified: a human moderator checked that the photo has a location and capture time (or a location the citizen confirmed), that it is near the project, that it is not a duplicate, and that personal information was removed. It means the observation is credible. It does not mean the work is good or bad, and it is not a finding about any person or organisation.",
        "Under review: submitted and waiting for a moderator. Nothing is public until it is reviewed. Disputed: a moderator or the responsible organisation has raised a question; both sides stay visible. Insufficient evidence: not enough reviewed evidence to say anything either way.",
      ] },
      { id: "delayed", title: "Why a project appears delayed", body: [
        "A project shows as delayed only when a published expected date (for example the OpenStreetMap opening_date tag or a date in an attached work order) has passed and no completion has been recorded. The label does not say why, and it does not say anyone is responsible.",
        "When a work is no longer tagged as under construction on OpenStreetMap, it is shown as completed and marked as a community-mapping signal. It is not an official completion record until a document is attached.",
      ] },
      { id: "satellite", title: "Satellite evidence", body: [
        "A Sentinel-2 pixel covers 10 by 10 metres. That is enough to see a new road corridor, cleared land or a large surface change. It is not enough to judge the quality of a road surface, a pothole or a drain cover.",
        "The change indicator compares cloud-free scenes about a year apart inside a 1.2 km window using vegetation (NDVI) and brightness. It is a candidate observation for humans to review and never evidence of wrongdoing.",
      ] },
      { id: "score", title: "Project health score", body: [
        "The score is a weighted mean of three measurable components: timeline against the published expected date (40 percent), verified ground evidence (35 percent), and the share of verified observations that report no problem (25 percent). It appears only after at least three observations have been verified, because a single photo is an anecdote, not a score.",
        "Components without data are left out and shown as unavailable. Public-record completeness is shown beside the score but never counted against a project, because a missing record often just means we have not been given it yet. The score is a composite of public evidence, not a legal or audit finding.",
      ] },
      { id: "ai", title: "What AI does and does not do", body: [
        "AI drafts and suggests. It reads text from PDFs and scans, transcribes voice notes, proposes a category and neutral wording for a photo, proposes matching projects, summarises RTI replies and drafts RTI applications.",
        "AI never publishes anything, never decides responsibility and never accuses anyone. Every AI output is labelled as a candidate and passes a human moderator. The assistant answers only from indexed records and cites them.",
      ] },
      { id: "moderation", title: "Moderation, replies and corrections", body: [
        "Nothing submitted by a citizen is public until a moderator approves it. Each decision is recorded in an audit log with the reason. Accusatory language is rewritten into neutral observation. Phone numbers, email addresses, ID numbers and vehicle plates are removed automatically and faces in photos are blurred.",
        "Any department, agency or contractor can reply to any project or observation. The reply is shown beside the original evidence and nothing is silently removed. Anyone can ask for a correction or removal through the grievance page. Complaints are acknowledged immediately and resolved within 15 days.",
      ] },
      { id: "cards", title: "Report cards", body: [
        "Report cards show counts: projects, statuses and how many have reviewed ground evidence. They do not rank or rate anyone. Contractors appear only when an attached official record names them.",
      ] },
    ],
  },
  hi: {
    title: "काम दिखाओ कैसे काम करता है",
    intro: "इस साइट पर हर दावे का एक स्रोत, एक तारीख और उसे चुनौती देने का तरीका है। यह पेज बताता है कि हम क्या करते हैं और क्या नहीं करते।",
    sections: [
      { id: "sources", title: "डेटा कहाँ से आता है", body: [
        "निर्माणाधीन सड़कें, रेल लाइनें, पुल और सार्वजनिक इमारतें OpenStreetMap से मिलती हैं, जहाँ स्वयंसेवक उन्हें टैग करते हैं। हर शहर का डेटा हर छह घंटे में अपडेट होता है। OpenStreetMap में स्वीकृत राशि या ठेकेदार का नाम नहीं होता।",
        "राशि, ठेकेदार और तारीखें तभी दिखती हैं जब कोई आधिकारिक दस्तावेज़ (टेंडर, वर्क ऑर्डर, समापन प्रमाणपत्र या RTI उत्तर) जोड़ा गया हो और मॉडरेटर ने जाँचा हो। हर आँकड़ा अपने स्रोत से जुड़ा है।",
        "उपग्रह चित्र कॉपरनिकस कार्यक्रम (ESA) के Sentinel-2 से सीधे लिए जाते हैं। इलाके और वार्ड OpenStreetMap से आते हैं।",
      ] },
      { id: "verified", title: "सत्यापित, समीक्षाधीन और विवादित का मतलब", body: [
        "सत्यापित: मॉडरेटर ने जाँचा कि फोटो में स्थान और समय है, वह परियोजना के पास है, दोहराई नहीं गई है और निजी जानकारी हटाई गई है। इसका मतलब है कि अवलोकन विश्वसनीय है। यह किसी व्यक्ति या संस्था के बारे में निष्कर्ष नहीं है।",
        "समीक्षाधीन: मॉडरेटर की प्रतीक्षा में; समीक्षा से पहले कुछ भी सार्वजनिक नहीं होता। विवादित: कोई प्रश्न उठाया गया है; दोनों पक्ष दिखते रहते हैं।",
      ] },
      { id: "delayed", title: "परियोजना देरी से क्यों दिखती है", body: [
        "परियोजना तभी देरी से दिखती है जब प्रकाशित अपेक्षित तारीख निकल चुकी हो और पूर्णता दर्ज न हो। यह लेबल कारण नहीं बताता और किसी को ज़िम्मेदार नहीं ठहराता।",
        "जब कोई काम OpenStreetMap पर निर्माणाधीन नहीं रहता, तो उसे पूर्ण दिखाया जाता है और सामुदायिक मैपिंग संकेत के रूप में चिह्नित किया जाता है, आधिकारिक रिकॉर्ड के रूप में नहीं।",
      ] },
      { id: "satellite", title: "उपग्रह साक्ष्य", body: [
        "Sentinel-2 का एक पिक्सल 10 मीटर का होता है। इससे नया सड़क गलियारा या बड़ा बदलाव दिखता है, लेकिन सतह की गुणवत्ता, गड्ढे या ढक्कन नहीं। बदलाव का संकेतक केवल एक उम्मीदवार अवलोकन है, गड़बड़ी का सबूत नहीं।",
      ] },
      { id: "score", title: "परियोजना स्वास्थ्य स्कोर", body: [
        "स्कोर तीन मापने योग्य हिस्सों का भारित औसत है: समयरेखा (40%), सत्यापित ज़मीनी साक्ष्य (35%) और बिना समस्या वाले सत्यापित अवलोकनों का हिस्सा (25%)। यह तभी दिखता है जब कम से कम तीन अवलोकन सत्यापित हों, क्योंकि एक फोटो किस्सा है, स्कोर नहीं। जुड़े रिकॉर्ड की स्थिति साथ में दिखती है पर परियोजना के विरुद्ध नहीं गिनी जाती। यह कानूनी या ऑडिट निष्कर्ष नहीं है।",
      ] },
      { id: "ai", title: "AI क्या करता है और क्या नहीं", body: [
        "AI ड्राफ्ट और सुझाव देता है: दस्तावेज़ पढ़ता है, आवाज़ लिखता है, श्रेणी सुझाता है और RTI का मसौदा बनाता है। AI कुछ भी प्रकाशित नहीं करता, ज़िम्मेदारी तय नहीं करता और किसी पर आरोप नहीं लगाता। हर AI आउटपुट पर मानव मॉडरेटर की नज़र रहती है।",
      ] },
      { id: "moderation", title: "मॉडरेशन, जवाब और सुधार", body: [
        "नागरिक का कोई भी योगदान मॉडरेटर की मंज़ूरी से पहले सार्वजनिक नहीं होता। हर निर्णय कारण सहित ऑडिट लॉग में दर्ज होता है। आरोप वाली भाषा तटस्थ अवलोकन में बदली जाती है, फोन, ईमेल, पहचान संख्या और वाहन नंबर हटाए जाते हैं और चेहरे धुंधले किए जाते हैं।",
        "कोई भी विभाग या ठेकेदार जवाब दे सकता है; जवाब मूल साक्ष्य के बगल में दिखता है। सुधार या हटाने के लिए शिकायत पेज पर आवेदन करें; शिकायत की तुरंत पावती और 15 दिन में निपटारा होता है।",
      ] },
      { id: "cards", title: "रिपोर्ट कार्ड", body: ["रिपोर्ट कार्ड केवल गिनती दिखाते हैं। किसी को रैंक या रेटिंग नहीं दी जाती। ठेकेदार तभी दिखते हैं जब जुड़े आधिकारिक रिकॉर्ड में उनका नाम हो।"] },
    ],
  },
  mr: {
    title: "काम दिखाओ कसे काम करते",
    intro: "या साइटवरील प्रत्येक दाव्याला स्रोत, तारीख आणि त्याला आव्हान देण्याचा मार्ग आहे. आम्ही काय करतो आणि काय करत नाही ते हे पान सांगते.",
    sections: [
      { id: "sources", title: "माहिती कुठून येते", body: [
        "बांधकाम सुरू असलेले रस्ते, रेल्वे मार्ग, पूल आणि सार्वजनिक इमारती OpenStreetMap वरून मिळतात, जिथे स्वयंसेवक त्यांना टॅग करतात. प्रत्येक शहराची माहिती दर सहा तासांनी अद्ययावत होते. OpenStreetMap मध्ये मंजूर रक्कम किंवा कंत्राटदाराचे नाव नसते.",
        "रक्कम, कंत्राटदार आणि तारखा तेव्हाच दिसतात जेव्हा अधिकृत कागदपत्र (निविदा, कार्यादेश, पूर्णत्व प्रमाणपत्र किंवा RTI उत्तर) जोडले जाते आणि मॉडरेटरने तपासले असते. प्रत्येक आकडा त्याच्या स्रोताशी जोडलेला आहे.",
        "उपग्रह चित्रे कॉपरनिकस कार्यक्रमाच्या (ESA) Sentinel-2 मधून थेट घेतली जातात. परिसर आणि वॉर्ड OpenStreetMap वरून येतात.",
      ] },
      { id: "verified", title: "सत्यापित, पुनरावलोकनाधीन आणि विवादित म्हणजे काय", body: [
        "सत्यापित: मॉडरेटरने तपासले की फोटोमध्ये ठिकाण आणि वेळ आहे, तो प्रकल्पाजवळ आहे, पुनरावृत्ती नाही आणि वैयक्तिक माहिती काढली आहे. याचा अर्थ निरीक्षण विश्वासार्ह आहे. हा कोणत्याही व्यक्ती किंवा संस्थेबद्दलचा निष्कर्ष नाही.",
        "पुनरावलोकनाधीन: मॉडरेटरची वाट पाहत आहे; पुनरावलोकनापूर्वी काहीही सार्वजनिक होत नाही. विवादित: प्रश्न उपस्थित केला आहे; दोन्ही बाजू दिसत राहतात.",
      ] },
      { id: "delayed", title: "प्रकल्प उशिरा का दिसतो", body: [
        "प्रकाशित अपेक्षित तारीख उलटून गेली आणि पूर्णत्व नोंदलेले नसेल तरच प्रकल्प उशिरा दिसतो. हे लेबल कारण सांगत नाही आणि कोणालाही जबाबदार धरत नाही.",
        "एखादे काम OpenStreetMap वर बांधकामाधीन राहिले नाही तर ते पूर्ण म्हणून दाखवले जाते आणि सामुदायिक मॅपिंग संकेत म्हणून चिन्हांकित केले जाते, अधिकृत नोंद म्हणून नाही.",
      ] },
      { id: "satellite", title: "उपग्रह पुरावा", body: [
        "Sentinel-2 चा एक पिक्सेल 10 मीटरचा असतो. त्यातून नवीन रस्ता पट्टा किंवा मोठा बदल दिसतो, पण पृष्ठभागाचा दर्जा, खड्डे किंवा झाकणे नाही. बदल दर्शक हे केवळ उमेदवार निरीक्षण आहे, गैरप्रकाराचा पुरावा नाही.",
      ] },
      { id: "score", title: "प्रकल्प आरोग्य गुण", body: [
        "गुण तीन मोजता येणाऱ्या घटकांची भारित सरासरी आहे: कालावधी (40%), सत्यापित प्रत्यक्ष पुरावा (35%) आणि समस्या नसलेल्या सत्यापित निरीक्षणांचा वाटा (25%). किमान तीन निरीक्षणे सत्यापित झाल्यावरच तो दिसतो, कारण एक फोटो म्हणजे किस्सा आहे, गुण नाही. जोडलेल्या नोंदींची स्थिती सोबत दिसते पण प्रकल्पाविरुद्ध मोजली जात नाही. हा कायदेशीर किंवा ऑडिट निष्कर्ष नाही.",
      ] },
      { id: "ai", title: "AI काय करते आणि काय नाही", body: [
        "AI मसुदा आणि सूचना देते: कागदपत्रे वाचते, आवाज लिहिते, वर्ग सुचवते आणि RTI चा मसुदा तयार करते. AI काहीही प्रकाशित करत नाही, जबाबदारी ठरवत नाही आणि कोणावरही आरोप करत नाही. प्रत्येक AI निष्कर्ष मानवी मॉडरेटर तपासतो.",
      ] },
      { id: "moderation", title: "मॉडरेशन, उत्तर आणि दुरुस्ती", body: [
        "नागरिकाचे कोणतेही योगदान मॉडरेटरच्या मंजुरीपूर्वी सार्वजनिक होत नाही. प्रत्येक निर्णय कारणासह ऑडिट लॉगमध्ये नोंदवला जातो. आरोपांची भाषा तटस्थ निरीक्षणात बदलली जाते, फोन, ईमेल, ओळख क्रमांक आणि वाहन क्रमांक काढले जातात आणि चेहरे अस्पष्ट केले जातात.",
        "कोणताही विभाग किंवा कंत्राटदार उत्तर देऊ शकतो; उत्तर मूळ पुराव्याशेजारी दिसते. दुरुस्ती किंवा काढण्यासाठी तक्रार पानावर अर्ज करा; तक्रारीची त्वरित पोच आणि 15 दिवसांत निपटारा होतो.",
      ] },
      { id: "cards", title: "रिपोर्ट कार्ड", body: ["रिपोर्ट कार्ड केवळ संख्या दाखवतात. कोणालाही क्रमांक किंवा रेटिंग दिले जात नाही. जोडलेल्या अधिकृत नोंदीत नाव असेल तरच कंत्राटदार दिसतात."] },
    ],
  },
};

export const LEGAL: Record<Lang, { title: string; intro: string; officer: string; sections: Section[] }> = {
  en: {
    title: "Terms, privacy and how to raise a concern",
    intro: "Kaam Dikhao is a neutral platform for public information. These rules protect citizens who contribute, and people and organisations who are named.",
    officer: "Grievance Officer (IT Rules 2021)",
    sections: [
      { id: "terms", title: "Terms of use", body: [
        "Kaam Dikhao is an intermediary under the Information Technology Act 2000. Content is contributed by users; we review it before publishing and act on complaints. By submitting content you confirm it is your own, that you took it yourself, and that it is accurate to the best of your knowledge.",
        "You keep the copyright in what you submit and give us a licence to publish and display it on Kaam Dikhao. Do not submit anything unlawful, defamatory, obscene, or that invades someone's privacy. We may reject or remove content that breaks these terms.",
      ] },
      { id: "guidelines", title: "Community guidelines", body: [
        "Describe what you see, not what you think someone intended. Say the pothole is 30 cm deep, not that a contractor is corrupt. We rewrite accusatory language into neutral observation and moderators may reject content that names private individuals.",
        "Do not photograph people on purpose. Faces are blurred automatically, but please avoid them. Do not submit photos taken inside private property or of children.",
      ] },
      { id: "privacy", title: "Privacy (Digital Personal Data Protection Act 2023)", body: [
        "We collect only what we need: your email to sign you in, the photos, voice notes and text you submit, and the location of a photo. Photo files are stripped of hidden location and device data, faces are blurred, and phone numbers, ID numbers and vehicle plates in text are removed before anything is public.",
        "Your name and email are never shown publicly. The original text you typed is kept privately for moderators only. You can ask to see, correct or delete your data, or withdraw a submission, by writing to the Grievance Officer. Voice notes are processed by a speech-to-text provider and not published. We do not sell personal data.",
      ] },
      { id: "evidence", title: "Evidence, corrections and right of reply", body: [
        "Every published observation shows its date, location and review state. Departments, agencies and contractors can reply to any project and the reply stays next to the evidence. If something is wrong, ask for a correction and we will fix or remove it and record why.",
      ] },
      { id: "grievance", title: "Report a problem with content", body: [
        "If content on Kaam Dikhao is inaccurate, defamatory, exposes personal information or infringes your rights, tell us below. We acknowledge every complaint immediately and resolve it within 15 days, as the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021 require. We may hide content while we review it.",
        "For government orders and court orders, write to the Grievance Officer with a copy of the order.",
      ] },
    ],
  },
  hi: {
    title: "शर्तें, गोपनीयता और शिकायत कैसे करें",
    intro: "काम दिखाओ सार्वजनिक जानकारी का एक तटस्थ मंच है। ये नियम योगदान देने वाले नागरिकों और जिनका नाम आता है, उन लोगों और संस्थाओं की रक्षा करते हैं।",
    officer: "शिकायत अधिकारी (IT नियम 2021)",
    sections: [
      { id: "terms", title: "उपयोग की शर्तें", body: [
        "काम दिखाओ सूचना प्रौद्योगिकी अधिनियम 2000 के तहत एक मध्यस्थ है। सामग्री उपयोगकर्ता देते हैं; हम प्रकाशन से पहले समीक्षा करते हैं और शिकायतों पर कार्रवाई करते हैं। सामग्री जमा करके आप पुष्टि करते हैं कि वह आपकी अपनी है और आपकी जानकारी में सही है।",
        "आप अपनी सामग्री का कॉपीराइट रखते हैं और हमें उसे प्रकाशित करने का लाइसेंस देते हैं। गैरकानूनी, मानहानिकारक, अश्लील या किसी की निजता भंग करने वाली सामग्री न डालें।",
      ] },
      { id: "guidelines", title: "सामुदायिक दिशानिर्देश", body: [
        "जो दिखता है वह बताएँ, किसी के इरादे का अनुमान नहीं। लिखें कि गड्ढा 30 सेमी गहरा है, यह नहीं कि ठेकेदार भ्रष्ट है। आरोप वाली भाषा तटस्थ बनाई जाती है और निजी व्यक्तियों के नाम वाली सामग्री अस्वीकार हो सकती है।",
        "जानबूझकर लोगों की तस्वीर न लें। चेहरे अपने आप धुंधले होते हैं। निजी संपत्ति के अंदर या बच्चों की तस्वीरें न डालें।",
      ] },
      { id: "privacy", title: "गोपनीयता (डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम 2023)", body: [
        "हम केवल ज़रूरी चीज़ें लेते हैं: साइन-इन के लिए ईमेल, आपकी फोटो, आवाज़ और पाठ, और फोटो का स्थान। फोटो से छिपा स्थान और डिवाइस डेटा हटाया जाता है, चेहरे धुंधले होते हैं, और पाठ से फोन, पहचान संख्या और वाहन नंबर हटाए जाते हैं।",
        "आपका नाम और ईमेल कभी सार्वजनिक नहीं होते। अपना डेटा देखने, सुधारने, मिटाने या योगदान वापस लेने के लिए शिकायत अधिकारी को लिखें। हम व्यक्तिगत डेटा नहीं बेचते।",
      ] },
      { id: "evidence", title: "साक्ष्य, सुधार और जवाब का अधिकार", body: ["हर प्रकाशित अवलोकन में तारीख, स्थान और समीक्षा स्थिति दिखती है। विभाग, एजेंसी या ठेकेदार किसी भी परियोजना पर जवाब दे सकते हैं और जवाब साक्ष्य के बगल में रहता है। कुछ गलत हो तो सुधार माँगें।"] },
      { id: "grievance", title: "सामग्री की शिकायत करें", body: [
        "यदि सामग्री गलत, मानहानिकारक है, निजी जानकारी उजागर करती है या आपके अधिकारों का उल्लंघन करती है, तो नीचे बताएँ। हम तुरंत पावती देते हैं और IT नियम 2021 के अनुसार 15 दिन में निपटारा करते हैं। समीक्षा के दौरान सामग्री छिपाई जा सकती है।",
        "सरकारी या अदालती आदेश के लिए आदेश की प्रति के साथ शिकायत अधिकारी को लिखें।",
      ] },
    ],
  },
  mr: {
    title: "अटी, गोपनीयता आणि तक्रार कशी करावी",
    intro: "काम दिखाओ हे सार्वजनिक माहितीचे तटस्थ व्यासपीठ आहे. हे नियम योगदान देणाऱ्या नागरिकांचे आणि ज्यांची नावे येतात त्या व्यक्ती व संस्थांचे संरक्षण करतात.",
    officer: "तक्रार अधिकारी (IT नियम 2021)",
    sections: [
      { id: "terms", title: "वापराच्या अटी", body: [
        "काम दिखाओ हे माहिती तंत्रज्ञान कायदा 2000 अंतर्गत मध्यस्थ आहे. मजकूर वापरकर्ते देतात; आम्ही प्रकाशनापूर्वी तपासतो आणि तक्रारींवर कारवाई करतो. मजकूर सादर करून तुम्ही खात्री देता की तो तुमचा स्वतःचा आणि तुमच्या माहितीनुसार बरोबर आहे.",
        "तुमच्या मजकुराचा कॉपीराइट तुमच्याकडे राहतो आणि तो प्रकाशित करण्याचा परवाना तुम्ही आम्हाला देता. बेकायदेशीर, बदनामीकारक, अश्लील किंवा कोणाच्या खासगीपणाचा भंग करणारा मजकूर देऊ नका.",
      ] },
      { id: "guidelines", title: "सामुदायिक मार्गदर्शक तत्त्वे", body: [
        "जे दिसते ते सांगा, कोणाचा हेतू काय असावा ते नाही. खड्डा 30 सेमी खोल आहे असे लिहा, कंत्राटदार भ्रष्ट आहे असे नाही. आरोपांची भाषा तटस्थ केली जाते आणि खासगी व्यक्तींची नावे असलेला मजकूर नाकारला जाऊ शकतो.",
        "मुद्दाम लोकांचे फोटो काढू नका. चेहरे आपोआप अस्पष्ट होतात. खासगी मालमत्तेतील किंवा मुलांचे फोटो देऊ नका.",
      ] },
      { id: "privacy", title: "गोपनीयता (डिजिटल वैयक्तिक डेटा संरक्षण कायदा 2023)", body: [
        "आम्ही फक्त आवश्यक तेवढेच घेतो: साइन-इनसाठी ईमेल, तुमचे फोटो, आवाज आणि मजकूर, आणि फोटोचे ठिकाण. फोटोमधून लपलेले ठिकाण आणि डिव्हाइस डेटा काढला जातो, चेहरे अस्पष्ट होतात आणि मजकुरातील फोन, ओळख क्रमांक आणि वाहन क्रमांक काढले जातात.",
        "तुमचे नाव आणि ईमेल कधीही सार्वजनिक होत नाहीत. तुमचा डेटा पाहणे, दुरुस्त करणे, हटवणे किंवा योगदान मागे घेण्यासाठी तक्रार अधिकाऱ्याला लिहा. आम्ही वैयक्तिक डेटा विकत नाही.",
      ] },
      { id: "evidence", title: "पुरावा, दुरुस्ती आणि उत्तराचा अधिकार", body: ["प्रत्येक प्रकाशित निरीक्षणात तारीख, ठिकाण आणि पुनरावलोकन स्थिती दिसते. विभाग, संस्था किंवा कंत्राटदार कोणत्याही प्रकल्पावर उत्तर देऊ शकतात आणि उत्तर पुराव्याशेजारी राहते. काही चुकीचे असल्यास दुरुस्ती मागा."] },
      { id: "grievance", title: "मजकुराबद्दल तक्रार करा", body: [
        "मजकूर चुकीचा, बदनामीकारक असेल, वैयक्तिक माहिती उघड करत असेल किंवा तुमच्या हक्कांचा भंग करत असेल तर खाली कळवा. आम्ही त्वरित पोच देतो आणि IT नियम 2021 नुसार 15 दिवसांत निपटारा करतो. पुनरावलोकनादरम्यान मजकूर लपवला जाऊ शकतो.",
        "सरकारी किंवा न्यायालयीन आदेशासाठी आदेशाच्या प्रतीसह तक्रार अधिकाऱ्याला लिहा.",
      ] },
    ],
  },
};

export const ABOUT: Record<Lang, { title: string; lead: string; principles: { t: string; d: string }[] }> = {
  en: {
    title: "A public evidence layer for public works",
    lead: "Kaam Dikhao connects what the record says was built with what people can see on the ground, then makes the next step easy: report it, ask for the records, or check the source. We do not replace any government system. Official portals remain the source of record.",
    principles: [
      { t: "Neutral by design", d: "We describe, we do not accuse. Governments and contractors have equal right of reply, and disagreement stays visible." },
      { t: "Every claim has a source", d: "Each number links to where it came from, with a date and a way to challenge it." },
      { t: "Humans decide", d: "AI reads, drafts and suggests. A person reviews everything before it is public." },
      { t: "Open by default", d: "Built on OpenStreetMap, Copernicus Sentinel-2, and open-source software. No login is needed to explore." },
      { t: "For every Indian", d: "Works in English, हिन्दी and मराठी, on a phone, with a photo or a voice note." },
    ],
  },
  hi: {
    title: "सार्वजनिक कामों के लिए एक सार्वजनिक साक्ष्य परत",
    lead: "काम दिखाओ रिकॉर्ड में जो बना बताया गया है उसे ज़मीन पर दिखने वाली सच्चाई से जोड़ता है, और अगला कदम आसान बनाता है: रिपोर्ट करें, रिकॉर्ड माँगें या स्रोत देखें। हम किसी सरकारी प्रणाली की जगह नहीं लेते।",
    principles: [
      { t: "डिज़ाइन से तटस्थ", d: "हम वर्णन करते हैं, आरोप नहीं लगाते। सरकार और ठेकेदार को जवाब का बराबर अधिकार है।" },
      { t: "हर दावे का स्रोत", d: "हर आँकड़ा अपने स्रोत, तारीख और चुनौती देने के तरीके से जुड़ा है।" },
      { t: "फैसला इंसान करते हैं", d: "AI पढ़ता और सुझाता है। सार्वजनिक होने से पहले हर चीज़ को इंसान जाँचता है।" },
      { t: "डिफ़ॉल्ट रूप से खुला", d: "OpenStreetMap, Sentinel-2 और ओपन-सोर्स सॉफ़्टवेयर पर बना। देखने के लिए लॉगिन नहीं चाहिए।" },
      { t: "हर भारतीय के लिए", d: "अंग्रेज़ी, हिन्दी और मराठी में, फोन पर, फोटो या आवाज़ से।" },
    ],
  },
  mr: {
    title: "सार्वजनिक कामांसाठी सार्वजनिक पुरावा स्तर",
    lead: "काम दिखाओ नोंदीत सांगितलेले काम आणि प्रत्यक्ष दिसणारी स्थिती यांची सांगड घालते आणि पुढचे पाऊल सोपे करते: नोंद करा, कागदपत्रे मागा किंवा स्रोत तपासा. आम्ही कोणत्याही सरकारी प्रणालीची जागा घेत नाही.",
    principles: [
      { t: "रचनेतच तटस्थ", d: "आम्ही वर्णन करतो, आरोप करत नाही. सरकार आणि कंत्राटदारांना उत्तराचा समान अधिकार आहे." },
      { t: "प्रत्येक दाव्याला स्रोत", d: "प्रत्येक आकडा त्याच्या स्रोत, तारीख आणि आव्हान देण्याच्या मार्गाशी जोडलेला आहे." },
      { t: "निर्णय माणसे घेतात", d: "AI वाचते आणि सुचवते. सार्वजनिक होण्यापूर्वी प्रत्येक गोष्ट माणूस तपासतो." },
      { t: "मुळातच खुले", d: "OpenStreetMap, Sentinel-2 आणि ओपन-सोर्स सॉफ्टवेअरवर आधारित. पाहण्यासाठी लॉगिन नको." },
      { t: "प्रत्येक भारतीयासाठी", d: "इंग्रजी, हिन्दी आणि मराठीत, फोनवर, फोटो किंवा आवाजाने." },
    ],
  },
};
