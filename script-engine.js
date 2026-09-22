// Local medical script engine.
// No AI API is used for script generation.

(function () {
  "use strict";

  const COMMON_IMAGE_SUFFIX =
    "professional medical awareness content, realistic and educational, " +
    "normal medical setting, normal clothing, no sexualized content, " +
    "no revealing clothing, no glamour pose, no provocative framing, " +
    "no text, no logos, no watermark in the image";

  const TOPICS = [
    {
      key: "knee",
      match: ["knee", "knees", "घुटना", "घुटने", "घुटनों"],
      title: "Knee Pain: When Should You See a Doctor?",
      scenes: [
        ["Knee pain can have many causes", "Knee pain may be related to injury, arthritis, overuse, or other conditions.", "Medical illustration of a human knee joint, showing normal anatomy and common sources of knee pain, clean clinical infographic"],
        ["Don't ignore persistent pain", "Pain that keeps returning or affects walking deserves medical evaluation.", "Adult patient in normal clothing discussing persistent knee pain with an orthopaedic doctor in a clean clinic"],
        ["Swelling and stiffness matter", "Swelling, stiffness, or difficulty moving the knee can be important symptoms to discuss with a doctor.", "Close clinical view of a knee examination by a doctor, subtle swelling indication, professional medical setting"],
        ["An examination helps identify the cause", "A doctor may examine movement, stability, tenderness, and other signs before deciding what tests are needed.", "Orthopaedic doctor examining a patient's knee, normal clinical clothing and examination room"],
        ["Treatment depends on the cause", "Treatment may include activity modification, physiotherapy, medicines, or other care depending on the diagnosis.", "Physiotherapy session for knee rehabilitation with a therapist guiding a patient, professional clinic"],
        ["Get appropriate medical advice", "If knee pain is persistent, severe, or follows an injury, seek evaluation from a qualified doctor.", "Doctor speaking with a patient about a knee-care plan, calm professional hospital environment"]
      ]
    },
    {
      key: "back",
      match: ["back pain", "backache", "lower back", "कमर दर्द", "पीठ दर्द", "कमर"],
      title: "Back Pain: Common Causes and Warning Signs",
      scenes: [
        ["Back pain is common", "Back pain can happen because of strain, posture, injury, or several other causes.", "Medical illustration of the human spine and lower back, clean educational anatomy graphic"],
        ["Avoid ignoring severe or persistent pain", "Pain that is severe, worsening, or not improving should be assessed by a qualified professional.", "Adult patient discussing persistent back pain with an orthopaedic doctor in a clinic"],
        ["Posture and activity can matter", "Long periods in one position and poor movement habits may contribute to back discomfort.", "Person sitting at a desk with neutral posture beside an educational spine posture illustration"],
        ["A clinical examination comes first", "A doctor can assess movement, strength, tenderness, and other findings to decide the next step.", "Doctor performing a professional lower-back examination on a patient"],
        ["Tests are not always the first step", "The need for an X-ray or other investigation depends on the symptoms and examination.", "Doctor reviewing a spine X-ray on a medical display with patient, clinical environment"],
        ["Seek care for concerning symptoms", "Sudden severe pain, major injury, weakness, or other concerning symptoms should receive prompt medical attention.", "Doctor giving medical advice to a patient in a hospital consultation room"]
      ]
    },
    {
      key: "fracture",
      match: ["fracture", "broken bone", "bone fracture", "हड्डी", "फ्रैक्चर", "टूट", "टूटी"],
      title: "Fracture: What To Do After an Injury",
      scenes: [
        ["A fracture needs proper assessment", "After a significant injury, a fracture may require clinical examination and imaging.", "Educational medical illustration of a fractured long bone with a clean highlighted fracture line"],
        ["Protect the injured area", "Avoid unnecessary movement of a suspected fracture and seek medical assessment.", "First-aid scene showing careful immobilization of an injured arm, professional and non-graphic"],
        ["X-ray can help confirm a fracture", "Doctors commonly use imaging such as X-rays to evaluate suspected bone injuries.", "Orthopaedic doctor reviewing a clear X-ray of a fractured bone in a hospital"],
        ["Treatment depends on the fracture", "Some fractures can be treated with immobilization, while others may require a procedure or surgery.", "Doctor explaining fracture treatment options using a bone model and medical imaging"],
        ["Follow-up is important", "Healing needs monitoring, and rehabilitation may be recommended when appropriate.", "Orthopaedic follow-up appointment with a patient and doctor discussing fracture recovery"],
        ["Get professional care", "Do not rely on self-treatment when a fracture is suspected.", "Patient receiving professional orthopaedic care in a clean hospital setting"]
      ]
    },
    {
      key: "arthritis",
      match: ["arthritis", "osteoarthritis", "joint pain", "जोड़ों का दर्द", "गठिया", "जोड़"],
      title: "Arthritis: Understanding Joint Pain",
      scenes: [
        ["What is arthritis?", "Arthritis is a broad term for conditions that can cause joint pain, stiffness, or swelling.", "Clean medical illustration of a knee joint comparing healthy cartilage with arthritic changes"],
        ["Stiffness can be a symptom", "Some people notice stiffness or pain that affects daily activities.", "Adult patient with mild knee stiffness discussing symptoms with a doctor"],
        ["Diagnosis is based on clinical assessment", "A doctor considers symptoms, examination findings, and tests when needed.", "Doctor examining a patient's hand and knee joints in a clinical consultation"],
        ["Movement can be part of management", "Depending on the condition, appropriate physical activity and physiotherapy may help maintain function.", "Physiotherapist guiding a patient through gentle joint mobility exercises"],
        ["Treatment is individualized", "Medicines and other treatments depend on the type and severity of the condition.", "Doctor discussing an individualized arthritis management plan with a patient"],
        ["Don't ignore worsening symptoms", "Persistent or worsening joint problems should be discussed with a qualified doctor.", "Professional doctor-patient consultation about chronic joint pain"]
      ]
    },
    {
      key: "dental",
      match: ["dental", "tooth", "teeth", "toothache", "दांत", "दाँत", "दांत दर्द", "दाँत दर्द"],
      title: "Tooth Pain: Common Causes and What To Do",
      scenes: [
        ["Tooth pain should not be ignored", "Tooth pain can have several causes, including decay, infection, or gum problems.", "Clean dental anatomy illustration showing tooth decay and surrounding gum structures"],
        ["Look for associated symptoms", "Swelling, sensitivity, or pain while chewing can be important information for a dentist.", "Dentist examining a patient's tooth and gums in a clean dental clinic"],
        ["A dental examination identifies the cause", "The dentist may examine the tooth and recommend an X-ray when needed.", "Dentist reviewing a dental X-ray with a patient in a professional clinic"],
        ["Treatment depends on the diagnosis", "Treatment can range from preventive care to restorative or other dental procedures.", "Dentist explaining treatment options using a tooth model, normal professional setting"],
        ["Good oral hygiene helps", "Regular brushing, appropriate cleaning between teeth, and dental checkups support oral health.", "Professional dental hygiene demonstration with toothbrush and dental model"],
        ["See a dentist for persistent pain", "Persistent tooth pain or swelling should be assessed by a qualified dental professional.", "Dentist speaking with a patient about persistent tooth pain in a modern clinic"]
      ]
    }
  ];

  const GENERIC = {
    title: "Medical Awareness: Know the Basics",
    scenes: [
      ["Understand the problem", "Learn the basic facts about the health condition and why it can matter.", "Professional doctor explaining a medical condition to an adult patient in a clean hospital consultation room"],
      ["Recognize common symptoms", "Symptoms can vary from person to person. Persistent or concerning symptoms deserve attention.", "Educational medical illustration showing common symptoms related to a general health condition"],
      ["Do not self-diagnose", "Online information cannot replace an examination by a qualified healthcare professional.", "Doctor discussing symptoms with a patient in a professional clinical setting"],
      ["Evaluation may be needed", "A clinician decides whether examination, imaging, laboratory tests, or other evaluation is appropriate.", "Doctor reviewing a medical examination and diagnostic plan with a patient"],
      ["Treatment depends on the cause", "The appropriate treatment depends on the diagnosis and individual circumstances.", "Doctor explaining a personalized treatment plan to a patient"],
      ["Seek appropriate medical care", "For persistent, severe, or concerning symptoms, consult a qualified healthcare professional.", "Professional hospital consultation scene with doctor and patient"]
    ]
  };

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKC")
      .trim();
  }

  function chooseTemplate(topic) {
    const text = normalize(topic);
    return TOPICS.find(t => t.match.some(k => text.includes(normalize(k)))) || GENERIC;
  }

  function scene(block) {
    return {
      title: block[0],
      caption: block[1],
      visualPrompt: block[2] + ". " + COMMON_IMAGE_SUFFIX
    };
  }

  function buildPlan(topic, language, count) {
    const template = chooseTemplate(topic);
    const n = Math.max(5, Math.min(7, Number(count) || 5));
    const blocks = template.scenes.slice(0, n);

    return {
      title: template.title + " — Major Hospital",
      language: "English",
      scenes: blocks.map(scene)
    };
  }

  window.buildLocalMedicalPlan = buildPlan;
})();
