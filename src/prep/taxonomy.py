# -*- coding: utf-8 -*-
"""
Taxonomy: maps the catalogue's raw clinical `therapy` tags onto consumer-facing
medicine classes, and molecule names onto pharmacological sub-classes.

This is the only opinionated file in the pipeline. Everything downstream is
mechanical. Edit here (or in the published Google Sheet) to reshape the site.
"""

# ---------------------------------------------------------------------------
# raw `therapy` tag  ->  consumer class name
# ---------------------------------------------------------------------------
TAG_TO_CLASS = {
    # --- metabolic ---------------------------------------------------------
    "ANTI-DIABETIC": "Anti-diabetic Medicines",
    "DRUGS FOR DIABETIC NEUROPATHY": "Anti-diabetic Medicines",
    "ANTI-OBESITY": "Weight Management Medicines",

    # --- cardiovascular ----------------------------------------------------
    "ANTI-HYPERTENSIVE": "Blood Pressure Medicines",
    "ANTI-HYPOTENSIVE": "Blood Pressure Medicines",
    "HYPOLIPIDEMIC DRUGS": "Cholesterol Medicines",
    "ANTI-PLATELET AND HYPOLIPIDEMIC DRUGS": "Cholesterol Medicines",
    "ANTI-ANGINAL": "Cardiac Medicines",
    "DRUGS FOR CONGESTIVE HEART FAILURE": "Cardiac Medicines",
    "VASODILATING AGENT": "Cardiac Medicines",
    "DRUGS FOR PERIPHERAL VASCULAR DISEASE": "Cardiac Medicines",
    "DRUGS FOR VARICOSE VEINS": "Cardiac Medicines",
    "ANTI-PLATELET": "Blood Thinners",
    "ANTI-COAGULANT": "Blood Thinners",
    "ANTI-FIBRINOLYTIC": "Blood Thinners",
    "HAEMOSTATICS": "Blood Thinners",
    "DIURETIC": "Diuretics",

    # --- oncology ----------------------------------------------------------
    "ANTI-NEOPLASTIC": "Cancer Medicines",
    "ONCO SUPPORTIVE": "Cancer Medicines",
    "DRUGS FOR NEUTROPENIA": "Cancer Medicines",

    # --- infection ---------------------------------------------------------
    "ANTIBIOTIC": "Antibiotics",
    "TOPICAL ANTIBIOTIC": "Antibiotics",
    "ANTISEPTIC": "Antibiotics",
    "URINARY ANTISEPTIC": "Antibiotics",
    "OTIC ANTIMICROBIAL": "Antibiotics",
    "TOPICAL ANTI-MICROBIAL": "Antibiotics",
    "ANTI-FUNGAL": "Antifungal Medicines",
    "TOPICAL ANTI-FUNGAL": "Antifungal Medicines",
    "TOPICAL ANTI-FUNGAL AND STEROID": "Antifungal Medicines",
    "ANTIVIRAL": "Antiviral Medicines",
    "ANTI-RETROVIRAL": "Antiviral Medicines",
    "DRUGS FOR HEPATITIS B": "Antiviral Medicines",
    "ANTI-TUBERCULAR": "Tuberculosis Medicines",
    "DRUGS FOR LEPRA REACTION": "Tuberculosis Medicines",
    "ANTI-MALARIAL": "Antiparasitic Medicines",
    "ANTI-AMOEBIC": "Antiparasitic Medicines",
    "ANTI-AMOEBIC AND ANTI-DIARRHOEAL": "Antiparasitic Medicines",
    "ANTHELMINTIC": "Antiparasitic Medicines",
    "ANTI-SCABIES": "Antiparasitic Medicines",
    "VACCINE": "Vaccines",

    # --- neuro / psych -----------------------------------------------------
    "ANTI-DEPRESSANT": "Mental Health Medicines",
    "ANTI-ANXIETY": "Mental Health Medicines",
    "ANTI-ANXIETY AND ANTI-DEPRESSANT": "Mental Health Medicines",
    "ANTI-PSYCHOTICS": "Mental Health Medicines",
    "ANTI-MANIAC": "Mental Health Medicines",
    "HYPNOTIC": "Sleep Aid Medicines",
    "DRUGS FOR NARCOLEPSY": "Sleep Aid Medicines",
    "DEADDICTION": "Mental Health Medicines",
    "ANTI-EPILEPTIC": "Neurological Medicines",
    "ANTI-PARKINSONIAN": "Neurological Medicines",
    "DRUGS FOR ALZHEIMER DISEASE": "Neurological Medicines",
    "CEREBRO PROTECTIVE": "Neurological Medicines",
    "ANTI-VERTIGO": "Neurological Medicines",
    "DRUGS FOR MULTIPLE SCLEROSIS": "Neurological Medicines",
    "DRUGS FOR MYASTHENIA GRAVIS": "Neurological Medicines",
    "DRUGS FOR PERIPHERAL NEUROPATHY": "Nerve Pain Medicines",
    "DRUG FOR PERIPHERAL NEUROPATHY": "Nerve Pain Medicines",
    "MIGRAINE DRUGS": "Migraine Medicines",

    # --- pain / musculoskeletal -------------------------------------------
    "ANALGESIC/ANTIPYRETIC": "Pain Relief Medicines",
    "ANALGESIC": "Pain Relief Medicines",
    "ANTI-INFLAMMATORY": "Pain Relief Medicines",
    "TOPICAL ANALGESIC": "Pain Relief Medicines",
    "MUSCLE RELAXANT": "Muscle Relaxants",
    "DRUGS FOR OSTEOARTHRITIS": "Bone and Joint Medicines",
    "DRUGS FOR OSTEOPOROSIS": "Bone and Joint Medicines",
    "DRUGS FOR RHEUMATOID ARTHRITIS": "Bone and Joint Medicines",
    "ANTI-GOUT": "Gout Medicines",
    "LOCAL ANAESTHETIC": "Local Anaesthetics",
    "DRUGS FOR APHTHOUS ULCERS": "Local Anaesthetics",

    # --- respiratory / ENT -------------------------------------------------
    "ANTI-ASTHMATIC": "Respiratory Medicines",
    "DRUGS FOR CHRONIC OBSTRUCTIVE PULMONARY DISEASE": "Respiratory Medicines",
    "COUGH COLD PREPARATION": "Cough and Cold Medicines",
    "ANTI-ALLERGIC": "Anti-allergic Medicines",

    # --- gastrointestinal --------------------------------------------------
    "ANTACID": "Gastrointestinal Medicines",
    "ANTACID AND ANTI-EMETIC": "Gastrointestinal Medicines",
    "ANTACID AND ANTI-REFLUX": "Gastrointestinal Medicines",
    "ANTACID AND ANTI-FLATULENT": "Gastrointestinal Medicines",
    "ANTI-EMETIC": "Gastrointestinal Medicines",
    "ANTI-DIARRHOEAL": "Gastrointestinal Medicines",
    "ANTI-SPASMODICS": "Gastrointestinal Medicines",
    "DIGESTANTS": "Gastrointestinal Medicines",
    "ANTI-FLATULENT": "Gastrointestinal Medicines",
    "ANTI-FLATULENT AND DIGESTANTS": "Gastrointestinal Medicines",
    "LAXATIVE": "Gastrointestinal Medicines",
    "PREBIOTIC AND PROBIOTIC": "Gastrointestinal Medicines",
    "DRUGS FOR ULCERATIVE COLITIS": "Gastrointestinal Medicines",
    "DRUGS FOR PILES": "Gastrointestinal Medicines",
    "DRUG FOR ANAL FISSURE": "Gastrointestinal Medicines",
    "APPETITE STIMULANT": "Gastrointestinal Medicines",

    # --- hepatic / renal ---------------------------------------------------
    "DRUGS FOR CHOLELITHIASIS": "Liver Care Medicines",
    "HEPATOPROTECTIVE": "Liver Care Medicines",
    "DRUG FOR CHRONIC KIDNEY DISEASE": "Kidney and Urology Medicines",
    "DRUGS FOR RENAL CALCULI": "Kidney and Urology Medicines",
    "DRUGS FOR URINARY INCONTINENCE": "Kidney and Urology Medicines",

    # --- endocrine / hormonal ---------------------------------------------
    "DRUGS FOR HYPOTHYROIDISM": "Thyroid Medicines",
    "STEROID": "Steroids",
    "TOPICAL STEROID": "Steroids",
    "TOPICAL ANTIMICROBIAL AND STEROID": "Dermatology Medicines",
    "TOPICAL ANTIBIOTIC AND STEROID": "Dermatology Medicines",
    "OCCULAR ANTIBIOTIC AND STEROID": "Eye and Ear Medicines",
    "HORMONE REPLACEMENT THERAPY": "Women's Health Medicines",
    "FEMALE HORMONE PILLS": "Women's Health Medicines",
    "DRUGS FOR FEMALE INFERTILITY": "Women's Health Medicines",
    "DRUGS FOR INFERTILITY": "Women's Health Medicines",
    "DRUGS FOR MENSTRUAL AND GYNAECOLOGICAL DISORDERS": "Women's Health Medicines",
    "DRUGS FOR POLYCYSTIC OVARIAN DISEASE": "Women's Health Medicines",
    "DRUGS FOR HYPERPROLACTINEMIA": "Women's Health Medicines",
    "PREGNANCY CARE": "Women's Health Medicines",
    "DRUGS FOR PREMATURE LABOUR PREVENTION": "Women's Health Medicines",
    "DRUGS FOR BENIGN PROSTATIC HYPERPLASIA": "Prostate Care Medicines",
    "SEXUAL WELLNESS": "Men's Health Medicines",
    "DRUGS FOR ERECTILE DYSFUNCTION": "Men's Health Medicines",

    # --- dermatology -------------------------------------------------------
    "ANTI-ACNE": "Dermatology Medicines",
    "ANTI-DANDRUFF": "Dermatology Medicines",
    "DRUGS FOR MELASMA": "Dermatology Medicines",
    "DRUGS FOR ALOPECIA": "Dermatology Medicines",
    "DRUGS FOR PSORIASIS": "Dermatology Medicines",
    "DRUGS FOR ATOPIC DERMATITIS": "Dermatology Medicines",
    "DRUGS FOR BURNS AND WOUND INFECTION": "Dermatology Medicines",
    "SKIN CARE": "Dermatology Medicines",
    "HAIR CARE": "Dermatology Medicines",

    # --- eye / ear ---------------------------------------------------------
    "OCCULAR LUBRICANT": "Eye and Ear Medicines",
    "DRUGS FOR EAR WAX": "Eye and Ear Medicines",

    # --- blood / immune ----------------------------------------------------
    "HAEMATINICS": "Iron and Anaemia Medicines",
    "DRUGS FOR SICKLE CELL ANAEMIA": "Iron and Anaemia Medicines",
    "IMMUNOSUPPRESSANT": "Immunosuppressants",

    # --- nutrition ---------------------------------------------------------
    "VITAMIN": "Vitamins and Supplements",
    "MULTIVITAMIN": "Vitamins and Supplements",
    "CALCIUM AND VITAMIN D SUPPLEMENTATION": "Vitamins and Supplements",
    "NUTRITIONAL SUPPLEMENT": "Vitamins and Supplements",
    "ANTIOXIDANT": "Vitamins and Supplements",
    "ELECTROLYTES": "Vitamins and Supplements",
    "HAIR CARE SUPPLEMENT": "Vitamins and Supplements",
    "AYURVEDIC": "Vitamins and Supplements",
}

