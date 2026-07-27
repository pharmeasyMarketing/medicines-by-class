# -*- coding: utf-8 -*-
"""
Per-class editorial seed copy.

DRAFT CONTENT -- written to the design's copy rule: "used for" / "used in the
management of" only. Never "cures", "treats", "best", or any comparison between
medicines. Every row lands in the sheet as content_status=draft so a medical
reviewer signs off before it publishes.

Each entry supplies the class-specific facts; the generator assembles the rest.
    blurb   : one line for the directory card (<= 62 chars is ideal)
    intro   : the class-page hero paragraph
    what    : what the class is, in plain language
    note    : the one thing a person most needs to understand about the class
    caution : the class-specific safety line
    faq     : (question, answer) pairs unique to this class
"""

CONTENT = {
"anti-diabetic-medicines": dict(
    blurb="Medicines used in the management of diabetes",
    intro="Medicines used in the management of diabetes. This class covers several groups that work in different ways – a doctor decides which one, and which strength, is appropriate for a person.",
    what="Anti-diabetic medicines are used in the management of diabetes as part of a treatment plan decided by a doctor. Different groups within the class act in different ways – some support the body's own insulin response, some change how glucose is handled by the kidneys, and insulins replace or supplement insulin directly.",
    note="Most anti-diabetic products sold in India are fixed-dose combinations, so two packs with similar names can contain different molecules at different strengths. Always match the pack to the prescription rather than to the brand name you remember.",
    caution="Keep meals, activity and blood sugar monitoring consistent with your doctor's advice, and tell them about any kidney or liver condition.",
    faq=[
        ("What are anti-diabetic medicines used for?",
         "They are used in the management of diabetes, as advised by a doctor. The choice depends on the type of diabetes, blood sugar readings, other health conditions and the person's overall treatment plan."),
        ("Are all medicines in this class the same?",
         "No. The class includes biguanides, sulfonylureas, DPP-4 inhibitors, SGLT2 inhibitors, GLP-1 receptor agonists, insulins and fixed-dose combinations. They differ in composition, strength, dosage form and suitability."),
        ("Can I switch to a cheaper substitute in the same class?",
         "Only if your doctor or pharmacist advises it. A substitute may contain a different active ingredient or strength, so it is not automatically an equivalent."),
        ("How should these medicines be stored?",
         "Follow the storage instructions on the pack. Most tablets are kept below 25°C away from moisture, while insulins and some injectables need refrigeration – check the label and ask your pharmacist."),
    ]),

"blood-pressure-medicines": dict(
    blurb="Medicines used to manage high or low blood pressure",
    intro="Medicines used in the management of blood pressure. Several groups act on different parts of the circulation, and many packs combine two of them.",
    what="Blood pressure medicines are used in the management of hypertension and related conditions. Groups within the class act differently – some relax blood vessels, some reduce the heart's workload, and some help the body remove excess fluid and salt.",
    note="Blood pressure medicines are usually taken long term, and readings can look normal precisely because the medicine is working. A normal reading is not a reason to stop.",
    caution="Do not stop or change the dose on your own, and tell your doctor if you feel dizzy on standing.",
    faq=[
        ("What are blood pressure medicines used for?",
         "They are used in the management of high blood pressure, and in some cases for related heart or kidney conditions, as decided by a doctor."),
        ("Why has my doctor prescribed two medicines together?",
         "Blood pressure is often managed with a combination, because two medicines acting in different ways can allow lower doses of each. Many packs contain a fixed-dose combination for this reason."),
        ("Can I stop taking it once my readings are normal?",
         "No. Normal readings usually mean the medicine is doing its job. Stopping without medical advice can allow blood pressure to rise again."),
        ("Does the time of day matter?",
         "Sometimes. Follow the timing your doctor specified and keep it consistent from day to day."),
    ]),

"cancer-medicines": dict(
    blurb="Medicines used in cancer treatment under specialist supervision",
    intro="Medicines used in the treatment of cancer, prescribed and monitored by an oncologist. This class includes several very different groups, and nothing here is suitable for self-selection.",
    what="Cancer medicines are used as part of a treatment plan designed and supervised by an oncologist. The class spans targeted therapies, monoclonal antibodies, cytotoxic agents and hormonal therapies, which differ completely in how they are given, monitored and dosed.",
    note="Dosing in this class is frequently calculated from body weight, body surface area or laboratory results, and can change between cycles. The pack strength alone does not tell you the dose.",
    caution="These medicines require specialist supervision and regular monitoring. Never alter a cycle, dose or schedule without your oncologist.",
    faq=[
        ("Who prescribes medicines in this class?",
         "An oncologist or another specialist involved in the person's cancer care. These medicines are not appropriate for self-selection under any circumstances."),
        ("Why do doses differ so much between people?",
         "Doses are often calculated from body weight, body surface area, organ function or blood test results, and may be adjusted between treatment cycles."),
        ("Do I need to keep monitoring appointments?",
         "Yes. Regular blood tests and reviews are part of the treatment plan and help your specialist adjust it safely."),
        ("Can these be bought without a prescription?",
         "No. Every medicine in this class is prescription-only, and a valid prescription is required before an order can be confirmed."),
    ]),

"mental-health-medicines": dict(
    blurb="Medicines used in the management of mental health conditions",
    intro="Medicines used in the management of mental health conditions, prescribed and reviewed by a doctor. Many are Schedule H or H1 and are dispensed under strict conditions.",
    what="This class covers medicines used in the management of depression, anxiety, bipolar disorder, psychosis and related conditions. Groups within it act on different chemical pathways, and the right choice depends on the diagnosis, the person's history and how they respond over time.",
    note="Many medicines in this class need several weeks before their full effect is assessed, and several must be tapered rather than stopped abruptly. Both are reasons to stay in contact with the prescriber rather than adjusting the dose yourself.",
    caution="Do not stop suddenly – several of these medicines need to be reduced gradually under medical supervision. Tell your doctor promptly about any change in mood or thinking.",
    faq=[
        ("How long do these medicines take to work?",
         "It varies by medicine and by person. Some are assessed over several weeks, which is why doctors usually ask for a review before deciding whether a change is needed."),
        ("Can I stop when I feel better?",
         "No. Several medicines in this class need to be reduced gradually rather than stopped, and feeling better often means the treatment is working. Any change should be planned with your doctor."),
        ("Why is a fresh prescription sometimes required?",
         "Many of these are Schedule H or H1 medicines. Dispensing is recorded and regulated, so a valid, current prescription is required."),
        ("Are these medicines habit-forming?",
         "Some groups, such as certain sedatives, carry a dependence risk and are prescribed for limited periods. Your doctor will explain which category your medicine falls into."),
    ]),

"gastrointestinal-medicines": dict(
    blurb="Medicines used for digestive and gut concerns",
    intro="Medicines used in the management of digestive concerns – acidity and reflux, nausea, cramps, altered bowel habit and related conditions.",
    what="This class groups medicines used for the stomach and intestines. It includes antacids and acid-reducing medicines, anti-emetics for nausea, antispasmodics for cramps, and preparations used for altered bowel habit.",
    note="Ongoing digestive symptoms are worth investigating rather than managing indefinitely with over-the-counter relief. Persistent acidity, unexplained weight loss or blood in the stool should always be reviewed by a doctor.",
    caution="Long-term use of acid-reducing medicines should be reviewed periodically by a doctor rather than continued indefinitely.",
    faq=[
        ("What is the difference between an antacid and an acid-reducing medicine?",
         "Antacids act on acid already present and are typically used for short-term relief. Acid-reducing medicines lower how much acid is produced and are usually taken on a schedule set by a doctor."),
        ("Can I take these long term?",
         "Extended use should be reviewed by a doctor. Persistent symptoms may need investigation rather than continued symptomatic relief."),
        ("Does food timing matter?",
         "Often yes. Some are taken before food and some after. Follow the instruction on your prescription or ask your pharmacist."),
        ("When should I see a doctor instead?",
         "Seek medical advice for symptoms that persist or recur, or for unexplained weight loss, difficulty swallowing, or blood in vomit or stool."),
    ]),

"antibiotics": dict(
    blurb="Medicines used for certain bacterial infections",
    intro="Medicines used in the management of bacterial infections. Antibiotics have no effect on viral illnesses such as colds and most sore throats.",
    what="Antibiotics are used for infections caused by bacteria. Different groups target different organisms, which is why the choice, dose and duration depend on the site and type of infection rather than on how unwell a person feels.",
    note="Completing the prescribed course matters even after symptoms settle. Stopping early, or keeping leftover antibiotics for a future illness, contributes to antibiotic resistance.",
    caution="Never use antibiotics left over from a previous illness, and never share them. Tell your doctor about any previous reaction to an antibiotic.",
    faq=[
        ("Will an antibiotic help with a cold or flu?",
         "No. Colds and flu are viral, and antibiotics act only on bacteria. Your doctor will advise whether an antibiotic is appropriate."),
        ("Should I finish the course even if I feel better?",
         "Follow the course exactly as prescribed. Stopping early can allow the infection to return and contributes to antibiotic resistance."),
        ("Can I use an antibiotic left over from last time?",
         "No. The medicine, dose and duration are chosen for a specific infection, and leftover antibiotics may be wrong, expired, or an insufficient quantity."),
        ("What should I tell my doctor before starting?",
         "Any previous reaction or allergy to an antibiotic, any other medicines you take, and whether you are pregnant or breastfeeding."),
    ]),

"cholesterol-medicines": dict(
    blurb="Medicines used in the management of lipid levels",
    intro="Medicines used in the management of cholesterol and other blood lipids, usually alongside changes to diet and activity.",
    what="Cholesterol medicines are used in the management of raised lipid levels. Statins are the most widely prescribed group; others act on triglycerides or on how much cholesterol is absorbed from food.",
    note="Lipid medicines are generally taken long term and work quietly – there is usually nothing to feel. Blood tests, not symptoms, tell you and your doctor whether the treatment is doing its job.",
    caution="Report unexplained or persistent muscle pain or weakness to your doctor. Keep the blood tests your doctor has scheduled.",
    faq=[
        ("Do I still need to watch my diet?",
         "Yes. These medicines are prescribed alongside diet and activity changes, not instead of them."),
        ("Why do I need blood tests?",
         "Lipid levels and, in some cases, liver enzymes are checked so your doctor can confirm the treatment is working and being tolerated."),
        ("Does it matter what time I take it?",
         "For some statins it does. Follow the timing on your prescription and keep it consistent."),
        ("What should I report to my doctor?",
         "Unexplained or persistent muscle pain, tenderness or weakness, and any new medicine or supplement you start."),
    ]),

"neurological-medicines": dict(
    blurb="Medicines used for neurological conditions",
    intro="Medicines used in the management of neurological conditions such as epilepsy, Parkinson's disease and related disorders.",
    what="This class covers medicines used for conditions affecting the brain and nervous system. Dosing is often built up gradually, and the schedule is chosen for the individual rather than for the condition alone.",
    note="Consistency matters more in this class than in most. Missed or late doses can affect seizure control, and switching between brands of the same molecule should be discussed with the prescriber first.",
    caution="Do not miss doses or stop suddenly – this can be dangerous in epilepsy. Discuss any brand change with your doctor before switching.",
    faq=[
        ("Why is the dose increased slowly?",
         "Many of these medicines are introduced gradually so the body can adjust and so the prescriber can find the lowest effective dose."),
        ("What if I miss a dose?",
         "Follow the advice your doctor or pharmacist gave for your specific medicine. Do not double a dose to catch up unless you have been told to."),
        ("Can I switch between brands of the same molecule?",
         "Discuss it with your doctor first. For some neurological medicines, staying on the same product is preferred."),
        ("Do these medicines interact with others?",
         "Interactions are common in this class. Tell your doctor and pharmacist about every medicine and supplement you take."),
    ]),

"vitamins-and-supplements": dict(
    blurb="Everyday nutritional and supplement products",
    intro="Vitamin, mineral and nutritional supplement products. Supplements support a diet – they do not replace one, and more is not better.",
    what="This class covers vitamin, mineral and other nutritional supplements, including single vitamins, multivitamin preparations and calcium with vitamin D. Some are prescribed for a diagnosed deficiency; others are bought for general use.",
    note="Several vitamins accumulate in the body rather than being flushed out, so taking more than advised can cause harm. Doubling up across a multivitamin and a single supplement is an easy way to do this by accident.",
    caution="Check whether you are already getting the same nutrient from another product, and stay within the amount advised.",
    faq=[
        ("Do I need a supplement?",
         "That depends on your diet, your health and, in some cases, a blood test. A doctor can advise whether a supplement is appropriate for you."),
        ("Can I take more than the stated amount?",
         "No. Some vitamins are stored in the body and can build up to harmful levels. Stay within the amount advised on the pack or by your doctor."),
        ("Can supplements interact with prescribed medicines?",
         "Yes. Several interact with prescription medicines, so tell your doctor and pharmacist what you take."),
        ("Do these replace a balanced diet?",
         "No. Supplements are intended to support a diet, not to substitute for one."),
    ]),

"pain-relief-medicines": dict(
    blurb="Medicines used for pain and inflammation",
    intro="Medicines used in the management of pain, fever and inflammation, from everyday preparations to those needing a prescription.",
    what="Pain relief medicines are used in the management of pain, fever and inflammation. Groups differ in how they act and in what they are suitable for, and several are also present in combination cold and flu products.",
    note="The same active ingredient appears in many differently branded products, including combination cold remedies. Taking two of them together can exceed the safe daily amount without it being obvious.",
    caution="Check whether the same active ingredient appears in another product you are taking. Take anti-inflammatory medicines with food unless told otherwise.",
    faq=[
        ("Can I take two pain relief medicines together?",
         "Not without advice. Many combination products contain the same active ingredient, and doubling up can exceed the safe daily amount."),
        ("How long can I take these for?",
         "Short-term use is typical for everyday pain. Pain that persists should be assessed by a doctor rather than managed indefinitely."),
        ("Should I take these with food?",
         "Anti-inflammatory medicines are usually taken with food to reduce stomach irritation. Follow the instruction on your pack."),
        ("Who should be careful with anti-inflammatory medicines?",
         "People with stomach ulcers, kidney conditions, asthma, or who are pregnant should ask a doctor first."),
    ]),

"dermatology-medicines": dict(
    blurb="Medicines used for skin, hair and nail concerns",
    intro="Medicines used in the management of skin, hair and nail conditions, including preparations applied to the skin and those taken by mouth.",
    what="This class covers medicines used for skin, hair and nail conditions – acne, fungal infections, pigmentation, hair loss and inflammatory skin conditions. Many are applied topically; some are taken by mouth.",
    note="Skin treatments usually take weeks before an effect is visible, and topical steroids in particular are meant for defined courses rather than open-ended use, especially on the face.",
    caution="Use topical steroids only for the period your doctor specified, and avoid the face unless it was specifically prescribed for that.",
    faq=[
        ("How long before I see a change?",
         "Skin conditions usually respond over weeks rather than days. Follow the course your doctor set before judging the result."),
        ("Can I use a topical steroid for as long as I like?",
         "No. Topical steroids are prescribed for a defined period and strength. Extended or unsupervised use can thin the skin."),
        ("Does a prescription cream work on any rash?",
         "No. Rashes have different causes, and a preparation for one can worsen another. Have the condition assessed."),
        ("Can I use these during pregnancy?",
         "Some are not suitable in pregnancy. Tell your doctor if you are pregnant, planning a pregnancy or breastfeeding."),
    ]),

"anti-allergic-medicines": dict(
    blurb="Medicines used for allergy-related symptoms",
    intro="Medicines used in the management of allergy symptoms such as sneezing, itching, rash and watery eyes.",
    what="Anti-allergic medicines are used in the management of allergic symptoms. Older antihistamines are more likely to cause drowsiness; newer ones are usually less sedating, which is why the choice depends on when and how you need to take them.",
    note="If you know what triggers your symptoms, avoiding the trigger does more than any medicine. Antihistamines manage symptoms; they do not change the underlying allergy.",
    caution="Some antihistamines cause drowsiness – check before driving or operating machinery.",
    faq=[
        ("Will these make me drowsy?",
         "Some do. Older antihistamines are more likely to cause drowsiness than newer ones. Check the pack and ask your pharmacist if you drive."),
        ("Can I take one every day?",
         "Some are intended for regular use during an allergy season and some are not. Follow your doctor's advice."),
        ("Do these treat the allergy itself?",
         "No. They are used in the management of symptoms. Avoiding a known trigger is the more effective step where it is possible."),
        ("Can children take these?",
         "Some preparations have paediatric forms and doses. Never use an adult dose for a child – ask a doctor or pharmacist."),
    ]),

"cough-and-cold-medicines": dict(
    blurb="Medicines used for cough, cold and blocked nose",
    intro="Medicines used in the management of cough, cold and blocked-nose symptoms. Most are combination preparations containing several active ingredients.",
    what="Cough and cold preparations are used in the management of symptoms – blocked nose, cough, sore throat and fever. Most are combinations, which is why two products bought separately can easily overlap.",
    note="Because most of these are combinations, taking two different cold products together often means taking the same ingredient twice. Read the ingredient list, not just the brand name.",
    caution="Check the ingredients before combining products, and take particular care with children's doses.",
    faq=[
        ("Can I take two cold products together?",
         "Usually not. Most are combinations and often share an ingredient, so taking two can double a dose without you realising."),
        ("Do these shorten a cold?",
         "No. They are used in the management of symptoms while the illness runs its course."),
        ("Are these suitable for children?",
         "Several are not suitable for young children. Always check the age on the pack and ask a doctor or pharmacist."),
        ("When should I see a doctor?",
         "If symptoms last beyond about a week, if there is a high fever, or if breathing becomes difficult."),
    ]),

"nerve-pain-medicines": dict(
    blurb="Medicines used in the management of nerve pain",
    intro="Medicines used in the management of nerve-related pain, including diabetic neuropathy and similar conditions.",
    what="Nerve pain is managed differently from ordinary pain, and the medicines used are often ones developed for other conditions. Doses are usually built up slowly, and benefit is assessed over weeks.",
    note="Ordinary painkillers often do little for nerve pain, which is why the medicines used here look unfamiliar. Judging them over days rather than weeks is the most common reason people stop too early.",
    caution="Doses are increased gradually and should not be stopped abruptly. Drowsiness and dizziness are common when starting.",
    faq=[
        ("Why has my doctor prescribed a medicine used for epilepsy?",
         "Several medicines developed for other conditions are effective in the management of nerve pain. Your doctor has chosen it for that purpose."),
        ("How long before it helps?",
         "Often several weeks, because the dose is built up gradually. Your doctor will review with you."),
        ("Can I stop once the pain settles?",
         "Discuss it first. Several of these need to be reduced gradually rather than stopped."),
        ("Will it make me drowsy?",
         "Drowsiness and dizziness are common at the start and often settle. Take care driving until you know how it affects you."),
    ]),

"cardiac-medicines": dict(
    blurb="Medicines used in the management of heart health",
    intro="Medicines used in the management of heart conditions, including angina and heart failure.",
    what="Cardiac medicines are used in the management of conditions affecting the heart. Groups differ in how they act – some reduce the heart's workload, some improve blood flow, and some help the body manage fluid.",
    note="Several medicines in this class are prescribed in a specific combination, and the benefit comes from the combination rather than any one of them. Dropping one because you feel well can undo the rest.",
    caution="Never stop a heart medicine on your own. Report new breathlessness, swelling or chest pain to your doctor promptly.",
    faq=[
        ("Why am I on several heart medicines?",
         "Heart conditions are often managed with a combination that acts in different ways. Each has a role in the overall plan."),
        ("Can I stop if I feel well?",
         "No. Feeling well usually means the treatment is working. Any change should be made by your doctor."),
        ("What should I report urgently?",
         "New or worsening chest pain, breathlessness, or swelling of the ankles should be reported promptly."),
        ("Do these interact with other medicines?",
         "Yes, including some over-the-counter products. Tell your pharmacist what you take."),
    ]),

"bone-and-joint-medicines": dict(
    blurb="Medicines used for bone, joint and arthritis concerns",
    intro="Medicines used in the management of bone and joint conditions, including osteoarthritis, osteoporosis and rheumatoid arthritis.",
    what="This class covers medicines used in the management of joint pain and stiffness, and those used to support bone strength. They range from symptomatic relief to medicines that act on the disease process itself.",
    note="Medicines for osteoporosis often come with specific instructions about how and when to take them – upright, with water, away from food. These instructions are part of how the medicine works, not general advice.",
    caution="Follow the specific dosing instructions for bone medicines exactly, and keep any monitoring your doctor has scheduled.",
    faq=[
        ("Why are there special instructions for bone medicines?",
         "Some are absorbed poorly and can irritate the food pipe, so they are taken in a specific way – often upright, with water, and away from food."),
        ("Do these repair a damaged joint?",
         "No. They are used in the management of symptoms or of the underlying condition, as decided by your doctor."),
        ("Do I need calcium and vitamin D as well?",
         "Often, but not always. Your doctor will advise based on your diet and blood results."),
        ("How long will I need to take these?",
         "It varies by condition. Some are short courses; others are reviewed periodically over years."),
    ]),

"respiratory-medicines": dict(
    blurb="Medicines used for breathing-related concerns",
    intro="Medicines used in the management of asthma, COPD and related breathing conditions, including inhalers and tablets.",
    what="Respiratory medicines are used in the management of conditions affecting the airways. Some are relievers used when symptoms occur; others are preventers taken regularly whether or not symptoms are present.",
    note="The difference between a reliever and a preventer is the single most important thing to get right in this class. Needing your reliever more often is a signal to see your doctor, not to keep using it more.",
    caution="Do not stop a preventer inhaler because you feel well. If you need your reliever more often than usual, see your doctor.",
    faq=[
        ("What is the difference between a reliever and a preventer?",
         "A reliever is used when symptoms occur. A preventer is taken regularly to keep the airways settled, whether or not you have symptoms that day."),
        ("Can I stop my preventer when I feel fine?",
         "No. Feeling fine is usually the result of the preventer working. Any change should come from your doctor."),
        ("Does inhaler technique matter?",
         "Very much. Ask your pharmacist to check your technique – poor technique is a common reason an inhaler seems ineffective."),
        ("When should I seek help urgently?",
         "If breathlessness is severe, if your reliever is not helping, or if you need it far more often than usual."),
    ]),

"womens-health-medicines": dict(
    blurb="Medicines used in women's health and hormonal care",
    intro="Medicines used in the management of women's health conditions, including hormonal, menstrual and fertility-related care.",
    what="This class covers medicines used in hormonal and reproductive health – menstrual conditions, fertility care, hormone replacement and related areas. Timing within a cycle is often part of how they are prescribed.",
    note="For several medicines in this class the day of the cycle on which you take them is as important as the dose. A missed or mistimed dose is worth raising with the prescriber rather than guessing.",
    caution="Tell your doctor if you are pregnant, planning a pregnancy or breastfeeding, and follow cycle timing exactly.",
    faq=[
        ("Does it matter when in my cycle I take these?",
         "For several medicines in this class, yes. Follow the schedule your doctor gave you precisely."),
        ("What if I miss a dose?",
         "Ask your doctor or pharmacist about your specific medicine rather than guessing, as advice differs between products."),
        ("Can I take these while pregnant?",
         "Some are not suitable in pregnancy. Tell your doctor if you are pregnant, might be, or are breastfeeding."),
        ("Do these need monitoring?",
         "Some do. Your doctor will tell you what checks are needed and when."),
    ]),

"blood-thinners": dict(
    blurb="Medicines that affect how blood clots",
    intro="Medicines used in the management of clotting risk. These require care with dosing, monitoring and any other medicine taken alongside.",
    what="Blood thinners reduce the tendency of blood to clot. Some need regular blood tests to keep the effect in a safe range; others do not, but all of them raise the importance of consistency and of telling every clinician you see.",
    note="Everyone involved in your care – including dentists and surgeons – needs to know you take a blood thinner, ideally before any procedure is scheduled.",
    caution="Tell every doctor, dentist and pharmacist that you take a blood thinner. Report unusual bruising or bleeding promptly.",
    faq=[
        ("Do I need regular blood tests?",
         "Some blood thinners require regular monitoring and some do not. Your doctor will tell you which applies."),
        ("What should I do before dental work or surgery?",
         "Tell the dentist or surgeon well in advance. They may need to plan around your medicine."),
        ("What should I report?",
         "Unusual bruising, prolonged bleeding, blood in urine or stool, or a fall or head injury."),
        ("Can I take painkillers with these?",
         "Not all of them. Some pain relief medicines increase bleeding risk – ask your pharmacist before buying any."),
    ]),

"weight-management-medicines": dict(
    blurb="Medicines used in the management of weight",
    intro="Medicines used in the management of weight, prescribed alongside changes to diet and activity rather than instead of them.",
    what="Weight management medicines are prescribed as part of a wider plan that includes diet, activity and follow-up. They are not appropriate for cosmetic weight loss and are prescribed against defined clinical criteria.",
    note="These medicines are prescribed against clinical criteria, not on request, and they are intended to sit alongside diet and activity changes rather than replace them.",
    caution="These are prescription medicines with defined criteria for use. Discuss suitability, side effects and monitoring with your doctor.",
    faq=[
        ("Are these available without a prescription?",
         "No. Medicines in this class are prescription-only and are prescribed against defined clinical criteria."),
        ("Do I still need to change diet and activity?",
         "Yes. These medicines are prescribed alongside those changes, not instead of them."),
        ("How is progress monitored?",
         "Your doctor will set a review schedule and decide whether to continue based on how you respond and tolerate it."),
        ("What happens if I stop?",
         "Discuss this with your doctor before stopping so the wider plan can be adjusted."),
    ]),

"mens-health-medicines": dict(
    blurb="Medicines used in men's health and sexual wellness",
    intro="Medicines used in the management of men's health concerns, including sexual wellness. Most are prescription-only.",
    what="This class covers medicines used in men's health, including sexual wellness. Several interact seriously with heart medicines, which is why a prescription and an honest medication history matter here.",
    note="Medicines in this class can interact dangerously with nitrate heart medicines. Tell your doctor everything you take, including anything bought without a prescription.",
    caution="Do not combine these with nitrate heart medicines. Tell your doctor about every medicine you take, including any bought online.",
    faq=[
        ("Do I need a prescription?",
         "Yes, for most medicines in this class. A doctor should confirm suitability before use."),
        ("Are there medicines these must not be combined with?",
         "Yes. Several interact seriously with nitrate heart medicines. Tell your doctor about everything you take."),
        ("Is it safe to buy these from unverified sellers?",
         "No. Buy only from a licensed pharmacy against a valid prescription."),
        ("Should an underlying cause be investigated?",
         "Often yes. These symptoms can be a sign of another condition worth assessing."),
    ]),

"steroids": dict(
    blurb="Corticosteroid medicines used for inflammatory conditions",
    intro="Corticosteroid medicines used in the management of inflammatory and immune conditions, usually for a defined course.",
    what="Corticosteroids are used in the management of inflammation across many conditions. Courses are usually defined, and longer courses are reduced gradually rather than stopped, because the body adjusts to them.",
    note="After more than a short course, the body needs the dose reduced step by step. Stopping abruptly can cause a serious reaction, which is why the tapering schedule is not optional.",
    caution="Never stop a longer course abruptly – the dose usually needs to be reduced gradually. Carry a steroid card if you have been given one.",
    faq=[
        ("Why must the dose be reduced gradually?",
         "After more than a short course the body adjusts to the medicine, and stopping abruptly can cause a serious reaction. Follow the tapering schedule exactly."),
        ("Should I take these with food?",
         "Usually yes, to reduce stomach irritation. Follow the instruction on your prescription."),
        ("What should I watch for?",
         "Tell your doctor about raised blood sugar, mood changes, or signs of infection, and mention steroid use to any clinician who treats you."),
        ("Are inhaled or topical steroids the same?",
         "No. They act mainly where applied and carry different considerations from steroid tablets."),
    ]),

"vaccines": dict(
    blurb="Vaccines used for preventive protection",
    intro="Vaccines used for preventive protection. Most require cold-chain storage and administration by a healthcare professional.",
    what="Vaccines are used to build protection against specific infections. Nearly all require unbroken cold-chain storage and must be administered by a trained healthcare professional.",
    note="A vaccine that has not been kept within its temperature range may not work, and there is no way to tell by looking at it. This is why cold-chain handling is treated as strictly as the dose itself.",
    caution="Vaccines must stay within their specified temperature range and be administered by a healthcare professional.",
    faq=[
        ("Do vaccines need special storage?",
         "Most do. They require unbroken cold-chain storage, and a vaccine kept outside its temperature range may not work."),
        ("Can I administer a vaccine myself?",
         "No. Vaccines should be administered by a trained healthcare professional who can manage any immediate reaction."),
        ("Do I need more than one dose?",
         "Many vaccines are given as a schedule of doses. Your doctor will explain the schedule for yours."),
        ("What should I do about a reaction?",
         "Mild soreness or fever is common. Contact your doctor about anything severe or unexpected."),
    ]),

"antifungal-medicines": dict(
    blurb="Medicines used for fungal infections",
    intro="Medicines used in the management of fungal infections of the skin, nails and elsewhere, applied topically or taken by mouth.",
    what="Antifungal medicines are used for infections caused by fungi. Courses are typically longer than for bacterial infections, particularly for nail and scalp infections.",
    note="Fungal infections commonly return when treatment stops as soon as the skin looks normal. The course is usually set to run past the point where the appearance improves.",
    caution="Complete the full course even after the appearance improves, or the infection commonly returns.",
    faq=[
        ("Why is the course so long?",
         "Fungal infections clear slowly, particularly in nails and on the scalp. Courses are set to run past the point where the skin looks normal."),
        ("Can I stop when the skin looks better?",
         "No. Stopping early is the most common reason a fungal infection returns."),
        ("Are creams as effective as tablets?",
         "It depends on where the infection is and how deep. Your doctor will choose the appropriate form."),
        ("Can I use an antifungal on any rash?",
         "No. Not every rash is fungal, and an antifungal can worsen some conditions. Have it assessed."),
    ]),

"gout-medicines": dict(
    blurb="Medicines used in the management of gout",
    intro="Medicines used in the management of gout – both for acute attacks and for lowering uric acid over the longer term.",
    what="Gout medicines fall into two distinct roles: those used during an acute attack, and those taken continuously to lower uric acid levels. They are not interchangeable.",
    note="Uric-acid-lowering medicines can trigger an attack when first started, which is expected rather than a sign the medicine is wrong. Stopping at that point is a common mistake.",
    caution="Do not stop a uric-acid-lowering medicine during an attack unless your doctor tells you to.",
    faq=[
        ("What is the difference between the two types?",
         "One group is used during an acute attack; the other is taken continuously to lower uric acid over time. They have different roles and are not interchangeable."),
        ("Should I stop my long-term medicine during an attack?",
         "Usually not. Follow your doctor's advice – stopping can make things worse."),
        ("Why did an attack start after beginning treatment?",
         "This can happen when uric acid levels change, and it does not mean the medicine is wrong. Tell your doctor."),
        ("Does diet still matter?",
         "Yes. Diet and fluid intake remain part of managing gout alongside medicine."),
    ]),

"prostate-care-medicines": dict(
    blurb="Medicines used for prostate-related concerns",
    intro="Medicines used in the management of an enlarged prostate and related urinary symptoms.",
    what="These medicines are used in the management of benign prostatic hyperplasia. Some relax muscle to ease urinary flow and act within weeks; others shrink the prostate over months.",
    note="The two groups work on very different timescales – weeks versus months. Knowing which one you are on avoids judging it too early.",
    caution="Dizziness on standing is common when starting some of these. Keep the reviews your doctor has scheduled.",
    faq=[
        ("How long before these help?",
         "Some act within weeks; others work over several months. Your doctor will tell you which group yours is in."),
        ("Are there side effects to expect?",
         "Dizziness on standing is common with some. Stand up slowly at first and tell your doctor if it persists."),
        ("Do these affect prostate blood tests?",
         "Some can. Make sure any doctor arranging a PSA test knows what you take."),
        ("Do I still need check-ups?",
         "Yes. Symptoms should be reviewed periodically as your doctor advises."),
    ]),

"diuretics": dict(
    blurb="Medicines that help the body remove excess fluid",
    intro="Medicines used in the management of fluid retention and blood pressure by helping the body remove excess salt and water.",
    what="Diuretics help the body clear excess fluid and salt. They are used in blood pressure management, heart failure and other conditions where fluid builds up.",
    note="Because diuretics change the body's salt and water balance, they usually come with periodic blood tests. Those tests are how problems get caught before they cause symptoms.",
    caution="Keep the blood tests your doctor has scheduled, and report severe dizziness, cramps or unusual weakness.",
    faq=[
        ("When should I take a diuretic?",
         "Usually earlier in the day, so it does not disturb sleep. Follow the timing your doctor gave you."),
        ("Why do I need blood tests?",
         "Diuretics change salt and fluid balance, so levels are checked periodically to keep them in a safe range."),
        ("What should I report?",
         "Severe dizziness, muscle cramps, unusual weakness, or a rapid change in weight."),
        ("Should I drink less water?",
         "Not unless your doctor has told you to restrict fluids. Ask before changing what you drink."),
    ]),

"iron-and-anaemia-medicines": dict(
    blurb="Iron and other medicines used for anaemia",
    intro="Iron preparations and related medicines used in the management of anaemia, taken under medical advice.",
    what="These medicines are used in the management of anaemia, most often iron deficiency. Correcting the level takes months, and finding the cause of the deficiency matters as much as correcting it.",
    note="Anaemia is a finding rather than a diagnosis. Correcting the level without establishing why it dropped can leave the underlying cause unaddressed.",
    caution="Keep iron preparations away from children – iron overdose in children is a medical emergency.",
    faq=[
        ("How long will I need to take iron?",
         "Usually several months, because stores take time to rebuild. Your doctor will repeat blood tests to decide."),
        ("Does it matter what I take it with?",
         "Yes. Tea, coffee, calcium and some medicines reduce absorption. Ask your pharmacist about timing."),
        ("Why has my stool changed colour?",
         "Iron commonly darkens stool. This is expected, but mention any pain or bleeding to your doctor."),
        ("Should the cause be investigated?",
         "Usually yes. Anaemia is a finding, and your doctor will want to establish why it developed."),
    ]),

"muscle-relaxants": dict(
    blurb="Medicines used for muscle spasm and stiffness",
    intro="Medicines used in the management of muscle spasm and associated pain, generally for short periods.",
    what="Muscle relaxants are used in the management of muscle spasm, often alongside pain relief and physiotherapy. Most are intended for short courses.",
    note="These are usually prescribed as a short course alongside movement and physiotherapy – the medicine is meant to make the rest possible, not to substitute for it.",
    caution="Drowsiness is common. Do not drive or operate machinery until you know how these affect you.",
    faq=[
        ("Will these make me drowsy?",
         "Commonly yes. Avoid driving or operating machinery until you know how they affect you."),
        ("How long should I take them?",
         "Usually a short course. Extended use should be discussed with your doctor."),
        ("Can I take them with pain relief?",
         "Often they are prescribed together, but check with your doctor or pharmacist before combining anything."),
        ("Should I rest completely?",
         "Usually not. Gentle movement and physiotherapy are often part of recovery – ask your doctor."),
    ]),

"liver-care-medicines": dict(
    blurb="Medicines used for liver and gallbladder conditions",
    intro="Medicines used in the management of liver and gallbladder conditions, taken under medical supervision.",
    what="This class covers medicines used in the management of liver and gallbladder conditions. Because the liver processes most medicines, what else you take matters more than usual here.",
    note="The liver processes the majority of medicines, so anything you add – including supplements and over-the-counter products – should be checked with your doctor.",
    caution="Tell your doctor about every medicine, supplement and herbal product you take, and follow any advice about alcohol.",
    faq=[
        ("Why does my doctor want to know about supplements?",
         "The liver processes most medicines and supplements. Some herbal products can affect liver function, so your doctor needs the full list."),
        ("Do I need regular blood tests?",
         "Usually yes. Liver function is monitored so treatment can be adjusted."),
        ("Can I drink alcohol?",
         "Follow your doctor's advice. In many liver conditions alcohol is not recommended."),
        ("How long is treatment?",
         "It depends on the condition. Some are short courses; others are managed over years."),
    ]),

"migraine-medicines": dict(
    blurb="Medicines used in the management of migraine",
    intro="Medicines used in the management of migraine – both for treating an attack and for reducing how often attacks occur.",
    what="Migraine medicines fall into two roles: those taken during an attack, and those taken regularly to reduce how often attacks happen. Attack medicines generally work best taken early.",
    note="Taking attack medicines too often can itself cause more frequent headaches. If you are reaching for them most weeks, that is worth raising with your doctor.",
    caution="Frequent use of attack medicines can lead to medication-overuse headache. Tell your doctor how often you use them.",
    faq=[
        ("When should I take an attack medicine?",
         "Usually as early in the attack as possible. Follow the advice your doctor gave for your specific medicine."),
        ("What is a preventive medicine?",
         "One taken regularly to reduce how often attacks occur, rather than to treat one in progress."),
        ("Can taking these too often cause problems?",
         "Yes. Frequent use of attack medicines can lead to medication-overuse headache. Tell your doctor how often you use them."),
        ("Should I track my attacks?",
         "It helps. A record of frequency and triggers makes it easier for your doctor to adjust treatment."),
    ]),

"antiviral-medicines": dict(
    blurb="Medicines used for certain viral infections",
    intro="Medicines used in the management of specific viral infections, including hepatitis B and HIV.",
    what="Antiviral medicines act on specific viruses. They are targeted to the infection being managed and, for long-term conditions, depend heavily on doses being taken consistently.",
    note="For long-term antiviral treatment, consistency is the main thing that determines whether it works. Missed doses can allow resistance to develop.",
    caution="Take doses consistently – missed doses can allow resistance to develop. Do not stop without medical advice.",
    faq=[
        ("Do antivirals work on any virus?",
         "No. Each acts on specific viruses. They have no effect on common colds."),
        ("Why does consistency matter so much?",
         "For long-term antiviral treatment, missed doses can allow the virus to become resistant. Take doses as prescribed."),
        ("Can I stop when I feel well?",
         "No. Treatment length is set by your doctor, and feeling well does not mean treatment is complete."),
        ("Do these need monitoring?",
         "Usually yes. Blood tests check both the response and how well the medicine is tolerated."),
    ]),
}

