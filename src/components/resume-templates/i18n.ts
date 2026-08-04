/** Traduções dos títulos de seção e termos dinâmicos dos currículos. */

export interface SectionTitles {
  summary: string;
  experience: string;
  skills: string;
  education: string;
  languages: string;
  certifications: string;
  projects: string;
}

// Títulos por idioma. en-CA/fr-CA seguem a nomenclatura canadense usual
// ("Work Experience", "Professional Summary"); caem no base quando ausentes.
const TITLES: Record<string, SectionTitles> = {
  "pt-BR": {
    summary: "Resumo Profissional",
    experience: "Experiência Profissional",
    skills: "Habilidades Técnicas",
    education: "Formação Acadêmica",
    languages: "Idiomas",
    certifications: "Certificações",
    projects: "Projetos",
  },
  en: {
    summary: "Professional Summary",
    experience: "Work Experience",
    skills: "Technical Skills",
    education: "Education",
    languages: "Languages",
    certifications: "Certifications",
    projects: "Projects",
  },
  "en-CA": {
    summary: "Professional Summary",
    experience: "Work Experience",
    skills: "Skills",
    education: "Education",
    languages: "Languages",
    certifications: "Certifications & Professional Development",
    projects: "Projects",
  },
  fr: {
    summary: "Résumé Professionnel",
    experience: "Expérience Professionnelle",
    skills: "Compétences Techniques",
    education: "Formation",
    languages: "Langues",
    certifications: "Certifications",
    projects: "Projets",
  },
  "fr-CA": {
    summary: "Sommaire Professionnel",
    experience: "Expérience de Travail",
    skills: "Compétences",
    education: "Formation",
    languages: "Langues",
    certifications: "Certifications et Perfectionnement",
    projects: "Projets",
  },
};

export function sectionTitles(lang = "pt-BR"): SectionTitles {
  return TITLES[lang] ?? TITLES[lang.split("-")[0]] ?? TITLES["pt-BR"];
}

// Traduções de termos dinâmicos (níveis de idioma, status, nomes de idiomas).
const DYNAMIC: Record<string, Record<string, string>> = {
  Nativo: { en: "Native", fr: "Natif" },
  Fluente: { en: "Fluent", fr: "Courant" },
  Avançado: { en: "Advanced", fr: "Avancé" },
  Intermediário: { en: "Intermediate", fr: "Intermédiaire" },
  Básico: { en: "Basic", fr: "Débutant" },
  Português: { en: "Portuguese", fr: "Portugais" },
  Inglês: { en: "English", fr: "Anglais" },
  Espanhol: { en: "Spanish", fr: "Espagnol" },
  Francês: { en: "French", fr: "Français" },
  Alemão: { en: "German", fr: "Allemand" },
  Concluído: { en: "Completed", fr: "Terminé" },
  "Em andamento": { en: "In Progress", fr: "En cours" },
  Cursando: { en: "In Progress", fr: "En cours" },
};

/**
 * Ortografia canadense (britânica-influenciada) para QUALQUER saída em inglês.
 * Decisão do produto: en e en-CA usam grafia canadense (colour, centre, labour),
 * o padrão esperado por recrutadores e ATS no Canadá.
 * Aplicada apenas a texto renderizado (não a nomes próprios/keywords técnicas).
 */
const CA_SPELLING: Array<[RegExp, string]> = [
  [/\bcolor\b/gi, "colour"],
  [/\bcolors\b/gi, "colours"],
  [/\bcolored\b/gi, "coloured"],
  [/\bfavor\b/gi, "favour"],
  [/\bhonor\b/gi, "honour"],
  [/\bhonored\b/gi, "honoured"],
  [/\blabor\b/gi, "labour"],
  [/\bbehavior\b/gi, "behaviour"],
  [/\bbehaviors\b/gi, "behaviours"],
  [/\bcenter\b/gi, "centre"],
  [/\bcenters\b/gi, "centres"],
  [/\btheater\b/gi, "theatre"],
  [/\bmeter\b/gi, "metre"],
  [/\borganization\b/gi, "organisation"],
  [/\borganizations\b/gi, "organisations"],
  [/\bcatalog\b/gi, "catalogue"],
  [/\bdefense\b/gi, "defence"],
  [/\bmodeling\b/gi, "modelling"],
  [/\btraveled\b/gi, "travelled"],
  [/\btraveling\b/gi, "travelling"],
  [/\bfulfill\b/gi, "fulfil"],
  [/\bfulfillment\b/gi, "fulfilment"],
  [/\benrollment\b/gi, "enrolment"],
];

// Preserva a capitalização inicial da palavra original.
function matchCase(original: string, replacement: string): string {
  if (original[0] === original[0]?.toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** Converte texto em inglês para grafia canadense. No-op fora de inglês. */
export function canadianSpelling(text: string | undefined, lang: string): string {
  if (!text || !lang.startsWith("en")) return text ?? "";
  let out = text;
  for (const [re, rep] of CA_SPELLING) {
    out = out.replace(re, (m) => matchCase(m, rep));
  }
  return out;
}

export function translateTerm(text: string | undefined, lang = "pt-BR"): string {
  if (!text) return "";
  if (lang === "pt-BR") return text;
  const langKey = lang.split("-")[0];
  let out = text;
  for (const [pt, map] of Object.entries(DYNAMIC)) {
    if (map[langKey] && out.includes(pt)) {
      out = out.replace(new RegExp(pt, "gi"), map[langKey]);
    }
  }
  return canadianSpelling(out, lang);
}
