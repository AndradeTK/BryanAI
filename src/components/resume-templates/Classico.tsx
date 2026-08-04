import { sectionTitles } from "./i18n";
import { ca, stripUrl, isUrl, resolveOrder, allSkills, langTerm } from "./shared";
import type { ResumeTemplateProps, SectionName } from "./types";

/**
 * Template Clássico — header centralizado com acento azul, seções com títulos
 * sublinhados. Usa classes próprias (.header/.section/.summary/.company...),
 * distintas do markup genérico. Single-column, ATS-safe.
 */
export function Classico(props: ResumeTemplateProps) {
  const { perfil, curriculo, formacao = [], projetos = [], cursos = [], idiomas = [] } = props;
  const lang = props.lang ?? "pt-BR";
  const t = sectionTitles(lang);

  const render = (name: SectionName) => {
    switch (name) {
      case "summary": {
        const text = curriculo?.resumo_profissional || perfil?.resumo_base;
        if (!text) return null;
        return (
          <div className="section" key={name}>
            <div className="section-title">{t.summary}</div>
            <p className="summary">{ca(text, lang)}</p>
          </div>
        );
      }
      case "experience": {
        const exps = curriculo?.experiencias ?? [];
        if (exps.length === 0) return null;
        return (
          <div className="section" key={name}>
            <div className="section-title">{t.experience}</div>
            {exps.map((exp, i) => (
              <div className="experience-item" key={i}>
                <div className="experience-header">
                  <span className="job-title">{ca(exp.cargo, lang)}</span>
                  <span className="period">{exp.periodo}</span>
                </div>
                <div className="company">
                  {exp.empresa}
                  {exp.localizacao ? ` — ${exp.localizacao}` : ""}
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="bullets">
                    {exp.bullets.map((b, j) => (
                      <li key={j}>{ca(b, lang)}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        );
      }
      case "skills": {
        const skills = allSkills(props);
        if (skills.length === 0) return null;
        return (
          <div className="section" key={name}>
            <div className="section-title">{t.skills}</div>
            <div className="skills-grid">
              {skills.map((s, i) => (
                <span className="skill-tag" key={i}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        );
      }
      case "education": {
        if (formacao.length === 0) return null;
        return (
          <div className="section" key={name}>
            <div className="section-title">{t.education}</div>
            {formacao.map((f, i) => (
              <div className="education-item" key={i}>
                <div className="title">{ca(f.titulo_curso, lang)}</div>
                <div className="institution">{f.instituicao_projeto}</div>
                {f.canadian_equivalency && (
                  <div className="status">{ca(f.canadian_equivalency, lang)}</div>
                )}
                {f.status && <div className="status">{langTerm(f.status, lang)}</div>}
              </div>
            ))}
          </div>
        );
      }
      case "certifications": {
        if (cursos.length === 0) return null;
        return (
          <div className="section" key={name}>
            <div className="section-title">{t.certifications}</div>
            {cursos.map((c, i) => (
              <div className="cert-item" key={i}>
                <span className="name">{ca(c.titulo_do_curso, lang)}</span>
                <span className="issuer">{c.emissor_instituicao}</span>
              </div>
            ))}
          </div>
        );
      }
      case "languages": {
        if (idiomas.length === 0) return null;
        return (
          <div className="section" key={name}>
            <div className="section-title">{t.languages}</div>
            {idiomas.map((i, idx) => (
              <span className="language-item" key={idx}>
                <span className="name">{langTerm(i.idioma, lang)}</span>
                <span className="level">{langTerm(i.nivel_cefr, lang)}</span>
              </span>
            ))}
          </div>
        );
      }
      case "projects": {
        if (projetos.length === 0) return null;
        return (
          <div className="section" key={name}>
            <div className="section-title">{t.projects}</div>
            {projetos.map((p, i) => (
              <div className="education-item" key={i}>
                <div className="title">{p.instituicao_projeto}</div>
                <div className="summary">{ca(p.descricao_detalhada, lang)}</div>
                {isUrl(p.link) && (
                  <a className="institution" href={p.link}>
                    {stripUrl(p.link)}
                  </a>
                )}
              </div>
            ))}
          </div>
        );
      }
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>{perfil?.nome_completo || "Nome"}</h1>
        <div className="contact">
          {[perfil?.email, perfil?.telefone, perfil?.localizacao].filter(Boolean).join("  •  ")}
          {(perfil?.linkedin || perfil?.github) && <br />}
          {perfil?.linkedin && <a href={perfil.linkedin}>{stripUrl(perfil.linkedin)}</a>}
          {perfil?.github && (
            <>
              {"  •  "}
              <a href={perfil.github}>{stripUrl(perfil.github)}</a>
            </>
          )}
        </div>
      </div>
      {resolveOrder(props.sectionsOrder).map(render)}
    </div>
  );
}
