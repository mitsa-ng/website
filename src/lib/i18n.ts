export type Locale = 'zh-TW' | 'en'

export interface I18nDict {
  nav: {
    about: string
    portfolio: string
    blog: string
    services: string
    resume: string
    contact: string
  }
  hero: {
    name: string
    subtitle: string
    bio: string
  }
  stats: {
    years: { num: string; label: string }
    projects: { num: string; label: string }
    clients: { num: string; label: string }
  }
  skills: string[]
  experience: { period: string; title: string; org: string }[]
  education: { period: string; degree: string; school: string }[]
  certifications: { year: string; name: string; issuer: string }[]
  sections: {
    skills: string
    experience: string
    education: string
    certifications: string
  }
  blog: {
    readMore: string
  }
  services: {
    contact: string
    starting: string
    perMonth: string
  }
  contact: {
    info: Record<string, string>
    form: {
      name: string
      email: string
      message: string
      send: string
      sending: string
    }
    success: string
    error: string
  }
  drawer: {
    menu: string
    language: string
    theme: string
  }
}

const zh: I18nDict = {
  nav: { about: '關於', portfolio: '作品', blog: '文章', services: '服務', resume: '履歷', contact: '聯絡' },
  hero: { name: '幸恩', subtitle: '產品設計師 · 獨立創作者', bio: '專注於數位產品設計與品牌體驗，從使用者需求出發，打造直覺且美觀的產品。目前自由接案，同時經營設計部落格。' },
  stats: {
    years: { num: '8+', label: '年經驗' },
    projects: { num: '50+', label: '專案完成' },
    clients: { num: '30+', label: '合作客戶' },
  },
  skills: ['使用者研究', '資訊架構', '互動原型', '視覺設計', '設計系統', 'HTML / CSS', 'Figma', 'Principle', 'After Effects', '基本前端開發'],
  experience: [
    { period: '2023 - 至今', title: '資深產品設計師', org: '自由接案 · 遠端' },
    { period: '2020 - 2023', title: '產品設計師', org: '星創科技股份有限公司' },
    { period: '2018 - 2020', title: 'UI / UX 設計師', org: '數位設計有限公司' },
    { period: '2016 - 2018', title: '助理設計師', org: '創意網路工作室' },
  ],
  education: [
    { period: '2014 - 2018', degree: '視覺傳達設計學系 學士', school: '國立台灣科技大學' },
  ],
  certifications: [
    { year: '2023', name: 'Google UX Design 專業認證', issuer: 'Coursera' },
    { year: '2022', name: 'NN/g UX 管理策略', issuer: 'Nielsen Norman Group' },
  ],
  sections: { skills: '專業技能', experience: '經歷', education: '學歷', certifications: '專業認證' },
  blog: { readMore: '閱讀全文' },
  services: { contact: '聯絡詳談', starting: '起', perMonth: '/ 月' },
  contact: {
    info: { 'Email': 'xingencai060@gmail.com', '回覆時間': '最快 24 小時內回覆', '地點': '台灣' },
    form: { name: '姓名', email: 'Email', message: '訊息', send: '送出訊息', sending: '傳送中…' },
    success: '感謝您的訊息！將在 24 小時內回覆',
    error: '請填寫完整資訊',
  },
  drawer: { menu: '選單', language: '語言', theme: '深色模式' },
}

const en: I18nDict = {
  nav: { about: 'About', portfolio: 'Portfolio', blog: 'Blog', services: 'Services', resume: 'Resume', contact: 'Contact' },
  hero: { name: 'Nati', subtitle: 'Product Designer · Creator', bio: 'Focused on digital product design and brand experience. Crafting intuitive, beautiful products from user needs. Currently freelancing and running a design blog.' },
  stats: {
    years: { num: '8+', label: 'Years Exp.' },
    projects: { num: '50+', label: 'Projects' },
    clients: { num: '30+', label: 'Clients' },
  },
  skills: ['User Research', 'Information Architecture', 'Interactive Prototyping', 'Visual Design', 'Design Systems', 'HTML / CSS', 'Figma', 'Principle', 'After Effects', 'Basic Frontend'],
  experience: [
    { period: '2023 - Present', title: 'Senior Product Designer', org: 'Freelance · Remote' },
    { period: '2020 - 2023', title: 'Product Designer', org: 'StarTech Co., Ltd.' },
    { period: '2018 - 2020', title: 'UI / UX Designer', org: 'Digital Design Ltd.' },
    { period: '2016 - 2018', title: 'Junior Designer', org: 'Creative Web Studio' },
  ],
  education: [
    { period: '2014 - 2018', degree: 'B.A. Visual Communication Design', school: 'NTUST' },
  ],
  certifications: [
    { year: '2023', name: 'Google UX Design Certificate', issuer: 'Coursera' },
    { year: '2022', name: 'NN/g UX Management Strategy', issuer: 'Nielsen Norman Group' },
  ],
  sections: { skills: 'Skills', experience: 'Experience', education: 'Education', certifications: 'Certifications' },
  blog: { readMore: 'Read More' },
  services: { contact: 'Contact Us', starting: 'starting at', perMonth: '/ mo' },
  contact: {
    info: { 'Email': 'xingencai060@gmail.com', 'Reply Time': 'Replies within 24h', 'Location': 'Taiwan' },
    form: { name: 'Name', email: 'Email', message: 'Message', send: 'Send Message', sending: 'Sending…' },
    success: 'Thank you! I\'ll respond within 24 hours.',
    error: 'Please fill in all fields',
  },
  drawer: { menu: 'Menu', language: 'Language', theme: 'Dark Mode' },
}

const localeMap: Record<string, I18nDict> = {
  'zh-TW': zh,
  'en': en,
}

export function loadLocale(locale: string): I18nDict {
  return localeMap[locale] || en
}
