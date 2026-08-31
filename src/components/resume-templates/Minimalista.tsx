import { sectionTitles } from "./i18n";
import { ca, stripUrl, isUrl, resolveOrder, allSkills, langTerm } from "./shared";
import type { ResumeTemplateProps, SectionName } from "./types";

/** Template Minimalista — sans-serif limpo, linhas finas, single-column ATS. */
export function Minimalista(props: ResumeTemplateProps) {
  const { perfil, curriculo, formacao = [], projetos = [], atividades = [], cursos = [], idiomas = [] } = props;
  const lang = props.lang ?? "pt-BR";
  const t = sectionTitles(lang);

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
                <div className="experience-header">
                  <span className="job-title">{ca(exp.cargo, lang)}</span>
                  <span className="period">{exp.periodo}</span>
                </div>
                <div className="company-name">
                  {exp.empresa}
                  {exp.localizacao ? ` — ${exp.localizacao}` : ""}
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
        const skills = allSkills(props);
        if (skills.length === 0) return null;
        return (
          <section key={name}>
            <h2>{t.skills}</h2>
            <div className="skills-list">
              {skills.map((s, i) => (
                <span className="skill-item" key={i}>
                  {s}
                </span>
              ))}
            </div>
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
            {cursos.map((c, i) => (
              <div className="cert-item" key={i}>
                <span className="cert-name">{ca(c.titulo_do_curso, lang)}</span>
                <span className="cert-issuer">{c.emissor_instituicao}</span>
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
                <span className="language-item" key={idx}>
                  <span className="language-name">{langTerm(i.idioma, lang)}:</span>{" "}
                  <span className="language-level">{langTerm(i.nivel_cefr, lang)}</span>
                </span>
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
                <div className="experience-header">
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
                <div className="project-title">{p.instituicao_projeto}</div>
                <div className="project-description">{ca(p.descricao_detalhada, lang)}</div>
                {isUrl(p.link) && (
                  <a className="project-link" href={p.link}>
                    {stripUrl(p.link)}
                  </a>
                )}
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
        {curriculo?.titulo_profissional && (
          <div className="role-title">{ca(curriculo.titulo_profissional, lang)}</div>
        )}
        <MinimalContact perfil={perfil} />
      </header>
      {resolveOrder(props.sectionsOrder).map(render)}
    </div>
  );
}

function MinimalContact({ perfil }: Pick<ResumeTemplateProps, "perfil">) {
  return (
    <div className="contact-info">
      {perfil?.email && <span>{perfil.email}</span>}
      {perfil?.telefone && (
        <>
          <span className="contact-separator">|</span>
          {perfil.telefone}
        </>
      )}
      {perfil?.localizacao && (
        <>
          <span className="contact-separator">|</span>
          {perfil.localizacao}
        </>
      )}
      {perfil?.linkedin && (
        <>
          <br />
          <a href={perfil.linkedin}>{stripUrl(perfil.linkedin)}</a>
        </>
      )}
      {perfil?.github && (
        <>
          <span className="contact-separator">|</span>
          <a href={perfil.github}>{stripUrl(perfil.github)}</a>
        </>
      )}
      {perfil?.portfolio && (
        <>
          <span className="contact-separator">|</span>
          <a href={perfil.portfolio}>{stripUrl(perfil.portfolio)}</a>
        </>
      )}
    </div>
  );
}
