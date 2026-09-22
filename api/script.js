// Local medical script engine — NO AI API required.
// This replaces the previous OpenRouter/Gemini script generator.

const TOPICS = {
  knee: {
    title: "Knee Pain",
    hook: {
      Hindi: "घुटने में दर्द को हमेशा नजरअंदाज नहीं करना चाहिए।",
      English: "Knee pain should not always be ignored.",
      "Hindi + English": "घुटने में दर्द? Knee pain को हमेशा ignore न करें।"
    },
    intro: {
      Hindi: "घुटने का दर्द चोट, अधिक दबाव, उम्र से जुड़े बदलाव या जोड़ों की समस्या से हो सकता है।",
      English: "Knee pain can result from injury, overuse, age-related changes, or joint problems.",
      "Hindi + English": "घुटने का दर्द injury, overuse, age-related changes या joint problems से हो सकता है।"
    },
    causes: {
      Hindi: "सामान्य कारणों में चोट, लिगामेंट या मेनिस्कस की समस्या, गठिया और अधिक दबाव शामिल हैं।",
      English: "Common causes include injury, ligament or meniscus problems, arthritis, and overuse.",
      "Hindi + English": "Common causes में injury, ligament या meniscus problems, arthritis और overuse शामिल हैं।"
    },
    signs: {
      Hindi: "अगर दर्द लगातार रहे, सूजन हो, घुटना लॉक हो या चलने में परेशानी हो, तो डॉक्टर से सलाह लें।",
      English: "Seek medical advice if pain persists, swelling develops, the knee locks, or walking becomes difficult.",
      "Hindi + English": "अगर pain बना रहे, swelling हो, knee lock हो या चलने में difficulty हो, तो doctor से सलाह लें।"
    },
    care: {
      Hindi: "आराम, गतिविधि को जरूरत के अनुसार कम करना और सही चिकित्सकीय जांच मददगार हो सकती है। इलाज कारण पर निर्भर करता है।",
      English: "Rest and adjusting activity may help, but treatment depends on the underlying cause and proper examination.",
      "Hindi + English": "Rest और activity adjustment मदद कर सकते हैं, लेकिन treatment सही examination और कारण पर depend करता है।"
    },
    cta: {
      Hindi: "घुटने के दर्द का कारण जानने के लिए योग्य ऑर्थोपेडिक डॉक्टर से जांच कराएं।",
      English: "For persistent knee pain, consult a qualified orthopaedic doctor for an evaluation.",
      "Hindi + English": "Persistent knee pain के लिए qualified orthopaedic doctor से evaluation कराएं।"
    },
    images: [
      "professional Indian adult patient in normal modest clothing gently holding the knee in a clean medical setting, realistic clinical photography, vertical 9:16, no glamour, no provocative pose",
      "medical illustration of the human knee joint showing bones, cartilage and ligaments, clean educational anatomy diagram, white clinical background, vertical 9:16",
      "orthopaedic doctor examining a patient's knee in a professional clinic, both fully clothed in normal medical attire, realistic Indian healthcare setting, vertical 9:16",
      "clean medical illustration showing common causes of knee pain such as injury, arthritis and overuse, educational infographic style, vertical 9:16",
      "orthopaedic consultation in a professional Indian hospital, doctor discussing treatment options with adult patient, normal clothing, vertical 9:16"
    ]
  },
  back: {
    title: "Back Pain",
    hook: {Hindi:"कमर दर्द को बार-बार होने पर नजरअंदाज न करें।",English:"Do not ignore back pain that keeps returning.","Hindi + English":"बार-बार होने वाला back pain ignore न करें।"},
    intro:{Hindi:"कमर दर्द मांसपेशियों के खिंचाव, गलत posture, चोट या रीढ़ से जुड़ी समस्या के कारण हो सकता है।",English:"Back pain can come from muscle strain, poor posture, injury, or problems involving the spine.","Hindi + English":"Back pain muscle strain, poor posture, injury या spine-related problems से हो सकता है।"},
    causes:{Hindi:"लंबे समय तक गलत posture, भारी वजन उठाना, चोट और कुछ रीढ़ की समस्याएं सामान्य कारण हैं।",English:"Poor posture, lifting heavy loads, injury, and some spinal conditions are common causes.","Hindi + English":"Poor posture, heavy lifting, injury और कुछ spinal conditions common causes हैं।"},
    signs:{Hindi:"पैर में कमजोरी या सुन्नपन, चलने में परेशानी, चोट के बाद दर्द या लगातार बढ़ता दर्द हो तो चिकित्सकीय सलाह लें।",English:"Seek medical advice for weakness or numbness in the legs, difficulty walking, pain after injury, or worsening persistent pain.","Hindi + English":"Leg weakness/numbness, walking difficulty, injury के बाद pain या worsening pain हो तो medical advice लें।"},
    care:{Hindi:"हल्की समस्या में गतिविधि का सही संतुलन और posture सुधार मदद कर सकता है। लगातार दर्द में जांच जरूरी हो सकती है।",English:"For mild problems, appropriate activity and posture correction may help. Persistent pain may require evaluation.","Hindi + English":"Mild problems में proper activity और posture correction मदद कर सकते हैं; persistent pain में evaluation जरूरी हो सकता है।"},
    cta:{Hindi:"लगातार कमर दर्द के लिए योग्य ऑर्थोपेडिक डॉक्टर से जांच कराएं।",English:"For persistent back pain, consult a qualified orthopaedic doctor for an evaluation.","Hindi + English":"Persistent back pain के लिए qualified orthopaedic doctor से evaluation कराएं।"},
    images:[
      "professional Indian adult patient in normal modest clothing gently holding the lower back in a clean clinic, realistic clinical photography, vertical 9:16",
      "medical anatomy illustration of the human spine and lower back, clean educational diagram, white clinical background, vertical 9:16",
      "orthopaedic doctor assessing an adult patient's back posture in a professional clinic, fully clothed, vertical 9:16",
      "educational illustration showing posture and common mechanical causes of back pain, clean medical infographic, vertical 9:16",
      "professional doctor-patient consultation about back pain in an Indian hospital, normal clothing, vertical 9:16"
    ]
  },
  fracture: {
    title:"Fracture",
    hook:{Hindi:"हड्डी टूटने का शक हो तो इसे साधारण चोट समझकर नजरअंदाज न करें।",English:"If you suspect a fracture, do not treat it as an ordinary injury.","Hindi + English":"Fracture का शक हो तो इसे सिर्फ normal injury समझकर ignore न करें।"},
    intro:{Hindi:"गिरने, दुर्घटना या तेज चोट के बाद हड्डी में fracture हो सकता है।",English:"A fracture can occur after a fall, accident, or significant impact.","Hindi + English":"Fall, accident या significant impact के बाद fracture हो सकता है।"},
    causes:{Hindi:"Fracture में दर्द, सूजन, चोट वाले हिस्से को इस्तेमाल करने में परेशानी या असामान्य आकार दिखाई दे सकता है।",English:"A fracture may cause pain, swelling, difficulty using the injured part, or an abnormal appearance.","Hindi + English":"Fracture में pain, swelling, movement difficulty या abnormal appearance हो सकता है।"},
    signs:{Hindi:"तेज दर्द, स्पष्ट deformity, सुन्नपन, त्वचा का नीला पड़ना या हड्डी बाहर दिखाई देना emergency हो सकता है।",English:"Severe pain, obvious deformity, numbness, bluish skin, or exposed bone may require urgent medical care.","Hindi + English":"Severe pain, deformity, numbness, bluish skin या exposed bone में urgent medical care लें।"},
    care:{Hindi:"घायल हिस्से को अनावश्यक रूप से न हिलाएं और जल्द चिकित्सकीय जांच तथा X-ray की जरूरत पड़ सकती है।",English:"Avoid unnecessary movement of the injured area and seek medical assessment; an X-ray may be needed.","Hindi + English":"Injured area को unnecessarily न हिलाएं; medical assessment और संभवतः X-ray जरूरी हो सकता है।"},
    cta:{Hindi:"Fracture के शक में ऑर्थोपेडिक जांच जल्द कराएं।",English:"If a fracture is suspected, arrange an orthopaedic evaluation promptly.","Hindi + English":"Fracture के शक में prompt orthopaedic evaluation कराएं।"},
    images:[
      "professional emergency medical scene with an adult patient and doctor after an injury, fully clothed, normal hospital setting, vertical 9:16",
      "clean medical X-ray style illustration of a long bone fracture, educational anatomy visual, vertical 9:16",
      "orthopaedic doctor examining an injured arm or leg in a professional hospital, normal clothing and clinical setting, vertical 9:16",
      "educational illustration showing safe immobilization of an injured limb, medical infographic style, vertical 9:16",
      "orthopaedic consultation with adult patient reviewing an X-ray, professional Indian hospital, vertical 9:16"
    ]
  },
  arthritis: {
    title:"Arthritis",
    hook:{Hindi:"जोड़ों में बार-बार दर्द और जकड़न arthritis का संकेत हो सकता है।",English:"Repeated joint pain and stiffness can be associated with arthritis.","Hindi + English":"Repeated joint pain और stiffness arthritis से जुड़ी हो सकती है।"},
    intro:{Hindi:"Arthritis कई प्रकार का होता है और इसके कारण तथा उपचार व्यक्ति के अनुसार अलग हो सकते हैं।",English:"There are different types of arthritis, and the cause and treatment can vary from person to person.","Hindi + English":"Arthritis के कई types होते हैं, और cause तथा treatment व्यक्ति के अनुसार बदल सकते हैं।"},
    causes:{Hindi:"कुछ प्रकार उम्र से जुड़े joint changes से, जबकि कुछ inflammatory conditions से जुड़े हो सकते हैं।",English:"Some forms are associated with age-related joint changes, while others involve inflammatory conditions.","Hindi + English":"कुछ forms age-related joint changes और कुछ inflammatory conditions से जुड़े हो सकते हैं।"},
    signs:{Hindi:"दर्द, सूजन, जकड़न और movement कम होना आम लक्षण हो सकते हैं।",English:"Pain, swelling, stiffness, and reduced movement can be common symptoms.","Hindi + English":"Pain, swelling, stiffness और reduced movement common symptoms हो सकते हैं।"},
    care:{Hindi:"सही diagnosis के बाद exercise, lifestyle changes, medicines या अन्य treatment की जरूरत हो सकती है।",English:"After diagnosis, treatment may include exercise, lifestyle changes, medicines, or other options depending on the type.","Hindi + English":"Diagnosis के बाद exercise, lifestyle changes, medicines या अन्य treatment की जरूरत हो सकती है।"},
    cta:{Hindi:"लगातार joint pain के लिए योग्य डॉक्टर से जांच और सही diagnosis कराएं।",English:"For persistent joint pain, consult a qualified doctor for proper evaluation and diagnosis.","Hindi + English":"Persistent joint pain के लिए qualified doctor से proper evaluation और diagnosis कराएं।"},
    images:[
      "professional Indian adult patient with hand resting on a painful knee joint, normal modest clothing, clean clinic, vertical 9:16",
      "medical anatomy illustration comparing healthy and arthritic joint, clean educational diagram, vertical 9:16",
      "doctor examining an adult patient's swollen knee joint in a professional orthopaedic clinic, vertical 9:16",
      "medical infographic illustrating joint stiffness, swelling and reduced movement, clean clinical style, vertical 9:16",
      "doctor explaining arthritis treatment options to an adult patient in a professional hospital, vertical 9:16"
    ]
  },
  dental: {
    title:"Dental Pain",
    hook:{Hindi:"दांत का दर्द बार-बार हो रहा है तो केवल painkiller पर निर्भर न रहें।",English:"If tooth pain keeps returning, do not rely only on painkillers.","Hindi + English":"Tooth pain बार-बार हो रहा है तो सिर्फ painkiller पर depend न करें।"},
    intro:{Hindi:"दांत का दर्द cavity, infection, gum disease या अन्य dental problems से हो सकता है।",English:"Tooth pain can result from cavities, infection, gum disease, or other dental problems.","Hindi + English":"Tooth pain cavity, infection, gum disease या other dental problems से हो सकता है।"},
    causes:{Hindi:"मीठे खाद्य पदार्थों का अधिक सेवन, खराब oral hygiene और untreated dental problems जोखिम बढ़ा सकते हैं।",English:"Frequent sugary foods, poor oral hygiene, and untreated dental problems can increase risk.","Hindi + English":"Frequent sugary foods, poor oral hygiene और untreated dental problems risk बढ़ा सकते हैं।"},
    signs:{Hindi:"सूजन, बुखार, चेहरे की swelling, निगलने में परेशानी या तेज दर्द में जल्द dental care लें।",English:"Seek prompt dental care for swelling, fever, facial swelling, difficulty swallowing, or severe pain.","Hindi + English":"Swelling, fever, facial swelling, swallowing difficulty या severe pain में prompt dental care लें।"},
    care:{Hindi:"दिन में दो बार brushing, सही oral hygiene और नियमित dental check-up मददगार हैं।",English:"Brushing twice daily, good oral hygiene, and regular dental check-ups can help.","Hindi + English":"Twice-daily brushing, good oral hygiene और regular dental check-ups मददगार हैं।"},
    cta:{Hindi:"दांत के दर्द का कारण जानने के लिए qualified dentist से जांच कराएं।",English:"Consult a qualified dentist to identify the cause of tooth pain.","Hindi + English":"Tooth pain का cause जानने के लिए qualified dentist से जांच कराएं।"},
    images:[
      "professional Indian adult patient touching cheek because of tooth pain, normal modest clothing, dental clinic, vertical 9:16",
      "clean educational dental anatomy illustration showing tooth decay and healthy tooth, white clinical background, vertical 9:16",
      "professional dentist examining an adult patient in a modern dental clinic, normal clothing, vertical 9:16",
      "educational oral hygiene illustration showing toothbrush and proper brushing technique, clean medical style, vertical 9:16",
      "dentist discussing dental treatment with adult patient in a professional Indian clinic, vertical 9:16"
    ]
  }
};