# ---------------------------------------------------------------------------
# copy shared by every class page and by the directory hub
# ---------------------------------------------------------------------------
SAFETY_COMMON = [
    "**Do not self-medicate.** Use medicines only as advised by a qualified doctor.",
    "**Check the strength and dosage form** on your prescription before ordering.",
    "**Tell your doctor about allergies** and about every other medicine or supplement you take.",
    "**Do not stop a prescribed medicine** without medical advice, even if you feel better.",
]

GENERIC_FAQ = [
    ("Do I need a prescription for these medicines?",
     "Many medicines in this class are prescription-only. Where a prescription is required, you will be asked to upload a valid prescription before the order is confirmed."),
    ("Can two medicines from this class be used interchangeably?",
     "Not necessarily. Medicines in the same class can differ in composition, strength and suitability. Only your doctor or pharmacist can decide whether one may be used in place of another."),
]

HUB = dict(
    meta_title="Medicines by Class - Browse All Drug Classes | PharmEasy",
    meta_description="Browse medicines by their therapeutic or drug class. Select a class to explore related medicines, their uses and important information.",
    intro="Browse medicines by their therapeutic or drug class. Select a class to explore related medicines, their uses and important information.",
    what_heading="What Are Medicine Classes?",
    what_md=("A medicine class is a group of medicines that are considered together for a practical reason – they may be "
             "used for a similar therapeutic purpose, they may be prescribed for a similar clinical situation, or they may "
             "act on the body in a similar way. Grouping medicines this way makes a large catalogue easier to navigate: "
             "instead of remembering one brand name, you can start from the area of health you are looking at.\n\n"
             "Classes are a browsing aid on this page. They are not a recommendation, and a class page does not tell you "
             "which medicine is suitable for you."),
    diff_heading="Why Medicines in the Same Class Can Be Different",
    diff_md=("Two medicines can sit in the same class and still not be alternatives to each other. They may differ in "
             "composition, strength, dosage form, suitability and prescription requirement."),
    how_heading="How to Browse Medicines by Class",
    how_md=("1. **Find the class** – Search by name, or jump to a letter in the A–Z filter.\n"
            "2. **Open the class page** – See the medicines listed under it, with pack size, composition and price.\n"
            "3. **Check the details** – Read the information provided and confirm with your doctor before ordering."),
    faqs=[
        ("What is a medicine or drug class?",
         "A medicine class is a group of medicines considered together because they share a therapeutic use, a clinical purpose, or a similar way of acting in the body. It is a way of organising a large catalogue so it is easier to browse."),
        ("Can two medicines from the same class be used interchangeably?",
         "Not necessarily. Medicines in the same class can differ in composition, strength and suitability. Only your doctor or pharmacist can decide whether one medicine may be used in place of another."),
        ("How can I find a medicine class?",
         "Use the search field at the top of this page, or pick a letter in the A–Z filter and open the class from the alphabetical list."),
        ("Do all medicines in a class have the same composition?",
         "No. A class may contain several different active ingredients, and the same ingredient may be available in different strengths and dosage forms."),
        ("Do I need a prescription to purchase these medicines?",
         "Many medicines listed under these classes are prescription-only. Where a prescription is required, you will be asked to upload a valid prescription before the order is confirmed."),
        ("Can I change my medicine without consulting a doctor?",
         "No. Do not start, stop, substitute or change the dose of a prescribed medicine without advice from a qualified healthcare professional."),
    ],
)


