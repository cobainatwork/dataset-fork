export const QUESTION_TYPES = [
  { value: 'true_false', label: 'eval.questionTypes.true_false', labelZh: '判斷題' },
  { value: 'single_choice', label: 'eval.questionTypes.single_choice', labelZh: '單選題' },
  { value: 'multiple_choice', label: 'eval.questionTypes.multiple_choice', labelZh: '多選題' },
  { value: 'short_answer', label: 'eval.questionTypes.short_answer', labelZh: '短答案題' },
  { value: 'open_ended', label: 'eval.questionTypes.open_ended', labelZh: '開放式問題' }
];

export const FORMAT_PREVIEW = {
  true_false: {
    fields: ['question', 'correctAnswer'],
    example: {
      question: 'Artificial Intelligence is a branch of computer science',
      correctAnswer: '✅ or ❌'
    },
    description: 'correctAnswer must be "✅" (correct) or "❌" (incorrect)'
  },
  single_choice: {
    fields: ['question', 'options', 'correctAnswer'],
    example: {
      question: 'Which of the following is a core feature of deep learning?',
      options: '["Option A", "Option B", "Option C", "Option D"]',
      correctAnswer: 'B'
    },
    description: 'options is an array of options, correctAnswer is the letter of the correct option (A/B/C/D)'
  },
  multiple_choice: {
    fields: ['question', 'options', 'correctAnswer'],
    example: {
      question: 'Which of the following are commonly used deep learning frameworks?',
      options: '["TensorFlow", "PyTorch", "Excel", "Keras"]',
      correctAnswer: '["A", "B", "D"]'
    },
    description: 'options is an array of options, correctAnswer is an array of correct option letters'
  },
  short_answer: {
    fields: ['question', 'correctAnswer'],
    example: {
      question: 'What is the typical model structure used in deep learning?',
      correctAnswer: 'Neural Network'
    },
    description: 'correctAnswer is a short standard answer'
  },
  open_ended: {
    fields: ['question', 'correctAnswer'],
    example: {
      question: 'Analyze the main reasons for the success of deep learning in computer vision.',
      correctAnswer: 'Reference answer content...'
    },
    description: 'correctAnswer is a reference answer (can be long)'
  }
};

// 獲取 JSON 模板資料
export const getJsonTemplateData = type => {
  switch (type) {
    case 'true_false':
      return [
        { question: 'Artificial Intelligence is a branch of computer science', correctAnswer: '✅' },
        { question: 'Deep learning does not require large amounts of data for training', correctAnswer: '❌' }
      ];
    case 'single_choice':
      return [
        {
          question: 'What is the core feature of deep learning?',
          options: [
            'Requires manual feature engineering',
            'Automatic feature learning',
            'Only handles structured data',
            'Does not need large amounts of data'
          ],
          correctAnswer: 'B'
        },
        {
          question: 'Which of the following is a commonly used deep learning framework?',
          options: ['Excel', 'Word', 'TensorFlow', 'PowerPoint'],
          correctAnswer: 'C'
        }
      ];
    case 'multiple_choice':
      return [
        {
          question: 'Which of the following are commonly used deep learning frameworks?',
          options: ['TensorFlow', 'PyTorch', 'Excel', 'Keras', 'Word'],
          correctAnswer: ['A', 'B', 'D']
        },
        {
          question: 'Which of the following are main types of machine learning?',
          options: ['Supervised Learning', 'Unsupervised Learning', 'Reinforcement Learning', 'Manual Learning'],
          correctAnswer: ['A', 'B', 'C']
        }
      ];
    case 'short_answer':
      return [
        { question: 'What is the typical model structure used in deep learning?', correctAnswer: 'Neural Network' },
        { question: 'What is the maximum sample size mentioned in the text?', correctAnswer: '1000' }
      ];
    case 'open_ended':
      return [
        {
          question: 'Analyze the main reasons for the success of deep learning in computer vision.',
          correctAnswer:
            'The success of deep learning in computer vision can be explained from three dimensions: models, data, and computing power...'
        },
        {
          question: 'Explain the overfitting problem in machine learning and its solutions.',
          correctAnswer:
            'Overfitting refers to the phenomenon where a model performs well on training data but poorly on new data...'
        }
      ];
    default:
      return [];
  }
};