# ---------------------------------------------------------------------------
# molecule keyword -> pharmacological sub-class.
# Only used for classes built from a single therapy tag, where the tag itself
# gives no sub-structure. First match wins; multi-molecule products that hit
# more than one bucket become "Combinations".
# ---------------------------------------------------------------------------
MOLECULE_SUBCLASS = {
    "Anti-diabetic Medicines": [
        (["METFORMIN"], "Biguanides"),
        (["GLIMEPIRIDE", "GLICLAZIDE", "GLIPIZIDE", "GLIBENCLAMIDE"], "Sulfonylureas"),
        (["GLIPTIN"], "DPP-4 inhibitors"),
        (["GLIFLOZIN"], "SGLT2 inhibitors"),
        (["PIOGLITAZONE"], "Thiazolidinediones"),
        (["VOGLIBOSE", "ACARBOSE", "MIGLITOL"], "Alpha-glucosidase inhibitors"),
        (["INSULIN"], "Insulins"),
        (["TIRZEPATIDE", "SEMAGLUTIDE", "LIRAGLUTIDE", "DULAGLUTIDE", "EXENATIDE"], "GLP-1 receptor agonists"),
        (["REPAGLINIDE", "NATEGLINIDE"], "Meglitinides"),
    ],
    "Blood Pressure Medicines": [
        (["SARTAN"], "Angiotensin receptor blockers"),
        (["PRIL"], "ACE inhibitors"),
        (["AMLODIPINE", "CILNIDIPINE", "NIFEDIPINE", "DIPINE"], "Calcium channel blockers"),
        (["METOPROLOL", "ATENOLOL", "BISOPROLOL", "CARVEDILOL", "NEBIVOLOL", "OLOL"], "Beta blockers"),
        (["CHLORTHALIDONE", "HYDROCHLOROTHIAZIDE", "INDAPAMIDE", "TORSEMIDE", "FUROSEMIDE"], "Diuretic combinations"),
        (["PRAZOSIN", "TERAZOSIN", "DOXAZOSIN"], "Alpha blockers"),
        (["CLONIDINE", "METHYLDOPA"], "Centrally acting agents"),
    ],
    "Cholesterol Medicines": [
        (["STATIN"], "Statins"),
        (["FENOFIBRATE", "GEMFIBROZIL"], "Fibrates"),
        (["EZETIMIBE"], "Cholesterol absorption inhibitors"),
        (["OMEGA", "FISH OIL"], "Omega-3 preparations"),
        (["NICOTINIC ACID", "NIACIN"], "Niacin preparations"),
    ],
    "Mental Health Medicines": [
        (["SERTRALINE", "FLUOXETINE", "ESCITALOPRAM", "CITALOPRAM", "PAROXETINE", "FLUVOXAMINE"], "SSRIs"),
        (["VENLAFAXINE", "DESVENLAFAXINE", "DULOXETINE", "MILNACIPRAN"], "SNRIs"),
        (["AMITRIPTYLINE", "IMIPRAMINE", "NORTRIPTYLINE", "DOSULEPIN"], "Tricyclic antidepressants"),
        (["ALPRAZOLAM", "CLONAZEPAM", "LORAZEPAM", "DIAZEPAM", "ETIZOLAM"], "Benzodiazepines"),
        (["OLANZAPINE", "RISPERIDONE", "QUETIAPINE", "ARIPIPRAZOLE", "AMISULPRIDE", "CLOZAPINE"], "Atypical antipsychotics"),
        (["LITHIUM", "VALPROATE", "DIVALPROEX", "LAMOTRIGINE"], "Mood stabilisers"),
        (["BUPROPION", "MIRTAZAPINE", "VORTIOXETINE", "TRAZODONE"], "Other antidepressants"),
    ],
    "Antibiotics": [
        (["CILLIN", "AMOXY", "AMOXICILLIN"], "Penicillins"),
        (["CEF", "CEPHALEXIN"], "Cephalosporins"),
        (["AZITHROMYCIN", "CLARITHROMYCIN", "ERYTHROMYCIN", "ROXITHROMYCIN"], "Macrolides"),
        (["FLOXACIN"], "Fluoroquinolones"),
        (["DOXYCYCLINE", "MINOCYCLINE", "TETRACYCLINE"], "Tetracyclines"),
        (["METRONIDAZOLE", "TINIDAZOLE", "ORNIDAZOLE", "SECNIDAZOLE"], "Nitroimidazoles"),
        (["LINEZOLID", "VANCOMYCIN", "TEICOPLANIN"], "Anti-MRSA agents"),
        (["MEROPENEM", "IMIPENEM", "ERTAPENEM"], "Carbapenems"),
    ],
    "Cancer Medicines": [
        (["MAB"], "Monoclonal antibodies"),
        (["TINIB", "CICLIB"], "Targeted kinase inhibitors"),
        (["CAPECITABINE", "FLUOROURACIL", "GEMCITABINE", "METHOTREXATE", "PEMETREXED", "CYTARABINE"], "Antimetabolites"),
        (["PACLITAXEL", "DOCETAXEL", "VINCRISTINE", "VINBLASTINE", "ETOPOSIDE"], "Mitotic inhibitors"),
        (["CISPLATIN", "CARBOPLATIN", "OXALIPLATIN", "CYCLOPHOSPHAMIDE", "IFOSFAMIDE"], "Alkylating and platinum agents"),
        (["ANASTROZOLE", "LETROZOLE", "TAMOXIFEN", "BICALUTAMIDE", "ABIRATERONE", "ENZALUTAMIDE"], "Hormonal therapies"),
        (["DOXORUBICIN", "EPIRUBICIN", "BLEOMYCIN", "MITOMYCIN"], "Anti-tumour antibiotics"),
    ],
    "Respiratory Medicines": [
        (["BUDESONIDE", "FLUTICASONE", "CICLESONIDE", "BECLOMETHASONE"], "Inhaled corticosteroids"),
        (["SALBUTAMOL", "LEVOSALBUTAMOL", "FORMOTEROL", "SALMETEROL", "INDACATEROL"], "Beta-2 agonists"),
        (["TIOTROPIUM", "IPRATROPIUM", "GLYCOPYRRONIUM", "UMECLIDINIUM"], "Anticholinergics"),
        (["MONTELUKAST", "ZAFIRLUKAST"], "Leukotriene antagonists"),
        (["THEOPHYLLINE", "DOXOFYLLINE", "ETOFYLLINE", "ACEBROPHYLLINE"], "Xanthines"),
    ],
    "Gout Medicines": [
        (["FEBUXOSTAT", "ALLOPURINOL"], "Xanthine oxidase inhibitors"),
        (["COLCHICINE"], "Anti-inflammatory agents"),
        (["PROBENECID"], "Uricosurics"),
    ],
    "Thyroid Medicines": [
        (["THYROXINE", "LEVOTHYROXINE", "LIOTHYRONINE"], "Thyroid hormone replacement"),
        (["CARBIMAZOLE", "METHIMAZOLE", "PROPYLTHIOURACIL"], "Antithyroid agents"),
    ],
    "Weight Management Medicines": [
        (["TIRZEPATIDE", "SEMAGLUTIDE", "LIRAGLUTIDE"], "GLP-1 receptor agonists"),
        (["ORLISTAT"], "Lipase inhibitors"),
    ],
}