# ---------------------------------------------------------------------------
# Everyday condition / symptom words -> class. People search "fever", not
# "Analgesic". These land in the `conditions` column of the classes tab and
# feed both the directory search and the "best match" banner.
# Only classes that actually publish are listed.
# ---------------------------------------------------------------------------
CONDITIONS = {
"pain-relief-medicines": "fever|temperature|body pain|body ache|headache|back pain|toothache|joint pain|sprain|inflammation|pain|muscle ache|period pain",
"cough-and-cold-medicines": "cold|common cold|cough|sore throat|throat pain|blocked nose|runny nose|sneezing|congestion|flu|throat infection",
"gastrointestinal-medicines": "acidity|acid reflux|heartburn|gas|gastric|indigestion|constipation|loose motion|diarrhoea|diarrhea|vomiting|nausea|stomach pain|ulcer|piles|bloating|motion",
"anti-diabetic-medicines": "diabetes|sugar|blood sugar|high sugar|diabetic|sugar control",
"blood-pressure-medicines": "bp|blood pressure|high bp|hypertension|high blood pressure|low bp",
"cholesterol-medicines": "cholesterol|high cholesterol|lipid|triglycerides|fat in blood",
"cardiac-medicines": "heart|heart problem|chest pain|angina|heart failure|palpitation|cardiac",
"antibiotics": "infection|bacterial infection|uti|urine infection|wound infection|throat infection|antibiotic",
"anti-allergic-medicines": "allergy|allergic|itching|rash|hives|skin allergy|dust allergy|watery eyes",
"respiratory-medicines": "asthma|breathing problem|breathlessness|wheezing|copd|shortness of breath|inhaler",
"mental-health-medicines": "depression|anxiety|stress|panic|bipolar|schizophrenia|ocd|mental health|mood|insomnia|sleeplessness|sleep",
"neurological-medicines": "epilepsy|seizure|fits|parkinson|alzheimer|dementia|vertigo|giddiness|memory loss|convulsion",
"nerve-pain-medicines": "nerve pain|numbness|tingling|neuropathy|burning feet|diabetic nerve pain",
"migraine-medicines": "migraine|severe headache|half headache",
"cancer-medicines": "cancer|tumour|tumor|chemotherapy|oncology|carcinoma",
"dermatology-medicines": "acne|pimples|dandruff|hair fall|hair loss|fungal infection|ringworm|eczema|psoriasis|melasma|dark spots|skin|scalp|baldness",
"antifungal-medicines": "fungal|ringworm|athletes foot|nail fungus|fungal infection|itching between toes",
"bone-and-joint-medicines": "arthritis|knee pain|osteoporosis|bone weakness|joint stiffness|rheumatoid|osteoarthritis|bone",
"gout-medicines": "gout|uric acid|high uric acid|toe pain",
"muscle-relaxants": "muscle pain|muscle spasm|cramps|stiffness|spasm|neck stiffness",
"weight-management-medicines": "weight loss|obesity|overweight|weight|fat loss",
"iron-and-anaemia-medicines": "anaemia|anemia|low haemoglobin|low hemoglobin|iron deficiency|weakness|low blood",
"vitamins-and-supplements": "vitamin deficiency|immunity|calcium|vitamin d|vitamin b12|multivitamin|supplement|weakness|nutrition",
"womens-health-medicines": "pregnancy|periods|irregular periods|pcod|pcos|menopause|infertility|hormonal|white discharge|conceive",
"mens-health-medicines": "erectile dysfunction|ed|sexual wellness|libido|performance|mens health|premature",
"prostate-care-medicines": "prostate|urine problem|frequent urination|enlarged prostate|difficulty passing urine",
"liver-care-medicines": "liver|fatty liver|jaundice|gallstone|liver problem|hepatitis",
"diuretics": "swelling|water retention|oedema|edema|fluid retention|puffiness",
"blood-thinners": "blood thinner|clot|blood clot|stroke prevention|dvt",
"antiviral-medicines": "viral|viral infection|hiv|hepatitis b|antiviral",
"vaccines": "vaccine|vaccination|immunisation|immunization|shot",
"steroids": "steroid|severe inflammation|autoimmune|swelling",
}
