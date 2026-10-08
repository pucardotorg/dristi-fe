import type { Copy } from "@/lib/onboarding/content";

/**
 * Settings copy.
 *
 * The pages themselves (menu, headings, rows, buttons) are written in English,
 * Malayalam, Hindi, Tamil and Bengali, the demo's translated set (owner, Sept 30: to see
 * how the pages hold up in longer scripts). Dialog bodies carry English and Malayalam
 * like the rest of the product and fall back to English in the others, which is the
 * fallback every screen now has.
 */
type Others = Partial<Omit<Copy, "en">>;
const s = (en: string, others: Others = {}): Copy => ({ en, ...others });

export const settingsCopy = {
  title: s("Settings", { ml: "ക്രമീകരണങ്ങൾ", hi: "सेटिंग्स", ta: "அமைப்புகள்", bn: "সেটিংস" }),
  subtitle: s("Your account, how you sign in, and how DRISTI looks and reads.", {
    ml: "നിങ്ങളുടെ അക്കൗണ്ട്, സൈൻ ഇൻ രീതി, DRISTI കാണുന്നതും വായിക്കുന്നതും എങ്ങനെ എന്നിവ.",
    hi: "आपका खाता, आप कैसे साइन इन करते हैं, और DRISTI कैसा दिखता और पढ़ा जाता है।",
    ta: "உங்கள் கணக்கு, நீங்கள் உள்நுழையும் விதம், DRISTI எப்படித் தோன்றுகிறது, எப்படிப் படிக்கப்படுகிறது.",
    bn: "আপনার অ্যাকাউন্ট, আপনি কীভাবে সাইন ইন করেন, এবং DRISTI কেমন দেখায় ও পড়া যায়।",
  }),
  back: s("Back to settings", { ml: "ക്രമീകരണങ്ങളിലേക്ക് മടങ്ങുക", hi: "सेटिंग्स पर वापस जाएँ", ta: "அமைப்புகளுக்குத் திரும்பு", bn: "সেটিংসে ফিরে যান" }),

  groups: {
    account: s("Account", { ml: "അക്കൗണ്ട്", hi: "खाता", ta: "கணக்கு", bn: "অ্যাকাউন্ট" }),
    preferences: s("Preferences", { ml: "മുൻഗണനകൾ", hi: "पसंद", ta: "விருப்பங்கள்", bn: "পছন্দ" }),
    help: s("Help", { ml: "സഹായം", hi: "सहायता", ta: "உதவி", bn: "সাহায্য" }),
  },

  pages: {
    profile: {
      title: s("Profile", { ml: "പ്രൊഫൈൽ", hi: "प्रोफ़ाइल", ta: "சுயவிவரம்", bn: "প্রোফাইল" }),
      description: s("Your name, contact details, ID and address.", {
        ml: "നിങ്ങളുടെ പേര്, ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ, ID, വിലാസം.",
        hi: "आपका नाम, संपर्क विवरण, पहचान पत्र और पता।",
        ta: "உங்கள் பெயர், தொடர்பு விவரங்கள், அடையாள அட்டை, முகவரி.",
        bn: "আপনার নাম, যোগাযোগের তথ্য, পরিচয়পত্র ও ঠিকানা।",
      }),
    },
    advocate: {
      title: s("Advocate details", { ml: "അഭിഭാഷക വിവരങ്ങൾ", hi: "अधिवक्ता विवरण", ta: "வழக்கறிஞர் விவரங்கள்", bn: "আইনজীবীর বিবরণ" }),
      description: s("Your Bar registration and chamber address.", {
        ml: "നിങ്ങളുടെ ബാർ രജിസ്ട്രേഷനും ചേംബർ വിലാസവും.",
        hi: "आपका बार पंजीकरण और चैंबर का पता।",
        ta: "உங்கள் பார் பதிவும் அலுவலக முகவரியும்.",
        bn: "আপনার বার নিবন্ধন ও চেম্বারের ঠিকানা।",
      }),
    },
    "account-type": {
      title: s("Account type", { ml: "അക്കൗണ്ട് തരം", hi: "खाते का प्रकार", ta: "கணக்கு வகை", bn: "অ্যাকাউন্টের ধরন" }),
      description: s("Your profiles, and moving between them.", {
        ml: "നിങ്ങളുടെ പ്രൊഫൈലുകളും അവയ്ക്കിടയിൽ മാറുന്നതും.",
        hi: "आपकी प्रोफ़ाइलें, और उनके बीच बदलना।",
        ta: "உங்கள் சுயவிவரங்கள், அவற்றுக்கிடையே மாறுதல்.",
        bn: "আপনার প্রোফাইলগুলো, এবং এগুলোর মধ্যে বদল।",
      }),
    },
    security: {
      title: s("Sign-in and security", { ml: "സൈൻ ഇൻ, സുരക്ഷ", hi: "साइन इन और सुरक्षा", ta: "உள்நுழைவு மற்றும் பாதுகாப்பு", bn: "সাইন ইন ও নিরাপত্তা" }),
      description: s("Mobile number, password and signed-in devices.", {
        ml: "മൊബൈൽ നമ്പർ, പാസ്‌വേഡ്, സൈൻ ഇൻ ചെയ്ത ഉപകരണങ്ങൾ.",
        hi: "मोबाइल नंबर, पासवर्ड और साइन इन किए गए डिवाइस।",
        ta: "கைபேசி எண், கடவுச்சொல், உள்நுழைந்த சாதனங்கள்.",
        bn: "মোবাইল নম্বর, পাসওয়ার্ড ও সাইন ইন করা ডিভাইস।",
      }),
    },
    display: {
      title: s("Display and accessibility", { ml: "പ്രദർശനവും പ്രാപ്യതയും", hi: "डिस्प्ले और सुगम्यता", ta: "காட்சி மற்றும் அணுகல்தன்மை", bn: "প্রদর্শন ও সহজলভ্যতা" }),
      description: s("Theme, text size and time before sign-out.", {
        ml: "തീം, അക്ഷര വലുപ്പം, സൈൻ ഔട്ടിന് മുമ്പുള്ള സമയം.",
        hi: "थीम, अक्षरों का आकार और साइन आउट से पहले का समय।",
        ta: "தீம், எழுத்து அளவு, வெளியேறும் முன் நேரம்.",
        bn: "থিম, লেখার আকার ও সাইন আউটের আগের সময়।",
      }),
    },
    language: {
      title: s("Language", { ml: "ഭാഷ", hi: "भाषा", ta: "மொழி", bn: "ভাষা" }),
      description: s("The language on screen, and the one beside English.", {
        ml: "സ്ക്രീനിലെ ഭാഷയും ഇംഗ്ലീഷിനൊപ്പമുള്ള ഭാഷയും.",
        hi: "स्क्रीन की भाषा, और अंग्रेज़ी के साथ वाली भाषा।",
        ta: "திரையில் உள்ள மொழி, ஆங்கிலத்துடன் உள்ள மொழி.",
        bn: "পর্দার ভাষা, আর ইংরেজির পাশের ভাষা।",
      }),
    },
    help: {
      title: s("Help and support", { ml: "സഹായവും പിന്തുണയും", hi: "सहायता और समर्थन", ta: "உதவி மற்றும் ஆதரவு", bn: "সাহায্য ও সহায়তা" }),
      description: s("Common questions, who to call, and reporting a problem.", {
        ml: "പതിവ് ചോദ്യങ്ങൾ, ആരെ വിളിക്കണം, ഒരു പ്രശ്നം അറിയിക്കൽ.",
        hi: "आम सवाल, किसे फ़ोन करें, और समस्या बताना।",
        ta: "பொதுவான கேள்விகள், யாரை அழைப்பது, சிக்கலைத் தெரிவித்தல்.",
        bn: "সাধারণ প্রশ্ন, কাকে ফোন করবেন, আর সমস্যা জানানো।",
      }),
    },
  },

  /* Shared row and button words */
  change: s("Change", { ml: "മാറ്റുക", hi: "बदलें", ta: "மாற்று", bn: "বদলান" }),
  add: s("Add", { ml: "ചേർക്കുക", hi: "जोड़ें", ta: "சேர்", bn: "যোগ করুন" }),
  replace: s("Replace", { ml: "മാറ്റിവയ്ക്കുക", hi: "बदलें", ta: "மாற்றிடு", bn: "প্রতিস্থাপন" }),
  view: s("View", { ml: "കാണുക", hi: "देखें", ta: "பார்", bn: "দেখুন" }),
  notAdded: s("Not added", { ml: "ചേർത്തിട്ടില്ല", hi: "नहीं जोड़ा गया", ta: "சேர்க்கப்படவில்லை", bn: "যোগ করা হয়নি" }),
  save: s("Save", { ml: "സംരക്ഷിക്കുക", hi: "सहेजें", ta: "சேமி", bn: "সংরক্ষণ করুন" }),
  cancel: s("Cancel", { ml: "റദ്ദാക്കുക", hi: "रद्द करें", ta: "ரத்துசெய்", bn: "বাতিল" }),
  done: s("Done", { ml: "പൂർത്തിയായി", hi: "हो गया", ta: "முடிந்தது", bn: "হয়ে গেছে" }),
  optional: s("(optional)", { ml: "(നിർബന്ധമല്ല)", hi: "(वैकल्पिक)", ta: "(விருப்பத்தேர்வு)", bn: "(ঐচ্ছিক)" }),

  profile: {
    accountTitle: s("Account", { ml: "അക്കൗണ്ട്", hi: "खाता", ta: "கணக்கு", bn: "অ্যাকাউন্ট" }),
    accountBody: s("Set by DRISTI when you registered. These cannot be changed.", {
      ml: "രജിസ്റ്റർ ചെയ്തപ്പോൾ DRISTI നൽകിയവ. ഇവ മാറ്റാനാവില്ല.",
      hi: "पंजीकरण के समय DRISTI ने दिए। इन्हें बदला नहीं जा सकता।",
      ta: "பதிவு செய்தபோது DRISTI வழங்கியவை. இவற்றை மாற்ற முடியாது.",
      bn: "নিবন্ধনের সময় DRISTI দিয়েছে। এগুলো বদলানো যায় না।",
    }),
    accountId: s("Account ID", { ml: "അക്കൗണ്ട് ID", hi: "खाता ID", ta: "கணக்கு ID", bn: "অ্যাকাউন্ট ID" }),
    registeredOn: s("Registered on", { ml: "രജിസ്റ്റർ ചെയ്ത തീയതി", hi: "पंजीकरण की तारीख", ta: "பதிவு செய்த தேதி", bn: "নিবন্ধনের তারিখ" }),
    profiles: s("Profiles", { ml: "പ്രൊഫൈലുകൾ", hi: "प्रोफ़ाइलें", ta: "சுயவிவரங்கள்", bn: "প্রোফাইল" }),
    applicationId: s("Advocate application ID", { ml: "അഭിഭാഷക അപേക്ഷ ID", hi: "अधिवक्ता आवेदन ID", ta: "வழக்கறிஞர் விண்ணப்ப ID", bn: "আইনজীবী আবেদন ID" }),
    detailsTitle: s("Personal details", { ml: "വ്യക്തിഗത വിവരങ്ങൾ", hi: "व्यक्तिगत विवरण", ta: "தனிப்பட்ட விவரங்கள்", bn: "ব্যক্তিগত তথ্য" }),
    detailsBody: s("The court uses these for your records and to reach you.", {
      ml: "നിങ്ങളുടെ രേഖകൾക്കും നിങ്ങളെ ബന്ധപ്പെടാനും കോടതി ഇവ ഉപയോഗിക്കുന്നു.",
      hi: "अदालत इन्हें आपके रिकॉर्ड और आपसे संपर्क के लिए इस्तेमाल करती है।",
      ta: "உங்கள் பதிவுகளுக்கும் உங்களைத் தொடர்புகொள்ளவும் நீதிமன்றம் இவற்றைப் பயன்படுத்துகிறது.",
      bn: "আদালত আপনার রেকর্ড ও আপনার সঙ্গে যোগাযোগের জন্য এগুলো ব্যবহার করে।",
    }),
    name: s("Name", { ml: "പേര്", hi: "नाम", ta: "பெயர்", bn: "নাম" }),
    nameFromRegister: s("From the Bar Council register", { ml: "ബാർ കൗൺസിൽ രജിസ്റ്ററിൽ നിന്ന്", hi: "बार काउंसिल रजिस्टर से", ta: "பார் கவுன்சில் பதிவேட்டிலிருந்து", bn: "বার কাউন্সিলের রেজিস্টার থেকে" }),
    mobile: s("Mobile number", { ml: "മൊബൈൽ നമ്പർ", hi: "मोबाइल नंबर", ta: "கைபேசி எண்", bn: "মোবাইল নম্বর" }),
    mobileNote: s("Also how you sign in", { ml: "സൈൻ ഇൻ ചെയ്യുന്നതും ഇതുപയോഗിച്ച്", hi: "साइन इन भी इसी से", ta: "உள்நுழைவதும் இதன் மூலம்", bn: "সাইন ইনও এটি দিয়ে" }),
    email: s("Email", { ml: "ഇമെയിൽ", hi: "ईमेल", ta: "மின்னஞ்சல்", bn: "ইমেল" }),
    officialId: s("Official ID", { ml: "ഔദ്യോഗിക ID", hi: "आधिकारिक पहचान पत्र", ta: "அதிகாரப்பூர்வ அடையாள அட்டை", bn: "সরকারি পরিচয়পত্র" }),
    address: s("Address", { ml: "വിലാസം", hi: "पता", ta: "முகவரி", bn: "ঠিকানা" }),
  },

  advocate: {
    registrationTitle: s("Bar registration", { ml: "ബാർ രജിസ്ട്രേഷൻ", hi: "बार पंजीकरण", ta: "பார் பதிவு", bn: "বার নিবন্ধন" }),
    registrationBody: s("Checked by the court's scrutiny officer against the Bar Council register.", {
      ml: "കോടതിയിലെ സൂക്ഷ്മപരിശോധനാ ഉദ്യോഗസ്ഥൻ ബാർ കൗൺസിൽ രജിസ്റ്ററുമായി ഒത്തുനോക്കിയത്.",
      hi: "अदालत के जाँच अधिकारी ने बार काउंसिल रजिस्टर से मिलाया।",
      ta: "நீதிமன்றத்தின் ஆய்வு அலுவலர் பார் கவுன்சில் பதிவேட்டுடன் சரிபார்த்தது.",
      bn: "আদালতের যাচাই কর্মকর্তা বার কাউন্সিলের রেজিস্টারের সঙ্গে মিলিয়েছেন।",
    }),
    barNumber: s("Bar registration number", { ml: "ബാർ രജിസ്ട്രേഷൻ നമ്പർ", hi: "बार पंजीकरण संख्या", ta: "பார் பதிவு எண்", bn: "বার নিবন্ধন নম্বর" }),
    barCouncil: s("State Bar Council", { ml: "സംസ്ഥാന ബാർ കൗൺസിൽ", hi: "राज्य बार काउंसिल", ta: "மாநில பார் கவுன்சில்", bn: "রাজ্য বার কাউন্সিল" }),
    barId: s("Bar Council ID card", { ml: "ബാർ കൗൺസിൽ ID കാർഡ്", hi: "बार काउंसिल पहचान पत्र", ta: "பார் கவுன்சில் அடையாள அட்டை", bn: "বার কাউন্সিল পরিচয়পত্র" }),
    status: s("Status", { ml: "നില", hi: "स्थिति", ta: "நிலை", bn: "অবস্থা" }),
    verified: s("Verified", { ml: "പരിശോധിച്ചു", hi: "सत्यापित", ta: "சரிபார்க்கப்பட்டது", bn: "যাচাই করা" }),
    correct: s("Correct", { ml: "തിരുത്തുക", hi: "सुधारें", ta: "திருத்து", bn: "সংশোধন" }),
    correctionPending: s("Correction to {number} is with the scrutiny officer, sent {date}. You keep working on {current} until it is approved.", {
      ml: "{number} എന്ന തിരുത്ത് {date}-ന് സൂക്ഷ്മപരിശോധനാ ഉദ്യോഗസ്ഥന് അയച്ചു. അംഗീകരിക്കുന്നതുവരെ {current} ഉപയോഗിച്ച് തുടരാം.",
      hi: "{number} का सुधार {date} को जाँच अधिकारी को भेजा गया। मंज़ूरी तक आप {current} पर काम करते रहेंगे।",
      ta: "{number} திருத்தம் {date} அன்று ஆய்வு அலுவலருக்கு அனுப்பப்பட்டது. ஒப்புதல் வரை {current} மூலம் தொடர்ந்து பணியாற்றலாம்.",
      bn: "{number} সংশোধন {date} তারিখে যাচাই কর্মকর্তার কাছে পাঠানো হয়েছে। অনুমোদন না হওয়া পর্যন্ত আপনি {current} দিয়েই কাজ করবেন।",
    }),
    chamberTitle: s("Chamber address", { ml: "ചേംബർ വിലാസം", hi: "चैंबर का पता", ta: "அலுவலக முகவரி", bn: "চেম্বারের ঠিকানা" }),
    chamberBody: s("Where papers for your cases can reach you.", {
      ml: "നിങ്ങളുടെ കേസുകളുടെ രേഖകൾ എത്തേണ്ട സ്ഥലം.",
      hi: "जहाँ आपके मामलों के कागज़ आप तक पहुँच सकें।",
      ta: "உங்கள் வழக்குகளின் ஆவணங்கள் உங்களை அடையும் இடம்.",
      bn: "যেখানে আপনার মামলার কাগজ আপনার কাছে পৌঁছাতে পারে।",
    }),
    noProfileTitle: s("No advocate profile on this account", { ml: "ഈ അക്കൗണ്ടിൽ അഭിഭാഷക പ്രൊഫൈൽ ഇല്ല", hi: "इस खाते में अधिवक्ता प्रोफ़ाइल नहीं है", ta: "இந்தக் கணக்கில் வழக்கறிஞர் சுயவிவரம் இல்லை", bn: "এই অ্যাকাউন্টে আইনজীবী প্রোফাইল নেই" }),
    noProfileBody: s("Ask for one from Account type. The court checks your Bar registration first.", {
      ml: "അക്കൗണ്ട് തരത്തിൽ നിന്ന് അപേക്ഷിക്കുക. കോടതി ആദ്യം നിങ്ങളുടെ ബാർ രജിസ്ട്രേഷൻ പരിശോധിക്കും.",
      hi: "खाते का प्रकार से अनुरोध करें। अदालत पहले आपका बार पंजीकरण जाँचेगी।",
      ta: "கணக்கு வகையிலிருந்து கோருங்கள். நீதிமன்றம் முதலில் உங்கள் பார் பதிவைச் சரிபார்க்கும்.",
      bn: "অ্যাকাউন্টের ধরন থেকে অনুরোধ করুন। আদালত আগে আপনার বার নিবন্ধন যাচাই করবে।",
    }),
    goToAccountType: s("Go to Account type", { ml: "അക്കൗണ്ട് തരത്തിലേക്ക്", hi: "खाते का प्रकार पर जाएँ", ta: "கணக்கு வகைக்குச் செல்", bn: "অ্যাকাউন্টের ধরনে যান" }),
  },

  accountType: {
    profilesTitle: s("Your profiles", { ml: "നിങ്ങളുടെ പ്രൊഫൈലുകൾ", hi: "आपकी प्रोफ़ाइलें", ta: "உங்கள் சுயவிவரங்கள்", bn: "আপনার প্রোফাইল" }),
    profilesBody: s("One account can act as a litigant and as an advocate. Switch any time.", {
      ml: "ഒരു അക്കൗണ്ടിന് കക്ഷിയായും അഭിഭാഷകനായും പ്രവർത്തിക്കാം. എപ്പോൾ വേണമെങ്കിലും മാറാം.",
      hi: "एक खाता पक्षकार और अधिवक्ता दोनों के रूप में काम कर सकता है। कभी भी बदलें।",
      ta: "ஒரே கணக்கு வழக்காடியாகவும் வழக்கறிஞராகவும் செயல்படலாம். எப்போது வேண்டுமானாலும் மாறலாம்.",
      bn: "একটি অ্যাকাউন্ট পক্ষ ও আইনজীবী দুই হিসেবেই কাজ করতে পারে। যেকোনো সময় বদলান।",
    }),
    litigant: s("Litigant", { ml: "കക്ഷി", hi: "पक्षकार", ta: "வழக்காடி", bn: "পক্ষ" }),
    litigantBody: s("Your own cases", { ml: "നിങ്ങളുടെ സ്വന്തം കേസുകൾ", hi: "आपके अपने मामले", ta: "உங்கள் சொந்த வழக்குகள்", bn: "আপনার নিজের মামলা" }),
    advocateRole: s("Advocate", { ml: "അഭിഭാഷകൻ", hi: "अधिवक्ता", ta: "வழக்கறிஞர்", bn: "আইনজীবী" }),
    advocateBody: s("Cases you appear in for clients", { ml: "കക്ഷികൾക്കായി നിങ്ങൾ ഹാജരാകുന്ന കേസുകൾ", hi: "मुवक्किलों के लिए आपके मामले", ta: "வாடிக்கையாளர்களுக்காக நீங்கள் ஆஜராகும் வழக்குகள்", bn: "মক্কেলের হয়ে আপনার মামলা" }),
    inUse: s("In use", { ml: "ഉപയോഗത്തിൽ", hi: "उपयोग में", ta: "பயன்பாட்டில்", bn: "ব্যবহৃত হচ্ছে" }),
    active: s("Active", { ml: "സജീവം", hi: "सक्रिय", ta: "செயலில்", bn: "সক্রিয়" }),
    underReview: s("Under review", { ml: "പരിശോധനയിൽ", hi: "जाँच में", ta: "பரிசீலனையில்", bn: "যাচাই চলছে" }),
    notApproved: s("Not approved", { ml: "അംഗീകരിച്ചില്ല", hi: "मंज़ूर नहीं", ta: "ஒப்புதல் இல்லை", bn: "অনুমোদিত নয়" }),
    notRequested: s("Not requested", { ml: "അപേക്ഷിച്ചിട്ടില്ല", hi: "अनुरोध नहीं किया", ta: "கோரப்படவில்லை", bn: "অনুরোধ করা হয়নি" }),
    switchTo: s("Switch to this", { ml: "ഇതിലേക്ക് മാറുക", hi: "इस पर जाएँ", ta: "இதற்கு மாறு", bn: "এটিতে যান" }),
    requestTitle: s("Request an advocate profile", { ml: "അഭിഭാഷക പ്രൊഫൈലിന് അപേക്ഷിക്കുക", hi: "अधिवक्ता प्रोफ़ाइल का अनुरोध करें", ta: "வழக்கறிஞர் சுயவிவரம் கோருங்கள்", bn: "আইনজীবী প্রোফাইলের অনুরোধ করুন" }),
    requestBody: s("Keep your litigant profile and add an advocate one on the same number. The court checks your Bar registration first.", {
      ml: "കക്ഷി പ്രൊഫൈൽ നിലനിർത്തി അതേ നമ്പറിൽ അഭിഭാഷക പ്രൊഫൈൽ ചേർക്കുക. കോടതി ആദ്യം ബാർ രജിസ്ട്രേഷൻ പരിശോധിക്കും.",
      hi: "पक्षकार प्रोफ़ाइल रखें और उसी नंबर पर अधिवक्ता प्रोफ़ाइल जोड़ें। अदालत पहले आपका बार पंजीकरण जाँचेगी।",
      ta: "வழக்காடி சுயவிவரத்தை வைத்துக்கொண்டு அதே எண்ணில் வழக்கறிஞர் சுயவிவரத்தைச் சேர்க்கவும். நீதிமன்றம் முதலில் பார் பதிவைச் சரிபார்க்கும்.",
      bn: "পক্ষের প্রোফাইল রেখে একই নম্বরে আইনজীবী প্রোফাইল যোগ করুন। আদালত আগে বার নিবন্ধন যাচাই করবে।",
    }),
    requestAction: s("Request advocate profile", { ml: "അഭിഭാഷക പ്രൊഫൈലിന് അപേക്ഷിക്കുക", hi: "अधिवक्ता प्रोफ़ाइल माँगें", ta: "வழக்கறிஞர் சுயவிவரம் கோரு", bn: "আইনজীবী প্রোফাইল চান" }),
    pendingNote: s("Your request is with the court's scrutiny officer. Your litigant profile stays active meanwhile.", {
      ml: "നിങ്ങളുടെ അപേക്ഷ കോടതിയിലെ സൂക്ഷ്മപരിശോധനാ ഉദ്യോഗസ്ഥന്റെ പക്കലാണ്. അതുവരെ കക്ഷി പ്രൊഫൈൽ സജീവമായിരിക്കും.",
      hi: "आपका अनुरोध अदालत के जाँच अधिकारी के पास है। तब तक आपकी पक्षकार प्रोफ़ाइल सक्रिय रहेगी।",
      ta: "உங்கள் கோரிக்கை நீதிமன்றத்தின் ஆய்வு அலுவலரிடம் உள்ளது. அதுவரை உங்கள் வழக்காடி சுயவிவரம் செயலில் இருக்கும்.",
      bn: "আপনার অনুরোধ আদালতের যাচাই কর্মকর্তার কাছে আছে। ততদিন আপনার পক্ষের প্রোফাইল সক্রিয় থাকবে।",
    }),
    notApprovedTitle: s("Your request was not approved", { ml: "നിങ്ങളുടെ അപേക്ഷ അംഗീകരിച്ചില്ല", hi: "आपका अनुरोध मंज़ूर नहीं हुआ", ta: "உங்கள் கோரிக்கைக்கு ஒப்புதல் கிடைக்கவில்லை", bn: "আপনার অনুরোধ অনুমোদিত হয়নি" }),
    officerSaid: s("The scrutiny officer's message", { ml: "സൂക്ഷ്മപരിശോധനാ ഉദ്യോഗസ്ഥന്റെ സന്ദേശം", hi: "जाँच अधिकारी का संदेश", ta: "ஆய்வு அலுவலரின் செய்தி", bn: "যাচাই কর্মকর্তার বার্তা" }),
    resubmit: s("Resubmit request", { ml: "അപേക്ഷ വീണ്ടും സമർപ്പിക്കുക", hi: "अनुरोध फिर से भेजें", ta: "கோரிக்கையை மீண்டும் சமர்ப்பி", bn: "অনুরোধ আবার পাঠান" }),
    submittedTitle: s("What you sent", { ml: "നിങ്ങൾ അയച്ചത്", hi: "आपने क्या भेजा", ta: "நீங்கள் அனுப்பியது", bn: "আপনি যা পাঠিয়েছেন" }),
    submittedOn: s("Sent on", { ml: "അയച്ച തീയതി", hi: "भेजने की तारीख", ta: "அனுப்பிய தேதி", bn: "পাঠানোর তারিখ" }),
  },

  security: {
    signInTitle: s("How you sign in", { ml: "നിങ്ങൾ സൈൻ ഇൻ ചെയ്യുന്ന വിധം", hi: "आप कैसे साइन इन करते हैं", ta: "நீங்கள் உள்நுழையும் விதம்", bn: "আপনি কীভাবে সাইন ইন করেন" }),
    signInBody: s("Your mobile number with a one-time code, or with your password.", {
      ml: "ഒറ്റത്തവണ കോഡോ പാസ്‌വേഡോ ഉപയോഗിച്ച് നിങ്ങളുടെ മൊബൈൽ നമ്പർ.",
      hi: "आपका मोबाइल नंबर, एक बार के कोड या पासवर्ड के साथ।",
      ta: "உங்கள் கைபேசி எண், ஒருமுறை குறியீடு அல்லது கடவுச்சொல்லுடன்.",
      bn: "আপনার মোবাইল নম্বর, একবারের কোড বা পাসওয়ার্ডের সঙ্গে।",
    }),
    password: s("Password", { ml: "പാസ്‌വേഡ്", hi: "पासवर्ड", ta: "கடவுச்சொல்", bn: "পাসওয়ার্ড" }),
    passwordNotSet: s("Not set. You sign in with a one-time code.", {
      ml: "സജ്ജമാക്കിയിട്ടില്ല. ഒറ്റത്തവണ കോഡ് ഉപയോഗിച്ചാണ് സൈൻ ഇൻ.",
      hi: "सेट नहीं है। आप एक बार के कोड से साइन इन करते हैं।",
      ta: "அமைக்கப்படவில்லை. நீங்கள் ஒருமுறை குறியீட்டுடன் உள்நுழைகிறீர்கள்.",
      bn: "সেট করা নেই। আপনি একবারের কোড দিয়ে সাইন ইন করেন।",
    }),
    passwordSetOn: s("Last changed {date}", { ml: "അവസാനം മാറ്റിയത് {date}", hi: "पिछली बार {date} को बदला", ta: "கடைசியாக {date} அன்று மாற்றப்பட்டது", bn: "শেষ বদল {date}" }),
    setPassword: s("Set password", { ml: "പാസ്‌വേഡ് സജ്ജമാക്കുക", hi: "पासवर्ड सेट करें", ta: "கடவுச்சொல் அமை", bn: "পাসওয়ার্ড সেট করুন" }),
    changePassword: s("Change password", { ml: "പാസ്‌വേഡ് മാറ്റുക", hi: "पासवर्ड बदलें", ta: "கடவுச்சொல்லை மாற்று", bn: "পাসওয়ার্ড বদলান" }),
    devicesTitle: s("Signed-in devices", { ml: "സൈൻ ഇൻ ചെയ്ത ഉപകരണങ്ങൾ", hi: "साइन इन किए गए डिवाइस", ta: "உள்நுழைந்த சாதனங்கள்", bn: "সাইন ইন করা ডিভাইস" }),
    devicesBody: s("Where your account is open now. Sign out of any you do not recognise.", {
      ml: "നിങ്ങളുടെ അക്കൗണ്ട് ഇപ്പോൾ തുറന്നിരിക്കുന്നിടം. തിരിച്ചറിയാത്തവയിൽ നിന്ന് സൈൻ ഔട്ട് ചെയ്യുക.",
      hi: "जहाँ आपका खाता अभी खुला है। जिसे न पहचानें, उससे साइन आउट करें।",
      ta: "உங்கள் கணக்கு இப்போது திறந்திருக்கும் இடங்கள். அடையாளம் தெரியாதவற்றிலிருந்து வெளியேறுங்கள்.",
      bn: "যেখানে আপনার অ্যাকাউন্ট এখন খোলা। যেটি চেনেন না, সেখান থেকে সাইন আউট করুন।",
    }),
    thisDevice: s("This device", { ml: "ഈ ഉപകരണം", hi: "यह डिवाइस", ta: "இந்தச் சாதனம்", bn: "এই ডিভাইস" }),
    signOut: s("Sign out", { ml: "സൈൻ ഔട്ട്", hi: "साइन आउट", ta: "வெளியேறு", bn: "সাইন আউট" }),
    signOutOthers: s("Sign out of all other devices", { ml: "മറ്റെല്ലാ ഉപകരണങ്ങളിൽ നിന്നും സൈൻ ഔട്ട്", hi: "बाकी सभी डिवाइस से साइन आउट", ta: "மற்ற எல்லாச் சாதனங்களிலிருந்தும் வெளியேறு", bn: "অন্য সব ডিভাইস থেকে সাইন আউট" }),
    onlyThisDevice: s("You are signed in on this device only.", {
      ml: "ഈ ഉപകരണത്തിൽ മാത്രമാണ് സൈൻ ഇൻ ചെയ്തിരിക്കുന്നത്.",
      hi: "आप केवल इसी डिवाइस पर साइन इन हैं।",
      ta: "இந்தச் சாதனத்தில் மட்டுமே உள்நுழைந்துள்ளீர்கள்.",
      bn: "আপনি শুধু এই ডিভাইসে সাইন ইন আছেন।",
    }),
    signOutOthersTitle: s("Sign out of other devices?", { ml: "മറ്റ് ഉപകരണങ്ങളിൽ നിന്ന് സൈൻ ഔട്ട് ചെയ്യണോ?" }),
    signOutOthersBody: s("They will need a code or password to sign in again.", {
      ml: "വീണ്ടും സൈൻ ഇൻ ചെയ്യാൻ കോഡോ പാസ്‌വേഡോ വേണം.",
    }),
    signedOutOne: s("Signed out of {device}", { ml: "{device}-ൽ നിന്ന് സൈൻ ഔട്ട് ചെയ്തു" }),
    signedOutOthers: s("Signed out of all other devices", { ml: "മറ്റെല്ലാ ഉപകരണങ്ങളിൽ നിന്നും സൈൻ ഔട്ട് ചെയ്തു" }),
  },

  display: {
    themeTitle: s("Theme", { ml: "തീം", hi: "थीम", ta: "தீம்", bn: "থিম" }),
    themeBody: s("Dark can be easier on the eyes at night.", {
      ml: "രാത്രിയിൽ ഡാർക്ക് കണ്ണുകൾക്ക് ആശ്വാസമാകാം.",
      hi: "रात में डार्क आँखों के लिए आरामदायक हो सकता है।",
      ta: "இரவில் டார்க் கண்களுக்கு இதமாக இருக்கலாம்.",
      bn: "রাতে ডার্ক চোখের জন্য আরামদায়ক হতে পারে।",
    }),
    light: s("Light", { ml: "ലൈറ്റ്", hi: "लाइट", ta: "லைட்", bn: "লাইট" }),
    dark: s("Dark", { ml: "ഡാർക്ക്", hi: "डार्क", ta: "டார்க்", bn: "ডার্ক" }),
    system: s("Match my device", { ml: "ഉപകരണത്തിന് അനുസരിച്ച്", hi: "डिवाइस के अनुसार", ta: "சாதனத்தைப் பொறுத்து", bn: "ডিভাইস অনুযায়ী" }),
    textTitle: s("Text size", { ml: "അക്ഷര വലുപ്പം", hi: "अक्षरों का आकार", ta: "எழுத்து அளவு", bn: "লেখার আকার" }),
    textBody: s("Makes everything on the page larger, not just the words.", {
      ml: "വാക്കുകൾ മാത്രമല്ല, പേജിലെ എല്ലാം വലുതാക്കുന്നു.",
      hi: "सिर्फ़ शब्द नहीं, पेज पर सब कुछ बड़ा करता है।",
      ta: "சொற்கள் மட்டுமல்ல, பக்கத்தில் உள்ள அனைத்தையும் பெரிதாக்கும்.",
      bn: "শুধু লেখা নয়, পাতার সবকিছু বড় করে।",
    }),
    textDefault: s("Default", { ml: "സാധാരണ", hi: "सामान्य", ta: "இயல்பு", bn: "সাধারণ" }),
    textLarge: s("Large", { ml: "വലുത്", hi: "बड़ा", ta: "பெரியது", bn: "বড়" }),
    textLarger: s("Larger", { ml: "കൂടുതൽ വലുത്", hi: "और बड़ा", ta: "மேலும் பெரியது", bn: "আরও বড়" }),
    textPreview: s("Next hearing on 14 October 2026 at 11:00 am, Judicial First Class Magistrate Court, Kollam.", {
      ml: "അടുത്ത വാദം 2026 ഒക്ടോബർ 14, രാവിലെ 11:00, ജുഡീഷ്യൽ ഫസ്റ്റ് ക്ലാസ് മജിസ്ട്രേറ്റ് കോടതി, കൊല്ലം.",
      hi: "अगली सुनवाई 14 अक्टूबर 2026, सुबह 11:00 बजे, न्यायिक प्रथम श्रेणी मजिस्ट्रेट न्यायालय, कोल्लम।",
      ta: "அடுத்த விசாரணை 14 அக்டோபர் 2026, காலை 11:00, நீதித்துறை முதல் வகுப்பு நடுவர் நீதிமன்றம், கொல்லம்.",
      bn: "পরবর্তী শুনানি ১৪ অক্টোবর ২০২৬, সকাল ১১:০০, বিচারিক প্রথম শ্রেণির ম্যাজিস্ট্রেট আদালত, কোল্লাম।",
    }),
    previewLabel: s("Preview", { ml: "പ്രിവ്യൂ", hi: "पूर्वावलोकन", ta: "முன்னோட்டம்", bn: "প্রিভিউ" }),
    signOutTitle: s("Time before sign-out", { ml: "സൈൻ ഔട്ടിന് മുമ്പുള്ള സമയം", hi: "साइन आउट से पहले का समय", ta: "வெளியேறும் முன் நேரம்", bn: "সাইন আউটের আগের সময়" }),
    signOutBody: s("How long you can be away before DRISTI signs you out. You are warned first, so you can stay.", {
      ml: "DRISTI സൈൻ ഔട്ട് ചെയ്യുന്നതിനുമുമ്പ് നിങ്ങൾക്ക് മാറിനിൽക്കാവുന്ന സമയം. ആദ്യം മുന്നറിയിപ്പ് ലഭിക്കും.",
      hi: "DRISTI साइन आउट करने से पहले आप कितनी देर दूर रह सकते हैं। पहले चेतावनी मिलेगी, ताकि आप रुक सकें।",
      ta: "DRISTI உங்களை வெளியேற்றும் முன் எவ்வளவு நேரம் விலகியிருக்கலாம். முதலில் எச்சரிக்கை வரும்.",
      bn: "DRISTI সাইন আউট করার আগে আপনি কতক্ষণ দূরে থাকতে পারেন। আগে সতর্ক করা হবে, যাতে থাকতে পারেন।",
    }),
    minutes: s("{n} minutes", { ml: "{n} മിനിറ്റ്", hi: "{n} मिनट", ta: "{n} நிமிடங்கள்", bn: "{n} মিনিট" }),
    oneHour: s("1 hour", { ml: "1 മണിക്കൂർ", hi: "1 घंटा", ta: "1 மணி நேரம்", bn: "১ ঘণ্টা" }),
    recommended: s("Recommended", { ml: "ശുപാർശ ചെയ്യുന്നത്", hi: "सुझाया गया", ta: "பரிந்துரைக்கப்பட்டது", bn: "প্রস্তাবিত" }),
  },

  language: {
    onScreenTitle: s("Language on screen", { ml: "സ്ക്രീനിലെ ഭാഷ", hi: "स्क्रीन की भाषा", ta: "திரையில் உள்ள மொழி", bn: "পর্দার ভাষা" }),
    onScreenBody: s("The same switch as the one in the top bar.", {
      ml: "മുകളിലെ ബാറിലുള്ള അതേ സ്വിച്ച്.",
      hi: "वही स्विच जो ऊपर की पट्टी में है।",
      ta: "மேல் பட்டியில் உள்ள அதே மாற்றி.",
      bn: "ওপরের বারে থাকা একই সুইচ।",
    }),
    secondTitle: s("Language beside English", { ml: "ഇംഗ്ലീഷിനൊപ്പമുള്ള ഭാഷ", hi: "अंग्रेज़ी के साथ वाली भाषा", ta: "ஆங்கிலத்துடன் உள்ள மொழி", bn: "ইংরেজির পাশের ভাষা" }),
    secondBody: s("The top bar always offers English and the language you choose here.", {
      ml: "മുകളിലെ ബാറിൽ എപ്പോഴും ഇംഗ്ലീഷും ഇവിടെ തിരഞ്ഞെടുക്കുന്ന ഭാഷയും ഉണ്ടാകും.",
      hi: "ऊपर की पट्टी में हमेशा अंग्रेज़ी और यहाँ चुनी गई भाषा रहती है।",
      ta: "மேல் பட்டியில் எப்போதும் ஆங்கிலமும் இங்கே நீங்கள் தேர்வுசெய்யும் மொழியும் இருக்கும்.",
      bn: "ওপরের বারে সবসময় ইংরেজি আর এখানে বেছে নেওয়া ভাষা থাকে।",
    }),
    stateDefault: s("Kerala's language", { ml: "കേരളത്തിന്റെ ഭാഷ", hi: "केरल की भाषा", ta: "கேரளத்தின் மொழி", bn: "কেরালার ভাষা" }),
    partial: s("Some pages are in English until they are translated. Translated in this demo: Settings and Home in Malayalam, Hindi, Tamil and Bengali.", {
      ml: "വിവർത്തനം ചെയ്യുന്നതുവരെ ചില പേജുകൾ ഇംഗ്ലീഷിലായിരിക്കും. ഈ ഡെമോയിൽ വിവർത്തനം ചെയ്തത്: ക്രമീകരണങ്ങളും ഹോമും, മലയാളം, ഹിന്ദി, തമിഴ്, ബംഗാളി ഭാഷകളിൽ.",
      hi: "अनुवाद होने तक कुछ पेज अंग्रेज़ी में रहेंगे। इस डेमो में अनुवादित: सेटिंग्स और होम, मलयालम, हिन्दी, तमिल और बांग्ला में।",
      ta: "மொழிபெயர்க்கப்படும் வரை சில பக்கங்கள் ஆங்கிலத்தில் இருக்கும். இந்த டெமோவில் மொழிபெயர்க்கப்பட்டவை: அமைப்புகள் மற்றும் முகப்பு, மலையாளம், இந்தி, தமிழ், வங்காளம்.",
      bn: "অনুবাদ না হওয়া পর্যন্ত কিছু পাতা ইংরেজিতে থাকবে। এই ডেমোতে অনূদিত: সেটিংস ও হোম, মালয়ালম, হিন্দি, তামিল ও বাংলায়।",
    }),
  },

  help: {
    faqTitle: s("Common questions", { ml: "പതിവ് ചോദ്യങ്ങൾ", hi: "आम सवाल", ta: "பொதுவான கேள்விகள்", bn: "সাধারণ প্রশ্ন" }),
    contactTitle: s("Talk to someone", { ml: "ആരോടെങ്കിലും സംസാരിക്കുക", hi: "किसी से बात करें", ta: "யாரிடமாவது பேசுங்கள்", bn: "কারও সঙ্গে কথা বলুন" }),
    contactBody: s("For help using DRISTI or with your case papers.", {
      ml: "DRISTI ഉപയോഗിക്കാനോ കേസ് രേഖകളിലോ സഹായത്തിന്.",
      hi: "DRISTI के इस्तेमाल या मामले के कागज़ों में मदद के लिए।",
      ta: "DRISTI பயன்படுத்த அல்லது வழக்கு ஆவணங்களில் உதவிக்கு.",
      bn: "DRISTI ব্যবহারে বা মামলার কাগজে সাহায্যের জন্য।",
    }),
    helpDesk: s("Court help desk", { ml: "കോടതി ഹെൽപ് ഡെസ്ക്", hi: "अदालत सहायता डेस्क", ta: "நீதிமன்ற உதவி மையம்", bn: "আদালতের সহায়তা ডেস্ক" }),
    helpDeskNote: s("District Court, Kollam", { ml: "ജില്ലാ കോടതി, കൊല്ലം", hi: "ज़िला न्यायालय, कोल्लम", ta: "மாவட்ட நீதிமன்றம், கொல்லம்", bn: "জেলা আদালত, কোল্লাম" }),
    sewa: s("e-Sewa Kendra", { ml: "ഇ-സേവാ കേന്ദ്രം", hi: "ई-सेवा केंद्र", ta: "இ-சேவை மையம்", bn: "ই-সেবা কেন্দ্র" }),
    sewaNote: s("Walk in at the District Court complex, Kollam", { ml: "കൊല്ലം ജില്ലാ കോടതി വളപ്പിൽ നേരിട്ട് എത്തുക", hi: "कोल्लम ज़िला न्यायालय परिसर में आएँ", ta: "கொல்லம் மாவட்ட நீதிமன்ற வளாகத்தில் நேரில் வாருங்கள்", bn: "কোল্লাম জেলা আদালত চত্বরে সরাসরি আসুন" }),
    sewaAction: s("Get directions", { ml: "വഴി കാണുക", hi: "रास्ता देखें", ta: "வழி காண்க", bn: "পথ দেখুন" }),
    legalAid: s("Legal aid helpline", { ml: "നിയമസഹായ ഹെൽപ്‌ലൈൻ", hi: "कानूनी सहायता हेल्पलाइन", ta: "சட்ட உதவி உதவி எண்", bn: "আইনি সহায়তা হেল্পলাইন" }),
    legalAidNote: s("Toll free, in 10 languages", { ml: "ടോൾ ഫ്രീ, 10 ഭാഷകളിൽ", hi: "टोल फ़्री, 10 भाषाओं में", ta: "கட்டணமில்லா, 10 மொழிகளில்", bn: "টোল ফ্রি, ১০টি ভাষায়" }),
    call: s("Call {number}", { ml: "{number} വിളിക്കുക", hi: "{number} पर फ़ोन करें", ta: "{number} அழைக்கவும்", bn: "{number} নম্বরে ফোন করুন" }),
    reportTitle: s("Report a problem", { ml: "ഒരു പ്രശ്നം അറിയിക്കുക", hi: "समस्या बताएँ", ta: "சிக்கலைத் தெரிவி", bn: "সমস্যা জানান" }),
    reportBody: s("Something not working, or a detail that looks wrong? Tell the DRISTI team.", {
      ml: "എന്തെങ്കിലും പ്രവർത്തിക്കുന്നില്ലേ, അല്ലെങ്കിൽ ഒരു വിവരം തെറ്റാണെന്ന് തോന്നുന്നുണ്ടോ? DRISTI ടീമിനെ അറിയിക്കുക.",
      hi: "कुछ काम नहीं कर रहा, या कोई जानकारी गलत लग रही है? DRISTI टीम को बताएँ।",
      ta: "ஏதாவது வேலை செய்யவில்லையா, அல்லது ஒரு விவரம் தவறாகத் தெரிகிறதா? DRISTI குழுவிடம் சொல்லுங்கள்.",
      bn: "কিছু কাজ করছে না, বা কোনো তথ্য ভুল মনে হচ্ছে? DRISTI টিমকে জানান।",
    }),
    reportsSent: s("Reports you sent", { ml: "നിങ്ങൾ അയച്ച റിപ്പോർട്ടുകൾ", hi: "आपकी भेजी रिपोर्ट", ta: "நீங்கள் அனுப்பிய புகார்கள்", bn: "আপনার পাঠানো রিপোর্ট" }),
    received: s("Received", { ml: "ലഭിച്ചു", hi: "मिल गई", ta: "பெறப்பட்டது", bn: "পাওয়া গেছে" }),
  },

  /* Dialogs: English and Malayalam, English fallback elsewhere. */
  dialogs: {
    discardTitle: s("Discard your changes?", { ml: "മാറ്റങ്ങൾ ഉപേക്ഷിക്കണോ?" }),
    discardBody: s("Anything you entered will be lost.", { ml: "നിങ്ങൾ നൽകിയതെല്ലാം നഷ്ടമാകും." }),
    discardKeep: s("Keep editing", { ml: "തിരുത്തൽ തുടരുക" }),
    discardConfirm: s("Discard", { ml: "ഉപേക്ഷിക്കുക" }),

    nameTitle: s("Change your name", { ml: "നിങ്ങളുടെ പേര് മാറ്റുക" }),
    nameBody: s("Use the name on your official ID. Cases already filed keep the name they were filed with.", {
      ml: "ഔദ്യോഗിക ID-യിലെ പേര് ഉപയോഗിക്കുക. ഇതിനകം ഫയൽ ചെയ്ത കേസുകളിൽ അന്നത്തെ പേര് തുടരും.",
    }),
    nameLabel: s("Full name", { ml: "മുഴുവൻ പേര്" }),
    nameError: s("Enter your name.", { ml: "നിങ്ങളുടെ പേര് നൽകുക." }),
    nameSaved: s("Name updated", { ml: "പേര് പുതുക്കി" }),

    emailTitle: s("Email", { ml: "ഇമെയിൽ" }),
    emailBody: s("Optional. Used for copies of orders and notices.", {
      ml: "നിർബന്ധമല്ല. ഉത്തരവുകളുടെയും നോട്ടീസുകളുടെയും പകർപ്പുകൾക്ക്.",
    }),
    emailSaved: s("Email updated", { ml: "ഇമെയിൽ പുതുക്കി" }),
    emailRemove: s("Remove email", { ml: "ഇമെയിൽ നീക്കുക" }),

    addressTitle: s("Address", { ml: "വിലാസം" }),
    addressBody: s("Where the court can send papers for your cases.", {
      ml: "നിങ്ങളുടെ കേസുകളുടെ രേഖകൾ കോടതിക്ക് അയയ്ക്കാവുന്ന സ്ഥലം.",
    }),
    chamberBody: s("Your chamber or office. Papers for your cases can be sent here.", {
      ml: "നിങ്ങളുടെ ചേംബറോ ഓഫീസോ. കേസ് രേഖകൾ ഇവിടേക്ക് അയയ്ക്കാം.",
    }),
    addressError: s("Fill in every field marked with a star.", { ml: "നക്ഷത്രചിഹ്നമുള്ള എല്ലാ കള്ളികളും പൂരിപ്പിക്കുക." }),
    addressSaved: s("Address saved", { ml: "വിലാസം സംരക്ഷിച്ചു" }),

    idTitle: s("Official ID", { ml: "ഔദ്യോഗിക ID" }),
    idBody: s("One government ID with your name and photo. Uploading a new one replaces the one on file.", {
      ml: "പേരും ഫോട്ടോയുമുള്ള ഒരു സർക്കാർ ID. പുതിയത് അപ്‌ലോഡ് ചെയ്താൽ പഴയത് മാറും.",
    }),
    idSaved: s("ID saved", { ml: "ID സംരക്ഷിച്ചു" }),
    idSubmit: s("Save ID", { ml: "ID സംരക്ഷിക്കുക" }),

    mobileTitle: s("Change mobile number", { ml: "മൊബൈൽ നമ്പർ മാറ്റുക" }),
    mobileBody: s("We send a code to the new number to check it is yours. After that you sign in with the new number.", {
      ml: "പുതിയ നമ്പർ നിങ്ങളുടേതാണെന്ന് ഉറപ്പാക്കാൻ അതിലേക്ക് ഒരു കോഡ് അയയ്ക്കും. തുടർന്ന് പുതിയ നമ്പർ ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യാം.",
    }),
    currentNumber: s("Current number", { ml: "ഇപ്പോഴത്തെ നമ്പർ" }),
    newNumber: s("New mobile number", { ml: "പുതിയ മൊബൈൽ നമ്പർ" }),
    sameNumber: s("That is already your number.", { ml: "ഇത് ഇപ്പോൾ തന്നെ നിങ്ങളുടെ നമ്പറാണ്." }),
    mobileSaved: s("Mobile number changed", { ml: "മൊബൈൽ നമ്പർ മാറ്റി" }),
    saveNumber: s("Save new number", { ml: "പുതിയ നമ്പർ സംരക്ഷിക്കുക" }),

    passwordSetTitle: s("Set a password", { ml: "ഒരു പാസ്‌വേഡ് സജ്ജമാക്കുക" }),
    passwordChangeTitle: s("Change your password", { ml: "പാസ്‌വേഡ് മാറ്റുക" }),
    passwordBody: s("You can then sign in with your mobile number and this password, or with a code as before.", {
      ml: "തുടർന്ന് മൊബൈൽ നമ്പറും ഈ പാസ്‌വേഡും, അല്ലെങ്കിൽ മുമ്പത്തെപ്പോലെ കോഡും ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യാം.",
    }),
    currentPassword: s("Current password", { ml: "ഇപ്പോഴത്തെ പാസ്‌വേഡ്" }),
    currentPasswordError: s("Enter your current password.", { ml: "ഇപ്പോഴത്തെ പാസ്‌വേഡ് നൽകുക." }),
    forgotPassword: s("Forgot it? Use a code instead", { ml: "മറന്നോ? പകരം കോഡ് ഉപയോഗിക്കുക" }),
    usePassword: s("Use my current password", { ml: "ഇപ്പോഴത്തെ പാസ്‌വേഡ് ഉപയോഗിക്കുക" }),
    codeFirst: s("Verify the code first.", { ml: "ആദ്യം കോഡ് പരിശോധിക്കുക." }),
    newPassword: s("New password", { ml: "പുതിയ പാസ്‌വേഡ്" }),
    passwordSaved: s("Password saved", { ml: "പാസ്‌വേഡ് സംരക്ഷിച്ചു" }),

    barTitle: s("Correct your Bar registration", { ml: "ബാർ രജിസ്ട്രേഷൻ തിരുത്തുക" }),
    barBody: s("The scrutiny officer checks the corrected number against the Bar Council register. You keep working on {current} until it is approved.", {
      ml: "തിരുത്തിയ നമ്പർ സൂക്ഷ്മപരിശോധനാ ഉദ്യോഗസ്ഥൻ ബാർ കൗൺസിൽ രജിസ്റ്ററുമായി ഒത്തുനോക്കും. അംഗീകരിക്കുന്നതുവരെ {current} ഉപയോഗിച്ച് തുടരാം.",
    }),
    barCorrected: s("Corrected Bar registration number", { ml: "തിരുത്തിയ ബാർ രജിസ്ട്രേഷൻ നമ്പർ" }),
    barSame: s("That is the number already on file.", { ml: "ഇത് ഇപ്പോൾ രേഖയിലുള്ള നമ്പറാണ്." }),
    barIdHint: s("A clear scan with the registration number visible. JPG, JPEG, PNG or PDF, up to 10 MB.", {
      ml: "രജിസ്ട്രേഷൻ നമ്പർ വ്യക്തമായി കാണുന്ന സ്കാൻ. JPG, JPEG, PNG അല്ലെങ്കിൽ PDF, 10 MB വരെ.",
    }),
    barIdError: s("Upload your Bar Council ID card.", { ml: "ബാർ കൗൺസിൽ ID കാർഡ് അപ്‌ലോഡ് ചെയ്യുക." }),
    barNumberError: s("Enter your Bar registration number.", { ml: "ബാർ രജിസ്ട്രേഷൻ നമ്പർ നൽകുക." }),
    barPlaceholder: s("For example K/1234/2020", { ml: "ഉദാഹരണം K/1234/2020" }),
    sendForReview: s("Send for review", { ml: "പരിശോധനയ്ക്ക് അയയ്ക്കുക" }),
    correctionSent: s("Correction sent for review", { ml: "തിരുത്ത് പരിശോധനയ്ക്ക് അയച്ചു" }),
    noFile: s("No file chosen yet", { ml: "ഫയൽ തിരഞ്ഞെടുത്തിട്ടില്ല" }),
    chooseFile: s("Choose file", { ml: "ഫയൽ തിരഞ്ഞെടുക്കുക" }),
    changeFile: s("Change file", { ml: "ഫയൽ മാറ്റുക" }),

    requestTitle: s("Request an advocate profile", { ml: "അഭിഭാഷക പ്രൊഫൈലിന് അപേക്ഷിക്കുക" }),
    resubmitTitle: s("Resubmit your request", { ml: "അപേക്ഷ വീണ്ടും സമർപ്പിക്കുക" }),
    requestBody: s("These let the court check your enrolment. Your litigant profile stays as it is.", {
      ml: "നിങ്ങളുടെ എൻറോൾമെന്റ് പരിശോധിക്കാൻ കോടതിക്ക് ഇവ വേണം. കക്ഷി പ്രൊഫൈൽ അതേപടി തുടരും.",
    }),
    sendRequest: s("Send request", { ml: "അപേക്ഷ അയയ്ക്കുക" }),
    requestSent: s("Request sent to the scrutiny officer", { ml: "അപേക്ഷ സൂക്ഷ്മപരിശോധനാ ഉദ്യോഗസ്ഥന് അയച്ചു" }),
    approved: s("Advocate profile approved. Switch to it from Account type.", {
      ml: "അഭിഭാഷക പ്രൊഫൈൽ അംഗീകരിച്ചു. അക്കൗണ്ട് തരത്തിൽ നിന്ന് മാറാം.",
    }),

    reportTitle: s("Report a problem", { ml: "ഒരു പ്രശ്നം അറിയിക്കുക" }),
    reportBody: s("The DRISTI team reads every report. For anything urgent about a hearing, call the court help desk.", {
      ml: "DRISTI ടീം എല്ലാ റിപ്പോർട്ടുകളും വായിക്കും. വാദവുമായി ബന്ധപ്പെട്ട അടിയന്തര കാര്യങ്ങൾക്ക് കോടതി ഹെൽപ് ഡെസ്കിൽ വിളിക്കുക.",
    }),
    topic: s("What is it about?", { ml: "എന്തിനെക്കുറിച്ചാണ്?" }),
    topicPlaceholder: s("Choose one", { ml: "ഒന്ന് തിരഞ്ഞെടുക്കുക" }),
    topicError: s("Choose what it is about.", { ml: "എന്തിനെക്കുറിച്ചാണെന്ന് തിരഞ്ഞെടുക്കുക." }),
    topics: {
      signIn: s("Signing in", { ml: "സൈൻ ഇൻ" }),
      filing: s("Filing a case or application", { ml: "കേസോ അപേക്ഷയോ ഫയൽ ചെയ്യൽ" }),
      payment: s("Payments", { ml: "പണമടയ്ക്കൽ" }),
      hearing: s("Hearings", { ml: "വാദങ്ങൾ" }),
      documents: s("Documents and orders", { ml: "രേഖകളും ഉത്തരവുകളും" }),
      details: s("A detail that looks wrong", { ml: "തെറ്റാണെന്ന് തോന്നുന്ന വിവരം" }),
      other: s("Something else", { ml: "മറ്റെന്തെങ്കിലും" }),
    },
    caseNumber: s("Case number", { ml: "കേസ് നമ്പർ" }),
    caseHint: s("If it is about one case.", { ml: "ഒരു കേസിനെക്കുറിച്ചാണെങ്കിൽ." }),
    details: s("What happened?", { ml: "എന്താണ് സംഭവിച്ചത്?" }),
    detailsHint: s("What you were doing, and what you expected to see.", {
      ml: "നിങ്ങൾ എന്താണ് ചെയ്തിരുന്നത്, എന്താണ് പ്രതീക്ഷിച്ചത്.",
    }),
    detailsError: s("Tell us what happened.", { ml: "എന്താണ് സംഭവിച്ചതെന്ന് പറയുക." }),
    screenshot: s("Screenshot", { ml: "സ്ക്രീൻഷോട്ട്" }),
    sendReport: s("Send report", { ml: "റിപ്പോർട്ട് അയയ്ക്കുക" }),
    reportSentTitle: s("Report sent", { ml: "റിപ്പോർട്ട് അയച്ചു" }),
    reportSentBody: s("Your reference is {reference}. Quote it if you call the help desk. This demo does not send anything.", {
      ml: "നിങ്ങളുടെ റഫറൻസ് {reference}. ഹെൽപ് ഡെസ്കിൽ വിളിക്കുമ്പോൾ ഇത് പറയുക. ഈ ഡെമോ ഒന്നും അയയ്ക്കുന്നില്ല.",
    }),
  },
};