# consumer class -> icon key used by the page builder
CLASS_ICON = {
    "Anti-diabetic Medicines": "droplet",
    "Blood Pressure Medicines": "pulse",
    "Cardiac Medicines": "heart",
    "Cholesterol Medicines": "trend",
    "Blood Thinners": "drop-slash",
    "Diuretics": "kidney",
    "Cancer Medicines": "ribbon",
    "Antibiotics": "shield",
    "Antifungal Medicines": "spore",
    "Antiviral Medicines": "virus",
    "Antiparasitic Medicines": "virus",
    "Tuberculosis Medicines": "lungs",
    "Vaccines": "syringe",
    "Mental Health Medicines": "brain",
    "Sleep Aid Medicines": "moon",
    "Neurological Medicines": "brain",
    "Nerve Pain Medicines": "nerve",
    "Migraine Medicines": "head",
    "Pain Relief Medicines": "capsule",
    "Muscle Relaxants": "muscle",
    "Bone and Joint Medicines": "bone",
    "Gout Medicines": "joint",
    "Local Anaesthetics": "numb",
    "Respiratory Medicines": "lungs",
    "Cough and Cold Medicines": "syrup",
    "Anti-allergic Medicines": "allergy",
    "Gastrointestinal Medicines": "stomach",
    "Liver Care Medicines": "liver",
    "Kidney and Urology Medicines": "kidney",
    "Thyroid Medicines": "thyroid",
    "Steroids": "vial",
    "Women's Health Medicines": "female",
    "Men's Health Medicines": "male",
    "Prostate Care Medicines": "male",
    "Dermatology Medicines": "skin",
    "Eye and Ear Medicines": "eye",
    "Iron and Anaemia Medicines": "blood",
    "Immunosuppressants": "shield-half",
    "Vitamins and Supplements": "star",
    "Weight Management Medicines": "scale",
}

