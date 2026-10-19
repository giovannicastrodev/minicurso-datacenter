-- =====================================================================
-- Minicurso de Operação de Data Centers - IFSP Campus Hortolândia
-- Script de SEED (Carga Inicial de Dados de Demonstração e Avaliação)
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para popular a plataforma
-- com aulas, materiais complementares, atividades de fixação e a avaliação final.

DO $$
DECLARE
  -- Variáveis de ID para as Aulas
  v_aula_1 uuid;
  v_aula_2 uuid;
  v_aula_3 uuid;

  -- Variáveis de ID para Questionários de Fixação
  v_qfix_1 uuid;
  v_qfix_2 uuid;
  v_qfix_3 uuid;

  -- Variável de ID para Avaliação Final
  v_qfinal uuid;

  -- Variáveis temporárias para questões
  v_q uuid;
BEGIN
  -- 1. LIMPEZA PREVENTIVA (opcional, limpa dados anteriores de aulas/questionários)
  -- Mantém a integridade referencial via CASCADE
  DELETE FROM public.respostas;
  DELETE FROM public.tentativas;
  DELETE FROM public.certificados;
  DELETE FROM public.questionarios;
  DELETE FROM public.aulas;

  -- =====================================================================
  -- 2. INSERÇÃO DAS AULAS (UC03 / RF04)
  -- =====================================================================

  -- Aula 1
  INSERT INTO public.aulas (titulo, descricao, ordem, url_video)
  VALUES (
    'Introdução à Infraestrutura de Data Centers e Ambientes de Missão Crítica',
    'Conheça o ecossistema dos centros de dados modernos (Hyperscale e Colocation), o conceito de missão crítica, zonas de segurança e as principais responsabilidades da rotina de um técnico de operações.',
    1,
    'https://www.youtube.com/embed/SJkX1a1l_yI'
  )
  RETURNING id INTO v_aula_1;

  -- Aula 2
  INSERT INTO public.aulas (titulo, descricao, ordem, url_video)
  VALUES (
    'Gestão Térmica (HVAC), Confinamento de Corredores e Eficiência Energética (PUE)',
    'Aprenda como funciona a climatização de precisão em salas de servidores, o isolamento entre corredores quentes e frios, medição do índice PUE e diretrizes de sustentabilidade operacional.',
    2,
    'https://www.youtube.com/embed/zDAYZU4A3w0'
  )
  RETURNING id INTO v_aula_2;

  -- Aula 3
  INSERT INTO public.aulas (titulo, descricao, ordem, url_video)
  VALUES (
    'Segurança Operacional, Normas EHS e Rotinas de Checklist (Roundings)',
    'Compreenda as normas de segurança física e do trabalho (EHS), prevenção de descargas eletrostáticas (ESD), procedimentos de acesso seguro (Man-trap) e a execução de rondas preventivas diárias.',
    3,
    'https://www.youtube.com/embed/5T3tGvC1f3M'
  )
  RETURNING id INTO v_aula_3;

  -- =====================================================================
  -- 3. MATERIAIS COMPLEMENTARES EM PDF (UC04 / RF05)
  -- =====================================================================

  INSERT INTO public.materiais (aula_id, titulo, url_arquivo)
  VALUES
    (v_aula_1, 'Apostila 01 - Fundamentos e Arquitetura de Data Centers (PDF)', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
    (v_aula_1, 'Manual Microsoft - Visão Geral de Operações em Nuvem (PDF)', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
    (v_aula_2, 'Guia Prático - Diretrizes Térmicas ASHRAE e Cálculo de PUE (PDF)', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
    (v_aula_3, 'Procedimento Operacional Padrão (SOP) - Rondas e Boas Práticas EHS (PDF)', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');

  -- =====================================================================
  -- 4. ATIVIDADES DE FIXAÇÃO POR AULA (UC05 / RF06)
  -- =====================================================================

  -- --- Fixação Aula 1 ---
  INSERT INTO public.questionarios (aula_id, tipo, titulo, percentual_minimo)
  VALUES (v_aula_1, 'FIXACAO', 'Atividade de Fixação - Aula 1: Fundamentos', NULL)
  RETURNING id INTO v_qfix_1;

  -- Questão 1 (Fixação 1)
  INSERT INTO public.questoes (questionario_id, enunciado, ordem)
  VALUES (v_qfix_1, 'Qual é o principal diferencial de uma infraestrutura de Data Center classificada como de "missão crítica"?', 1)
  RETURNING id INTO v_q;

  INSERT INTO public.alternativas (questao_id, texto, ordem, correta) VALUES
    (v_q, 'Tolerância zero a interrupções não planejadas através de alta disponibilidade e sistemas redundantes contínuos.', 1, true),
    (v_q, 'Foco exclusivo em redução de custos operacionais, desligando servidores fora do horário comercial.', 2, false),
    (v_q, 'Atendimento restrito a usuários domésticos locais com conexões simplificadas de banda larga.', 3, false),
    (v_q, 'Ausência de sistemas de climatização dedicados em prol de ventilação natural externa.', 4, false);

  -- Questão 2 (Fixação 1)
  INSERT INTO public.questoes (questionario_id, enunciado, ordem)
  VALUES (v_qfix_1, 'Em Data Centers de grande escala (Hyperscale), qual é a principal vantagem da padronização modular de racks e servidores?', 2)
  RETURNING id INTO v_q;

  INSERT INTO public.alternativas (questao_id, texto, ordem, correta) VALUES
    (v_q, 'Permitir a instalação de softwares piratas com menor probabilidade de falhas de licença.', 1, false),
    (v_q, 'Facilitar a manutenção ágil, escalabilidade rápida e previsibilidade de substituição de componentes.', 2, true),
    (v_q, 'Dispensar a necessidade de monitoramento físico por técnicos no local.', 3, false),
    (v_q, 'Reduzir a velocidade das portas de rede para economizar energia.', 4, false);

  -- --- Fixação Aula 2 ---
  INSERT INTO public.questionarios (aula_id, tipo, titulo, percentual_minimo)
  VALUES (v_aula_2, 'FIXACAO', 'Atividade de Fixação - Aula 2: Gestão Térmica e PUE', NULL)
  RETURNING id INTO v_qfix_2;

  -- Questão 1 (Fixação 2)
  INSERT INTO public.questoes (questionario_id, enunciado, ordem)
  VALUES (v_qfix_2, 'Qual é o objetivo técnico do confinamento de corredores quentes ou frios (Hot/Cold Aisle Containment)?', 1)
  RETURNING id INTO v_q;

  INSERT INTO public.alternativas (questao_id, texto, ordem, correta) VALUES
    (v_q, 'Evitar que a equipe técnica acesse os cabos de rede durante a rotina.', 1, false),
    (v_q, 'Impedir a mistura térmica entre o ar frio insuflado e o ar quente exaurido pelos servidores.', 2, true),
    (v_q, 'Aumentar o ruído ambiente para teste de isolamento acústico da sala.', 3, false),
    (v_q, 'Permitir que servidores funcionem a temperaturas acima de 80°C continuamente.', 4, false);

  -- Questão 2 (Fixação 2)
  INSERT INTO public.questoes (questionario_id, enunciado, ordem)
  VALUES (v_qfix_2, 'O que indica um índice PUE (Power Usage Effectiveness) próximo a 1.1 em um Data Center?', 2)
  RETURNING id INTO v_q;

  INSERT INTO public.alternativas (questao_id, texto, ordem, correta) VALUES
    (v_q, 'Excelente eficiência energética, indicando que quase toda energia consumida pelo prédio é aproveitada diretamente pela carga de TI.', 1, true),
    (v_q, 'Grave ineficiência com desperdício excessivo nos sistemas de refrigeração e iluminação.', 2, false),
    (v_q, 'Que o Data Center opera sem nenhum sistema de no-break (UPS).', 3, false),
    (v_q, 'Que 90% da energia é gasta exclusivamente pelos geradores a diesel.', 4, false);

  -- --- Fixação Aula 3 ---
  INSERT INTO public.questionarios (aula_id, tipo, titulo, percentual_minimo)
  VALUES (v_aula_3, 'FIXACAO', 'Atividade de Fixação - Aula 3: Segurança e Procedimentos', NULL)
  RETURNING id INTO v_qfix_3;

  -- Questão 1 (Fixação 3)
  INSERT INTO public.questoes (questionario_id, enunciado, ordem)
  VALUES (v_qfix_3, 'O que caracteriza a rotina operacional de "Roundings" (rondas técnicas)?', 1)
  RETURNING id INTO v_q;

  INSERT INTO public.alternativas (questao_id, texto, ordem, correta) VALUES
    (v_q, 'Inspeções visuais e instrumentais preventivas e periódicas nos racks, no-breaks, painéis elétricos e alarmes para identificar anomalias.', 1, true),
    (v_q, 'Reuniões semanais de marketing com clientes corporativos fora do ambiente técnico.', 2, false),
    (v_q, 'Troca aleatória de cabos sem consultar a documentação de cabeamento estruturado.', 3, false),
    (v_q, 'Desligamento programado das câmeras de CFTV para manutenção preventiva.', 4, false);

  -- Questão 2 (Fixação 3)
  INSERT INTO public.questoes (questionario_id, enunciado, ordem)
  VALUES (v_qfix_3, 'Ao manipular placas e memórias durante a manutenção de um servidor, por que o técnico deve utilizar uma pulseira eletrostática (ESD)?', 2)
  RETURNING id INTO v_q;

  INSERT INTO public.alternativas (questao_id, texto, ordem, correta) VALUES
    (v_q, 'Para evitar queimaduras por calor emitido pelos cabos de fibra óptica.', 1, false),
    (v_q, 'Para equalizar a carga estática do corpo com o aterramento do rack, evitando que descargas imperceptíveis danifiquem componentes sensíveis.', 2, true),
    (v_q, 'Para marcar o ponto eletrônico de entrada e saída do turno.', 3, false),
    (v_q, 'Para medir o batimento cardíaco em conformidade com as normas hospitalares.', 4, false);


  -- =====================================================================
  -- 5. AVALIAÇÃO FINAL (UC06 / RF09 / RF10)
  -- =====================================================================

  INSERT INTO public.questionarios (aula_id, tipo, titulo, percentual_minimo)
  VALUES (NULL, 'FINAL', 'Avaliação Final - Certificação Técnica Básica em Data Center', 70)
  RETURNING id INTO v_qfinal;

  -- Questão 1 (Final)
  INSERT INTO public.questoes (questionario_id, enunciado, ordem)
  VALUES (v_qfinal, 'Em um Data Center de missão crítica, quando ocorre uma oscilação ou interrupção na rede elétrica da concessionária pública, qual é a ordem correta de contingência energética?', 1)
  RETURNING id INTO v_q;

  INSERT INTO public.alternativas (questao_id, texto, ordem, correta) VALUES
    (v_q, 'Os no-breaks (UPS) sustentam a carga de forma ininterrupta via baterias até que os geradores a diesel arranquem e estabilizem.', 1, true),
    (v_q, 'Os servidores são desligados imediatamente para que a bateria do no-break não se desgaste.', 2, false),
    (v_q, 'A equipe técnica conecta manualmente cabos de extensão em tomadas de emergência do estacionamento.', 3, false),
    (v_q, 'O sistema espera 15 minutos sem energia antes de ligar os geradores a diesel.', 4, false);

  -- Questão 2 (Final)
  INSERT INTO public.questoes (questionario_id, enunciado, ordem)
  VALUES (v_qfinal, 'Qual é a definição e benefício do procedimento conhecido como "Hot Swap" em equipamentos de rede e servidores?', 2)
  RETURNING id INTO v_q;

  INSERT INTO public.alternativas (questao_id, texto, ordem, correta) VALUES
    (v_q, 'Troca de componentes de hardware (como fontes redundantes e discos) com o servidor ligado, sem interrupção dos serviços produtivos.', 1, true),
    (v_q, 'Aquecimento prévio dos discos rígidos antes da instalação no chassi.', 2, false),
    (v_q, 'Substituição exclusiva de peças durante feriados prolongados com autorização do cliente.', 3, false),
    (v_q, 'Troca de cabos de força sem aterramento de proteção.', 4, false);

  -- Questão 3 (Final)
  INSERT INTO public.questoes (questionario_id, enunciado, ordem)
  VALUES (v_qfinal, 'Em relação ao controle de segurança física na área crítica (Data Hall), qual é a principal finalidade da eclusa de passagem (Man-trap)?', 3)
  RETURNING id INTO v_q;

  INSERT INTO public.alternativas (questao_id, texto, ordem, correta) VALUES
    (v_q, 'Garantir que apenas uma pessoa autenticada por vez passe entre as portas, impedindo o acesso indevido por carona ("tailgating").', 1, true),
    (v_q, 'Servir de depósito para ferramentas e caixas de papelão dos servidores.', 2, false),
    (v_q, 'Despressurizar a sala para evitar entrada de oxigênio em caso de incêndio.', 3, false),
    (v_q, 'Permitir a entrada de veículos de carga diretamente no corredor de racks.', 4, false);

  -- Questão 4 (Final)
  INSERT INTO public.questoes (questionario_id, enunciado, ordem)
  VALUES (v_qfinal, 'O que caracteriza uma arquitetura de alimentação elétrica com topologia 2N?', 4)
  RETURNING id INTO v_q;

  INSERT INTO public.alternativas (questao_id, texto, ordem, correta) VALUES
    (v_q, 'Possui dois caminhos de distribuição totalmente independentes (alimentação A e B), onde cada um é capaz de suprir 100% da carga sozinho.', 1, true),
    (v_q, 'Significa que o Data Center possui apenas dois no-breaks para todo o edifício.', 2, false),
    (v_q, 'Dobra a voltagem das tomadas dos servidores para acelerar os processadores.', 3, false),
    (v_q, 'Exige dois técnicos presentes simultaneamente para acionar qualquer disjuntor.', 4, false);

  -- Questão 5 (Final)
  INSERT INTO public.questoes (questionario_id, enunciado, ordem)
  VALUES (v_qfinal, 'Se um Data Center consome um total de 12.000 kW de energia e sua carga de equipamentos de TI consome 10.000 kW, qual é o valor aproximado do PUE desse centro de dados?', 5)
  RETURNING id INTO v_q;

  INSERT INTO public.alternativas (questao_id, texto, ordem, correta) VALUES
    (v_q, 'PUE = 1.20 (indicando alta eficiência, obtido pela razão 12.000 / 10.000).', 1, true),
    (v_q, 'PUE = 0.83 (pois o consumo de TI é menor que o consumo total).', 2, false),
    (v_q, 'PUE = 2.00 (somando as perdas de refrigeração e no-break).', 3, false),
    (v_q, 'PUE = 12.0 (dividindo por mil).', 4, false);

  RAISE NOTICE 'Carga de dados (SEED) concluída com sucesso!';
END $$;

