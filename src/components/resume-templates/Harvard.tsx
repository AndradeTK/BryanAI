import { sectionTitles } from "./i18n";
import { ca, stripUrl, isUrl, resolveOrder, langTerm } from "./shared";
import type { ResumeTemplateProps, SectionName } from "./types";

/**
 * Template Harvard — serifado clássico (Times), header centralizado, divisores.
 * Layout: empresa à esquerda / localização à direita; cargo itálico / data à
 * direita. Single-column, ATS-safe.
 */
export function Harvard(props: ResumeTemplateProps) {
  const { perfil, curriculo, formacao = [], projetos = [], atividades = [], cursos = [], idiomas = [] } = props;
  const lang = props.lang ?? "pt-BR";
  const t = sectionTitles(lang);
  const skills = curriculo?.habilidades_tecnicas;

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
      case "experience": {
        const exps = curriculo?.experiencias ?? [];
        if (exps.length === 0) return null;
        return (
          <section key={name}>
            <h2>{t.experience}</h2>
            {exps.map((exp, i) => (
              <article className="experience-item" key={i}>
                <div className="experience-row">
                  <span className="company-name">{exp.empresa}</span>
                  {exp.localizacao && <span className="location">{exp.localizacao}</span>}
                </div>
                <div className="experience-row">
                  <span className="job-title">{ca(exp.cargo, lang)}</span>
                  <span className="period">{exp.periodo}</span>
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
      case "skills": {
        const parts: Array<[string, string[]]> = [];
        if (skills?.principais?.length) parts.push(["Core", skills.principais]);
        if (skills?.secundarias?.length) parts.push(["Additional", skills.secundarias]);
        if (parts.length === 0) return null;
        return (
          <section key={name}>
            <h2>{t.skills}</h2>
            {parts.map(([label, list], i) => (
              <div className="skills-row" key={i}>
                <span className="skills-category-name">{label}: </span>
                <span className="skills-list-inline">{list.join(", ")}</span>
              </div>
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
                <div className="education-row">
                  <span className="institution-name">{f.instituicao_projeto}</span>
                  {f.status && <span className="education-status">{langTerm(f.status, lang)}</span>}
                </div>
                <div className="degree-title">{ca(f.titulo_curso, lang)}</div>
                {f.canadian_equivalency && (
                  <div className="education-status">{ca(f.canadian_equivalency, lang)}</div>
                )}
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
            {cursos.map((c, i) => (
              <div className="cert-item" key={i}>
                <span className="cert-name">{ca(c.titulo_do_curso, lang)}</span>
                {c.emissor_instituicao && (
                  <span className="cert-issuer"> — {c.emissor_instituicao}</span>
                )}
              </div>
            ))}
          </section>
        );
      }
      case "languages": {
        if (idiomas.length === 0) return null;
        return (
          <section key={name}>
            <h2>{t.languages}</h2>
            <div className="languages-list">
              {idiomas.map((i, idx) => (
                <div className="language-item" key={idx}>
                  <span className="language-name">{langTerm(i.idioma, lang)}: </span>
                  <span className="language-level">{langTerm(i.nivel_cefr, lang)}</span>
                </div>
              ))}
            </div>
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
                <div className="experience-row">
                  <span className="job-title">{ca(a.papel, lang)}</span>
                  <span className="period">{a.periodo}</span>
                </div>
                <div className="company-name">{a.organizacao}</div>
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
                <div className="project-row">
                  <span className="project-name">{p.instituicao_projeto}</span>
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
    }
  };

  return (
    <div className="container">
      <header>
        <h1>{perfil?.nome_completo || "Nome"}</h1>
        <div className="contact-info">
          {[perfil?.email, perfil?.telefone, perfil?.localizacao]
            .filter(Boolean)
            .map((v, i, arr) => (
              <span key={i}>
                {v}
                {i < arr.length - 1 && <span className="contact-separator">|</span>}
              </span>
            ))}
          {(perfil?.linkedin || perfil?.github) && <br />}
          {perfil?.linkedin && <a href={perfil.linkedin}>{stripUrl(perfil.linkedin)}</a>}
          {perfil?.github && (
            <>
              <span className="contact-separator">|</span>
              <a href={perfil.github}>{stripUrl(perfil.github)}</a>
            </>
          )}
        </div>
      </header>
      {resolveOrder(props.sectionsOrder).map(render)}
    </div>
  );
}