const GENERIC = {
  title: "Medical Awareness",
  hook:{Hindi:"इस स्वास्थ्य समस्या को समझना और सही समय पर डॉक्टर से सलाह लेना जरूरी है।",English:"Understanding this health problem and seeking medical advice at the right time is important.","Hindi + English":"इस health problem को समझना और सही समय पर doctor से सलाह लेना जरूरी है।"},
  intro:{Hindi:"हर व्यक्ति में लक्षण और कारण अलग हो सकते हैं, इसलिए केवल इंटरनेट की जानकारी के आधार पर diagnosis न करें।",English:"Symptoms and causes can vary between people, so do not diagnose yourself based only on internet information.","Hindi + English":"Symptoms और causes अलग हो सकते हैं; केवल internet information से self-diagnosis न करें।"},
  causes:{Hindi:"इस समस्या के कई संभावित कारण हो सकते हैं। सही कारण जानने के लिए medical history और examination की जरूरत पड़ सकती है।",English:"There can be several possible causes. Medical history and examination may be needed to identify the cause.","Hindi + English":"कई possible causes हो सकते हैं; सही कारण के लिए medical history और examination जरूरी हो सकते हैं।"},
  signs:{Hindi:"लक्षण लगातार रहें, तेजी से बढ़ें या रोजमर्रा के काम प्रभावित करें तो डॉक्टर से सलाह लें।",English:"Seek medical advice if symptoms persist, worsen, or interfere with daily activities.","Hindi + English":"Symptoms persist/worsen हों या daily activities प्रभावित हों तो doctor से सलाह लें।"},
  care:{Hindi:"उचित जांच के बाद ही सही treatment तय किया जाना चाहिए। बिना सलाह के दवा शुरू या बंद न करें।",English:"Treatment should be decided after appropriate evaluation. Do not start or stop medicines without medical advice.","Hindi + English":"Proper evaluation के बाद treatment तय करें। Medical advice के बिना medicines start/stop न करें।"},
  cta:{Hindi:"अपनी समस्या के लिए योग्य डॉक्टर से व्यक्तिगत सलाह और जांच कराएं।",English:"Consult a qualified doctor for personalized advice and evaluation.","Hindi + English":"Personalized advice और evaluation के लिए qualified doctor से consult करें।"},
  images:[
    "professional Indian doctor speaking with an adult patient in a clean hospital consultation room, both fully clothed, normal clinical setting, vertical 9:16",
    "clean educational medical anatomy illustration related to the health topic, neutral clinical background, vertical 9:16",
    "doctor performing a routine examination of an adult patient in a professional Indian clinic, normal clothing, vertical 9:16",
    "clean medical infographic illustrating common symptoms and warning signs, professional educational design, vertical 9:16",
    "professional doctor-patient consultation in an Indian hospital, discussing evaluation and treatment, vertical 9:16"
  ]
};