/** The FAQ on Help and support, from what the product actually does today. */
export const settingsFaq: { q: Copy; a: Copy }[] = [
  {
    q: s("I forgot my password. How do I sign in?", { ml: "പാസ്‌വേഡ് മറന്നു. എങ്ങനെ സൈൻ ഇൻ ചെയ്യും?" }),
    a: s("Choose one-time code on the sign-in screen. We send a code to your mobile number. You can set a new password afterwards in Sign-in and security.", {
      ml: "സൈൻ ഇൻ സ്ക്രീനിൽ ഒറ്റത്തവണ കോഡ് തിരഞ്ഞെടുക്കുക. നിങ്ങളുടെ മൊബൈലിലേക്ക് കോഡ് അയയ്ക്കും. പിന്നീട് സൈൻ ഇൻ, സുരക്ഷ എന്നതിൽ പുതിയ പാസ്‌വേഡ് സജ്ജമാക്കാം.",
    }),
  },
  {
    q: s("I have a new mobile number. What happens to my cases?", { ml: "എനിക്ക് പുതിയ മൊബൈൽ നമ്പറുണ്ട്. എന്റെ കേസുകൾക്ക് എന്ത് സംഭവിക്കും?" }),
    a: s("Nothing changes in your cases. Change the number in Sign-in and security. We check the new number with a code, and court updates go to it from then on.", {
      ml: "കേസുകളിൽ ഒന്നും മാറില്ല. സൈൻ ഇൻ, സുരക്ഷ എന്നതിൽ നമ്പർ മാറ്റുക. പുതിയ നമ്പർ കോഡ് വഴി പരിശോധിക്കും, തുടർന്ന് കോടതി അറിയിപ്പുകൾ അതിലേക്ക് വരും.",
    }),
  },
  {
    q: s("How long does advocate approval take?", { ml: "അഭിഭാഷക അംഗീകാരത്തിന് എത്ര സമയമെടുക്കും?" }),
    a: s("The court's scrutiny officer checks your Bar registration against the Bar Council register. You get an SMS when it is done. If it is not approved, the officer says why and you can resubmit.", {
      ml: "കോടതിയിലെ സൂക്ഷ്മപരിശോധനാ ഉദ്യോഗസ്ഥൻ നിങ്ങളുടെ ബാർ രജിസ്ട്രേഷൻ ബാർ കൗൺസിൽ രജിസ്റ്ററുമായി ഒത്തുനോക്കും. പൂർത്തിയാകുമ്പോൾ SMS ലഭിക്കും. അംഗീകരിച്ചില്ലെങ്കിൽ കാരണം പറയും, വീണ്ടും സമർപ്പിക്കാം.",
    }),
  },
  {
    q: s("Can I be a litigant and an advocate on one account?", { ml: "ഒരു അക്കൗണ്ടിൽ കക്ഷിയും അഭിഭാഷകനുമാകാമോ?" }),
    a: s("Yes. Ask for an advocate profile from Account type. Once approved, switch between the two from the menu at the foot of the side bar.", {
      ml: "ഉവ്വ്. അക്കൗണ്ട് തരത്തിൽ നിന്ന് അഭിഭാഷക പ്രൊഫൈലിന് അപേക്ഷിക്കുക. അംഗീകരിച്ചാൽ വശത്തെ ബാറിന്റെ താഴെയുള്ള മെനുവിൽ നിന്ന് മാറാം.",
    }),
  },
  {
    q: s("Which ID can I add?", { ml: "ഏത് ID ചേർക്കാം?" }),
    a: s("Aadhaar, driving licence, PAN, passport or voter ID. The scan must be clear enough to read the name and number.", {
      ml: "ആധാർ, ഡ്രൈവിംഗ് ലൈസൻസ്, പാൻ, പാസ്‌പോർട്ട് അല്ലെങ്കിൽ വോട്ടർ ID. പേരും നമ്പറും വായിക്കാവുന്നത്ര വ്യക്തമായിരിക്കണം സ്കാൻ.",
    }),
  },
];
