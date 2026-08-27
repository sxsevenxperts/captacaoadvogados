'use client'

import { DiagnosticoForm } from './components/DiagnosticoForm'
import styles from './landing-page.module.css'

export default function LandingPage() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>⚡ Seven Xperts</div>
        <nav className={styles.nav}>
          <a href="#dores">Dores</a>
          <a href="#diagnostico">Diagnóstico</a>
          <a href="#metodo">Método</a>
          <a href="#operacao">Operação</a>
          <a href="#diagnostico" className={styles.cta}>
            Diagnóstico 360°
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Operação Digital e Comercial para Advocacia</span>
          <h1>
            Seu escritório pode não perder contratos por falta de conhecimento jurídico.<br/>
            <span>Pode perder por operação.</span>
          </h1>
          <p className={styles.lead}>
            Estruturamos a jornada entre ser encontrado, organizar o primeiro contato, qualificar, acompanhar e medir oportunidades — sem transformar a advocacia em comércio.
          </p>
          <div className={styles.heroCta}>
            <a href="#diagnostico">Fazer Diagnóstico 360°</a>
            <a href="https://wa.me/5588992138011" target="_blank" rel="noopener">Falar com Seven Xperts</a>
          </div>
          <div className={styles.heroMeta}>
            <span>Advogados e escritórios</span>
            <span>Operação integrada</span>
            <span>Desde 2019</span>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.flask}>🧪</div>
        </div>
      </section>

      {/* 3 Dores */}
      <section id="dores" className={styles.problemsSection}>
        <div className={styles.sectionHead}>
          <span className={styles.eyebrow}>Os 3 vazamentos mais comuns</span>
          <h2>O escritório recebe demanda. Mas a jornada quebra.</h2>
        </div>
        <div className={styles.problemsGrid}>
          <div className={styles.problem}>
            <div className={styles.problemNumber}>01</div>
            <h3>Contato sem triagem</h3>
            <p>O advogado entra cedo demais em conversas que poderiam ser organizadas administrativamente.</p>
            <div className={styles.problemDetail}>
              <strong>Resultado:</strong>
              <p>Tempo técnico consumido, atendimento irregular e pouca clareza sobre aderência.</p>
            </div>
          </div>
          <div className={styles.problem}>
            <div className={styles.problemNumber}>02</div>
            <h3>Oportunidades esquecidas</h3>
            <p>Consulta, documentação e proposta ficam espalhadas entre WhatsApp, agenda e memória.</p>
            <div className={styles.problemDetail}>
              <strong>Resultado:</strong>
              <p>Oportunidades que já procuraram podem parar sem próximo passo ou registro.</p>
            </div>
          </div>
          <div className={styles.problem}>
            <div className={styles.problemNumber}>03</div>
            <h3>Marketing sem contratos</h3>
            <p>O escritório acompanha alcance e contatos, mas não conecta origem a contratação.</p>
            <div className={styles.problemDetail}>
              <strong>Resultado:</strong>
              <p>Difícil saber quais canais contribuem e onde o investimento deve ser corrigido.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Diagnóstico embutido */}
      <section id="diagnostico" className={styles.diagnosticoCTA}>
        <div className={styles.diagnosticoHead}>
          <span className={styles.eyebrow}>Diagnóstico 360° simplificado</span>
          <h2>15 perguntas. Um plano de prioridade.</h2>
          <p>O resultado identifica o gargalo dominante entre aquisição, triagem, conversão, CRM e gestão. Não avalia mérito jurídico.</p>
        </div>
        <DiagnosticoForm />
      </section>

      {/* Método */}
      <section id="metodo" className={styles.metodoSection}>
        <div className={styles.sectionHead}>
          <span className={styles.eyebrow}>Ampulheta de Vendas Seven Xperts</span>
          <h2>A contratação é o centro. Não o fim.</h2>
          <p>Antes da contratação, a operação precisa gerar descoberta, confiança e organização. Depois, experiência e reputação ampliam o valor.</p>
        </div>
        <div className={styles.metodoGrid}>
          <div className={styles.metodoStage}>
            <span className={styles.stageNumber}>01</span>
            <h3>Conhecer</h3>
            <p>Presença digital e conteúdo informativo ajudam o público a encontrar e compreender.</p>
            <small>Origem · Alcance qualificado</small>
          </div>
          <div className={styles.metodoStage}>
            <span className={styles.stageNumber}>02</span>
            <h3>Considerar</h3>
            <p>Clareza, autoridade e experiência digital reduzem incerteza.</p>
            <small>Engajamento · Contato espontâneo</small>
          </div>
          <div className={styles.metodoStage}>
            <span className={styles.stageNumber}>03</span>
            <h3>Qualificar</h3>
            <p>Triagem administrativa organiza antes da análise jurídica.</p>
            <small>Aderência · Tempo poupado</small>
          </div>
          <div className={styles.metodoCenter}>Contratação</div>
          <div className={styles.metodoStage}>
            <span className={styles.stageNumber}>04</span>
            <h3>Experiência</h3>
            <p>Onboarding e comunicação confirmam o profissionalismo.</p>
            <small>Experiência · Organização</small>
          </div>
          <div className={styles.metodoStage}>
            <span className={styles.stageNumber}>05</span>
            <h3>Relacionar</h3>
            <p>Relações legítimas podem continuar com novas necessidades compatíveis.</p>
            <small>Retenção · LTV</small>
          </div>
          <div className={styles.metodoStage}>
            <span className={styles.stageNumber}>06</span>
            <h3>Indicar</h3>
            <p>Boa experiência fortalece lembrança e reputação.</p>
            <small>Reputação · Indicação</small>
          </div>
        </div>
      </section>

      {/* Operação */}
      <section id="operacao" className={styles.operacaoSection}>
        <div className={styles.sectionHead}>
          <span className={styles.eyebrow}>Implementação da operação</span>
          <h2>O CRM não é uma agenda. É o mapa da jornada.</h2>
          <p><strong>CRM significa Gestão de Relacionamento com Clientes.</strong> O objetivo é saber onde cada oportunidade está, quem é responsável e qual é o próximo passo.</p>
        </div>
        <div className={styles.operacaoContent}>
          <div className={styles.operacaoLeft}>
            <h3>O que pode ser automatizado</h3>
            <ul className={styles.operacaoList}>
              <li>Registro do novo contato</li>
              <li>Distribuição por responsável</li>
              <li>Confirmação de agendamento</li>
              <li>Lembretes administrativos</li>
              <li>Criação de tarefas</li>
              <li>Alertas de oportunidade parada</li>
              <li>Pós-atendimento</li>
              <li>Relatórios gerenciais</li>
            </ul>
          </div>
          <div className={styles.operacaoRight}>
            <h3>O gestor passa a enxergar</h3>
            <div className={styles.operacaoMetrics}>
              <div className={styles.metric}>
                <strong>Conversão</strong>
                <span>por etapa da jornada</span>
              </div>
              <div className={styles.metric}>
                <strong>Velocidade</strong>
                <span>tempo de primeira resposta</span>
              </div>
              <div className={styles.metric}>
                <strong>Aderência</strong>
                <span>contatos que viram oportunidades</span>
              </div>
              <div className={styles.metric}>
                <strong>Perdas</strong>
                <span>motivos e pontos de fuga</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pilares */}
      <section id="pilares" className={styles.pilaresSection}>
        <div className={styles.sectionHead}>
          <span className={styles.eyebrow}>A operação integrada</span>
          <h2>Quatro pilares. Uma jornada.</h2>
        </div>
        <div className={styles.pilaresGrid}>
          <div className={styles.pilar}>
            <div className={styles.pilarNumber}>01</div>
            <h3>Marca & Presença</h3>
            <p>Posicionamento, site, redes e conteúdo jurídico informativo para clareza e autoridade.</p>
          </div>
          <div className={styles.pilar}>
            <div className={styles.pilarNumber}>02</div>
            <h3>Descoberta Ética</h3>
            <p>SEO, presença digital e mídia permitida, respeitando discrição e sobriedade.</p>
          </div>
          <div className={styles.pilar}>
            <div className={styles.pilarNumber}>03</div>
            <h3>Operação & Conversão</h3>
            <p>CRM, triagem, agendamento, acompanhamento e indicadores entre contato e contratação.</p>
          </div>
          <div className={styles.pilar}>
            <div className={styles.pilarNumber}>04</div>
            <h3>Experiência & Reputação</h3>
            <p>Onboarding, comunicação e pós-atendimento que fortalece confiança institucional.</p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className={styles.ctaFinal}>
        <h2>Descubra onde sua jornada está <em>quebrando</em>.</h2>
        <p>Antes de investir mais em marketing, identifique se o gargalo está em descoberta, triagem, atendimento, acompanhamento, CRM, automação ou gestão.</p>
        <div className={styles.ctaButtons}>
          <a href="#diagnostico">Fazer Diagnóstico 360°</a>
          <a href="https://agendasevenxperts.sevenxperts.solutions" target="_blank" rel="noopener">Agendar conversa estratégica</a>
          <a href="https://instagram.com/sevenxperts" target="_blank" rel="noopener">Instagram</a>
        </div>
        <small>Diagnóstico inicial · Sem pacote genérico · Recomendação conforme gargalos identificados</small>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div>
            <div className={styles.footerLogo}>⚡ SEVEN XPERTS</div>
            <p>Estratégia digital, atendimento, CRM, automação e inteligência comercial para operações profissionais.</p>
          </div>
          <div className={styles.footerMeta}>
            <div>Seven Xperts · Sobral/CE</div>
            <div><a href="https://instagram.com/sevenxperts" target="_blank" rel="noopener">@sevenxperts</a></div>
          </div>
        </div>
        <p className={styles.footerLegal}>Esta página divulga serviços da Seven Xperts para organização de marketing, atendimento, tecnologia e gestão. Não presta serviços jurídicos.</p>
      </footer>
    </div>
  )
}