// 獲取 Excel 模板資料
export const getExcelTemplateData = type => {
  switch (type) {
    case 'true_false':
      return [
        { question: 'Artificial Intelligence is a branch of computer science', correctAnswer: '✅' },
        { question: 'Deep learning does not require large amounts of data for training', correctAnswer: '❌' }
      ];
    case 'single_choice':
      return [
        {
          question: 'What is the core feature of deep learning?',
          options: `["Requires manual feature engineering", "Automatic feature learning", "Only handles structured data", "Does not need large amounts of data"]`,
          correctAnswer: 'B'
        },
        {
          question: 'Which of the following is a commonly used deep learning framework?',
          options: `["Excel", "Word", "TensorFlow", "PowerPoint"]`,
          correctAnswer: 'C'
        }
      ];
    case 'multiple_choice':
      return [
        {
          question: 'Which of the following are commonly used deep learning frameworks?',
          options: `["TensorFlow", "PyTorch", "Excel", "Keras", "Word"]`,
          correctAnswer: `["A", "B", "D"]`
        },
        {
          question: 'Which of the following are main types of machine learning?',
          options: `["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "Manual Learning"]`,
          correctAnswer: `["A", "B", "C"]`
        }
      ];
    case 'short_answer':
      return [
        { question: 'What is the typical model structure used in deep learning?', correctAnswer: 'Neural Network' },
        { question: 'What is the maximum sample size mentioned in the text?', correctAnswer: '1000' }
      ];
    case 'open_ended':
      return [
        {
          question: 'Analyze the main reasons for the success of deep learning in computer vision.',
          correctAnswer:
            'The success of deep learning in computer vision can be explained from three dimensions: models, data, and computing power...'
        },
        {
          question: 'Explain the overfitting problem in machine learning and its solutions.',
          correctAnswer:
            'Overfitting refers to the phenomenon where a model performs well on training data but poorly on new data...'
        }
      ];
    default:
      return [];
  }
};

// 獲取列寬配置
export const getColumnWidths = type => {
  if (type === 'single_choice' || type === 'multiple_choice') {
    return [{ wch: 50 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 }];
  }
  return [{ wch: 60 }, { wch: 40 }];
};