function normalize(s){
  return String(s||"").toLowerCase().replace(/[^a-z0-9\u0900-\u097f ]/g," ").replace(/\s+/g," ").trim();
}

function chooseTemplate(topic){
  const t=normalize(topic);
  const rules=[
    [["knee","घुटना","घुटने","knee pain"],TOPICS.knee],
    [["back","कमर","पीठ","back pain"],TOPICS.back],
    [["fracture","फ्रैक्चर","हड्डी टूट","broken bone"],TOPICS.fracture],
    [["arthritis","गठिया","joint pain","जोड़ों का दर्द"],TOPICS.arthritis],
    [["tooth","dental","दांत","दाँत","दंत","cavity","tooth pain"],TOPICS.dental]
  ];
  for(const [words,template] of rules){
    if(words.some(w=>t.includes(normalize(w)))) return template;
  }
  return GENERIC;
}

function languageKey(language){
  return ["Hindi","English","Hindi + English"].includes(language) ? language : "Hindi";
}

function scene(title,caption,visualPrompt){
  return {title,caption,visualPrompt:imagePrompt(visualPrompt)};
}

function imagePrompt(base){
  return `${base}, professional medical awareness content, realistic and educational, no sexualized content, no revealing clothing, no glamour pose, no provocative framing, no text or logos in the image`;
}