# classes surfaced in the "Popular medicine classes" grid, in order
POPULAR = [
    "Anti-diabetic Medicines",
    "Blood Pressure Medicines",
    "Pain Relief Medicines",
    "Antibiotics",
    "Cardiac Medicines",
    "Thyroid Medicines",
    "Cholesterol Medicines",
    "Gastrointestinal Medicines",
    "Respiratory Medicines",
    "Dermatology Medicines",
    "Mental Health Medicines",
    "Vitamins and Supplements",
]

# a class needs at least this many live products to get its own indexable page
MIN_PRODUCTS_FOR_PAGE = 8


# ---------------------------------------------------------------------------
# Design-v2: each class carries a category, which drives the pastel tile tint
# and the eyebrow on the directory cards. Categories + tints come from CATS in
# the design file; "Cancer care" is added because the design had no oncology
# category and mis-filing 219 products would have been worse.
# ---------------------------------------------------------------------------
CLASS_CATEGORY = {
    "Anti-diabetic Medicines": "Diabetes care",
    "Blood Pressure Medicines": "Heart health",
    "Cardiac Medicines": "Heart health",
    "Cholesterol Medicines": "Heart health",
    "Blood Thinners": "Blood health",
    "Iron and Anaemia Medicines": "Blood health",
    "Diuretics": "Kidney care",
    "Cancer Medicines": "Cancer care",
    "Antibiotics": "Infection care",
    "Antifungal Medicines": "Infection care",
    "Antiviral Medicines": "Infection care",
    "Vaccines": "Immunity care",
    "Mental Health Medicines": "Mental wellness",
    "Neurological Medicines": "Neurology care",
    "Nerve Pain Medicines": "Neurology care",
    "Migraine Medicines": "Neurology care",
    "Pain Relief Medicines": "Pain care",
    "Muscle Relaxants": "Pain care",
    "Bone and Joint Medicines": "Bone health",
    "Gout Medicines": "Bone health",
    "Respiratory Medicines": "Respiratory care",
    "Cough and Cold Medicines": "Respiratory care",
    "Anti-allergic Medicines": "Allergy care",
    "Gastrointestinal Medicines": "Digestive care",
    "Liver Care Medicines": "Liver care",
    "Steroids": "Hormone care",
    "Women's Health Medicines": "Women's health",
    "Men's Health Medicines": "Men's health",
    "Prostate Care Medicines": "Men's health",
    "Dermatology Medicines": "Skin care",
    "Vitamins and Supplements": "Nutrition",
    "Weight Management Medicines": "Nutrition",
}