export const DATA_SETS = [
  {
    zh: '生物學',
    en: 'Biology',
    file: 'mmlu-pro/biology.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '商業',
    en: 'Business',
    file: 'mmlu-pro/business.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '化學',
    en: 'Chemistry',
    file: 'mmlu-pro/chemistry.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '計算機科學',
    en: 'Computer Science',
    file: 'mmlu-pro/computer_science.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '經濟學',
    en: 'Economics',
    file: 'mmlu-pro/economics.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '工程學',
    en: 'Engineering',
    file: 'mmlu-pro/engineering.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '健康科學',
    en: 'Health',
    file: 'mmlu-pro/health.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '歷史',
    en: 'History',
    file: 'mmlu-pro/history.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '法律',
    en: 'Law',
    file: 'mmlu-pro/law.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '數學',
    en: 'Math',
    file: 'mmlu-pro/math.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '其他',
    en: 'Other',
    file: 'mmlu-pro/other.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '哲學',
    en: 'Philosophy',
    file: 'mmlu-pro/philosophy.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '物理',
    en: 'Physics',
    file: 'mmlu-pro/physics.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '心理學',
    en: 'Psychology',
    file: 'mmlu-pro/psychology.json',
    level: 'hard',
    type: 'single_choice'
  },
  {
    zh: '抽象代數',
    en: 'Abstract Algebra',
    file: 'mmlu/abstract_algebra_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '解剖學',
    en: 'Anatomy',
    file: 'mmlu/anatomy_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '天文學',
    en: 'Astronomy',
    file: 'mmlu/astronomy_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '商業倫理',
    en: 'Business Ethics',
    file: 'mmlu/business_ethics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '臨床知識',
    en: 'Clinical Knowledge',
    file: 'mmlu/clinical_knowledge_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '大學生物',
    en: 'College Biology',
    file: 'mmlu/college_biology_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '大學化學',
    en: 'College Chemistry',
    file: 'mmlu/college_chemistry_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '大學計算機科學',
    en: 'College Computer Science',
    file: 'mmlu/college_computer_science_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '大學數學',
    en: 'College Mathematics',
    file: 'mmlu/college_mathematics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '大學醫學',
    en: 'College Medicine',
    file: 'mmlu/college_medicine_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '大學物理',
    en: 'College Physics',
    file: 'mmlu/college_physics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '計算機安全',
    en: 'Computer Security',
    file: 'mmlu/computer_security_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '概念物理',
    en: 'Conceptual Physics',
    file: 'mmlu/conceptual_physics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '計量經濟學',
    en: 'Econometrics',
    file: 'mmlu/econometrics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '電氣工程',
    en: 'Electrical Engineering',
    file: 'mmlu/electrical_engineering_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '初等數學',
    en: 'Elementary Mathematics',
    file: 'mmlu/elementary_mathematics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '形式邏輯',
    en: 'Formal Logic',
    file: 'mmlu/formal_logic_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '全球事實',
    en: 'Global Facts',
    file: 'mmlu/global_facts_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中生物',
    en: 'High School Biology',
    file: 'mmlu/high_school_biology_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中化學',
    en: 'High School Chemistry',
    file: 'mmlu/high_school_chemistry_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中計算機科學',
    en: 'High School Computer Science',
    file: 'mmlu/high_school_computer_science_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中歐洲歷史',
    en: 'High School European History',
    file: 'mmlu/high_school_european_history_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中地理',
    en: 'High School Geography',
    file: 'mmlu/high_school_geography_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中政府與政治',
    en: 'High School Government And Politics',
    file: 'mmlu/high_school_government_and_politics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中宏觀經濟學',
    en: 'High School Macroeconomics',
    file: 'mmlu/high_school_macroeconomics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中數學',
    en: 'High School Mathematics',
    file: 'mmlu/high_school_mathematics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中微觀經濟學',
    en: 'High School Microeconomics',
    file: 'mmlu/high_school_microeconomics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中物理',
    en: 'High School Physics',
    file: 'mmlu/high_school_physics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中心理學',
    en: 'High School Psychology',
    file: 'mmlu/high_school_psychology_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中統計學',
    en: 'High School Statistics',
    file: 'mmlu/high_school_statistics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中美國曆史',
    en: 'High School Us History',
    file: 'mmlu/high_school_us_history_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '高中世界歷史',
    en: 'High School World History',
    file: 'mmlu/high_school_world_history_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '人類衰老',
    en: 'Human Aging',
    file: 'mmlu/human_aging_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '人類性學',
    en: 'Human Sexuality',
    file: 'mmlu/human_sexuality_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '國際法',
    en: 'International Law',
    file: 'mmlu/international_law_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '法理學',
    en: 'Jurisprudence',
    file: 'mmlu/jurisprudence_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '邏輯謬誤',
    en: 'Logical Fallacies',
    file: 'mmlu/logical_fallacies_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '機器學習',
    en: 'Machine Learning',
    file: 'mmlu/machine_learning_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '管理學',
    en: 'Management',
    file: 'mmlu/management_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '市場營銷',
    en: 'Marketing',
    file: 'mmlu/marketing_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '醫學遺傳學',
    en: 'Medical Genetics',
    file: 'mmlu/medical_genetics_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '雜項/綜合',
    en: 'Miscellaneous',
    file: 'mmlu/miscellaneous_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '道德爭議',
    en: 'Moral Disputes',
    file: 'mmlu/moral_disputes_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '道德場景',
    en: 'Moral Scenarios',
    file: 'mmlu/moral_scenarios_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '營養學',
    en: 'Nutrition',
    file: 'mmlu/nutrition_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '哲學',
    en: 'Philosophy',
    file: 'mmlu/philosophy_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '史前史',
    en: 'Prehistory',
    file: 'mmlu/prehistory_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '專業會計',
    en: 'Professional Accounting',
    file: 'mmlu/professional_accounting_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '專業法律',
    en: 'Professional Law',
    file: 'mmlu/professional_law_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '專業醫學',
    en: 'Professional Medicine',
    file: 'mmlu/professional_medicine_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '專業心理學',
    en: 'Professional Psychology',
    file: 'mmlu/professional_psychology_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '公共關係',
    en: 'Public Relations',
    file: 'mmlu/public_relations_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '安全研究',
    en: 'Security Studies',
    file: 'mmlu/security_studies_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '社會學',
    en: 'Sociology',
    file: 'mmlu/sociology_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '美國外交政策',
    en: 'Us Foreign Policy',
    file: 'mmlu/us_foreign_policy_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '病毒學',
    en: 'Virology',
    file: 'mmlu/virology_test.json',
    level: 'easy',
    type: 'single_choice'
  },
  {
    zh: '世界宗教測試',
    en: 'World Religions',
    file: 'mmlu/world_religions_test.json',
    level: 'easy',
    type: 'single_choice'
  }
];