function buildPlan(topic,language,count){
  const key=languageKey(language);
  const t=chooseTemplate(topic);
  const n=Math.max(5,Math.min(Number(count)||6,7));
  const blocks=[
    scene(t.title,t.hook[key],t.images[0]),
    scene("What it can mean",t.intro[key],t.images[1]),
    scene("Common causes",t.causes[key],t.images[2]),
    scene("Warning signs",t.signs[key],t.images[3]),
    scene("What to do",t.care[key],t.images[4]),
    scene("Doctor advice",t.cta[key],t.images[2]),
    scene("Remember",key==="English"?"This video is for general awareness and does not replace a medical consultation.":key==="Hindi"?"यह वीडियो सामान्य स्वास्थ्य जागरूकता के लिए है; यह व्यक्तिगत चिकित्सा सलाह का विकल्प नहीं है।":"यह video general health awareness के लिए है; यह personal medical advice का replacement नहीं है।",t.images[1])
  ];
  return {title:`${t.title} — Major Hospital`,language:key,scenes:blocks.slice(0,n)};
}

export default function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST only"});
  try{
    const topic=String(req.body?.topic||"").trim();
    if(!topic) return res.status(400).json({error:"Topic required"});
    const plan=buildPlan(topic,req.body?.language,req.body?.sceneCount||req.body?.count);
    return res.status(200).json(plan);
  }catch(e){
    console.error("Local script engine error:",e);
    return res.status(500).json({error:e?.message||"Could not create script"});
  }
}
