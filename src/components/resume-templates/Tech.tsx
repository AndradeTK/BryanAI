import { sectionTitles } from "./i18n";
import { ca, stripUrl, isUrl, resolveOrder, langTerm } from "./shared";
import type { ResumeTemplateProps, SectionName } from "./types";

/**
 * Template Tech — para desenvolvedores. Tech stack em destaque logo após o
 * resumo, skills agrupadas por categoria (Core/Additional), fonte mono nos
 * detalhes. Single-column, ATS-safe.
 *
 * Ordem própria: skills sobem para logo depois do resumo (a menos que o usuário
 * tenha configurado uma ordem explícita).
 */
const TECH_ORDER: SectionName[] = [
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
  "certifications",
  "languages",
];

export function Tech(props: ResumeTemplateProps) {
  const { perfil, curriculo, formacao = [], projetos = [], atividades = [], cursos = [], idiomas = [] } = props;
  const lang = props.lang ?? "pt-BR";
  const t = sectionTitles(lang);
  const skills = curriculo?.habilidades_tecnicas;
  const order = props.sectionsOrder?.length ? resolveOrder(props.sectionsOrder) : TECH_ORDER;

  const render = (name: SectionName) => {
    switch (name) {
      case "summary": {
        const text = curriculo?.resumo_profissional || perfil?.resumo_base;
        if (!text) return null;
        return (
          <section key={name}>
            <h2>{t.summary}</h2>
            <p className="summary-text">{ca(text, lang)}</p>
          </section>
        );
      }
      case "skills": {
        const cats: Array<[string, string[]]> = [];
        if (skills?.principais?.length) cats.push(["Core Stack", skills.principais]);
        if (skills?.secundarias?.length) cats.push(["Additional", skills.secundarias]);
        if (cats.length === 0) return null;
        return (
          <section key={name}>
            <h2>{t.skills}</h2>
            <div className="skills-section">
              {cats.map(([header, list], i) => (
                <div className="skill-category" key={i}>
                  <div className="skill-category-header">{header}</div>
                  <div className="skill-tags">
                    {list.map((s, j) => (
                      <span className={`skill-tag${i === 0 ? " highlight" : ""}`} key={j}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      }
      case "experience": {
        const exps = curriculo?.experiencias ?? [];
        if (exps.length === 0) return null;
        return (
          <section key={name}>
            <h2>{t.experience}</h2>
            {exps.map((exp, i) => (
              <article className="experience-item" key={i}>
                <div className="experience-header">
                  <span className="job-title">{ca(exp.cargo, lang)}</span>
                  <span className="period">{exp.periodo}</span>
                </div>
                <div className="company-info">
                  {exp.empresa}
                  {exp.localizacao ? ` · ${exp.localizacao}` : ""}
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="responsibilities">
                    {exp.bullets.map((b, j) => (
                      <li key={j}>{ca(b, lang)}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>
        );
      }
      case "leadership": {
        if (atividades.length === 0) return null;
        return (
          <section key={name}>
            <h2>{t.leadership}</h2>
            {atividades.map((a, i) => (
              <article className="experience-item" key={i}>
                <div className="experience-header">
                  <span className="job-title">{ca(a.papel, lang)}</span>
                  <span className="period">{a.periodo}</span>
                </div>
                <div className="company-info">{a.organizacao}</div>
                {a.bullets && a.bullets.length > 0 && (
                  <ul className="responsibilities">
                    {a.bullets.map((b, j) => (
                      <li key={j}>{ca(b, lang)}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>
        );
      }
      case "projects": {
        if (projetos.length === 0) return null;
        return (
          <section key={name}>
            <h2>{t.projects}</h2>
            {projetos.map((p, i) => (
              <article className="project-item" key={i}>
                <div className="project-header">
                  <span className="project-title">{p.instituicao_projeto}</span>
                  {isUrl(p.link) && (
                    <a className="project-link" href={p.link}>
                      {stripUrl(p.link)}
                    </a>
                  )}
                </div>
                <div className="project-description">{ca(p.descricao_detalhada, lang)}</div>
                {p.tecnologias && <div className="project-tech">{p.tecnologias}</div>}
              </article>
            ))}
          </section>
        );
      }
      case "education": {
        if (formacao.length === 0) return null;
        return (
          <section key={name}>
            <h2>{t.education}</h2>
            {formacao.map((f, i) => (
              <article className="education-item" key={i}>
                <div className="education-title">{ca(f.titulo_curso, lang)}</div>
                <div className="education-institution">{f.instituicao_projeto}</div>
                {f.canadian_equivalency && (
                  <div className="education-status">{ca(f.canadian_equivalency, lang)}</div>
                )}
                {f.status && <div className="education-status">{langTerm(f.status, lang)}</div>}
              </article>
            ))}
          </section>
        );
      }
      case "certifications": {
        if (cursos.length === 0) return null;
        return (
          <section key={name}>
            <h2>{t.certifications}</h2>
            <div className="cert-grid">
              {cursos.map((c, i) => (
                <div className="cert-item" key={i}>
                  <span className="cert-name">{ca(c.titulo_do_curso, lang)}</span>
                  <span className="cert-issuer">{c.emissor_instituicao}</span>
                </div>
              ))}
            </div>
          </section>
        );
      }
      case "languages": {
        if (idiomas.length === 0) return null;
        return (
          <section key={name}>
            <h2>{t.languages}</h2>
            <div className="languages-inline">
              {idiomas.map((i, idx) => (
                <span className="language-item" key={idx}>
                  <span className="language-name">{langTerm(i.idioma, lang)}:</span>
                  <span className="language-level">{langTerm(i.nivel_cefr, lang)}</span>
                </span>
              ))}
            </div>
          </section>
        );
      }
    }
  };

  return (
    <div className="container">
      <header>
        <h1>{perfil?.nome_completo || "Nome"}</h1>
        {curriculo?.titulo_profissional && (
          <div className="role-title">{ca(curriculo.titulo_profissional, lang)}</div>
        )}
        <div className="contact-grid">
          {perfil?.email && <span className="contact-item">{perfil.email}</span>}
          {perfil?.telefone && <span className="contact-item">{perfil.telefone}</span>}
          {perfil?.localizacao && <span className="contact-item">{perfil.localizacao}</span>}
          {perfil?.linkedin && (
            <span className="contact-item">
              <a href={perfil.linkedin}>{stripUrl(perfil.linkedin)}</a>
            </span>
          )}
          {perfil?.github && (
            <span className="contact-item">
              <a href={perfil.github}>{stripUrl(perfil.github)}</a>
            </span>
          )}
        </div>
      </header>
      {order.map(render)}
    </div>
  );
}
