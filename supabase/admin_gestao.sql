-- =====================================================================
-- Minicurso de Data Center - IFSP Câmpus Hortolândia
-- Script de Migração: Módulo de Gestão, Permissões e Analytics (Admin)
-- =====================================================================
-- Execute este script no SQL Editor do Supabase para habilitar o portal
-- do gestor, gerenciamento de conteúdo (CRUD) e dashboards de métricas.

-- 1. ADICIONA COLUNA DE PAPEL NA TABELA DE PERFIS ---------------------
ALTER TABLE public.perfis
ADD COLUMN IF NOT EXISTS papel text NOT NULL DEFAULT 'aluno'
CHECK (papel IN ('aluno', 'gestor'));

-- 2. ATUALIZA O GATILHO DE CRIAÇÃO AUTOMÁTICA DE PERFIL ---------------
CREATE OR REPLACE FUNCTION public.criar_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, papel)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'papel', 'aluno')
  );
  RETURN new;
END;
$$;

-- 3. FUNÇÃO HELPER PARA VERIFICAR SE O USUÁRIO ATUAL É GESTOR --------
CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT coalesce(
    (SELECT papel = 'gestor' FROM public.perfis WHERE id = auth.uid()),
    false
  );
$$;

-- 4. ATUALIZAÇÃO DA REGRA DE APROVAÇÃO DA AVALIAÇÃO FINAL PARA 70% ----
UPDATE public.questionarios
SET percentual_minimo = 70
WHERE tipo = 'FINAL';

-- 4.1 FUNÇÃO DE ENVIO E CORREÇÃO COM LIMITE ESTRITO DE 2 TENTATIVAS ----
CREATE OR REPLACE FUNCTION public.enviar_tentativa(p_questionario_id uuid, p_respostas jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_tipo text;
  v_minimo integer;
  v_total integer;
  v_respondidas integer;
  v_acertos integer;
  v_percentual numeric(5,2);
  v_aprovado boolean;
  v_tentativa uuid;
  v_total_tentativas_anteriores integer;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT q.tipo, coalesce(q.percentual_minimo, 70) INTO v_tipo, v_minimo
  FROM public.questionarios q
  WHERE q.id = p_questionario_id;

  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'Questionário inexistente';
  END IF;

  -- BLOQUEIO NO BANCO: Limite estrito de 2 tentativas
  SELECT count(*) INTO v_total_tentativas_anteriores
  FROM public.tentativas
  WHERE usuario_id = v_usuario AND questionario_id = p_questionario_id;

  IF v_total_tentativas_anteriores >= 2 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tentativas
      WHERE usuario_id = v_usuario AND questionario_id = p_questionario_id AND aprovado = true
    ) THEN
      RAISE EXCEPTION 'Limite de 2 tentativas esgotado para este questionário. Reinicie o curso ou releia o material para liberar novas tentativas.';
    END IF;
  END IF;

  SELECT count(*) INTO v_total
  FROM public.questoes
  WHERE questionario_id = p_questionario_id;

  INSERT INTO public.tentativas (usuario_id, questionario_id, acertos, total_questoes, percentual)
  VALUES (v_usuario, p_questionario_id, 0, v_total, 0)
  RETURNING id INTO v_tentativa;

  INSERT INTO public.respostas (tentativa_id, questao_id, alternativa_id, correta)
  SELECT v_tentativa, qu.id, a.id, a.correta
  FROM jsonb_to_recordset(p_respostas) as r(questao_id uuid, alternativa_id uuid)
  JOIN public.questoes qu
    ON qu.id = r.questao_id and qu.questionario_id = p_questionario_id
  JOIN public.alternativas a
    ON a.id = r.alternativa_id and a.questao_id = qu.id;

  SELECT count(*), count(*) FILTER (WHERE correta)
  INTO v_respondidas, v_acertos
  FROM public.respostas
  WHERE tentativa_id = v_tentativa;

  IF v_respondidas <> v_total THEN
    RAISE EXCEPTION 'Há questões sem resposta ou respostas inválidas';
  END IF;

  v_percentual := round(100.0 * v_acertos / v_total, 2);

  IF v_tipo = 'FINAL' THEN
    v_aprovado := v_percentual >= v_minimo;
  ELSE
    v_aprovado := v_percentual >= 50;
  END IF;

  UPDATE public.tentativas
  SET acertos = v_acertos, percentual = v_percentual, aprovado = v_aprovado
  WHERE id = v_tentativa;

  IF v_aprovado AND v_tipo = 'FINAL' THEN
    INSERT INTO public.certificados (usuario_id, tentativa_id)
    VALUES (v_usuario, v_tentativa)
    ON CONFLICT (usuario_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'tentativa_id', v_tentativa,
    'acertos', v_acertos,
    'total_questoes', v_total,
    'percentual', v_percentual,
    'aprovado', v_aprovado
  );
END;
$$;

-- 5. POLÍTICAS DE ROW LEVEL SECURITY (RLS) PARA GESTÃO ----------------

-- Aulas: Leitura para todos os autenticados, Gestão completa para gestor
DROP POLICY IF EXISTS "aulas: gestor gerencia" ON public.aulas;
CREATE POLICY "aulas: gestor gerencia" ON public.aulas
FOR ALL TO authenticated
USING (public.is_gestor())
WITH CHECK (public.is_gestor());

-- Materiais: Leitura para todos os autenticados, Gestão completa para gestor
DROP POLICY IF EXISTS "materiais: gestor gerencia" ON public.materiais;
CREATE POLICY "materiais: gestor gerencia" ON public.materiais
FOR ALL TO authenticated
USING (public.is_gestor())
WITH CHECK (public.is_gestor());

-- Questionários: Leitura para todos os autenticados, Gestão completa para gestor
DROP POLICY IF EXISTS "questionarios: gestor gerencia" ON public.questionarios;
CREATE POLICY "questionarios: gestor gerencia" ON public.questionarios
FOR ALL TO authenticated
USING (public.is_gestor())
WITH CHECK (public.is_gestor());

-- Questões: Leitura para todos os autenticados, Gestão completa para gestor
DROP POLICY IF EXISTS "questoes: gestor gerencia" ON public.questoes;
CREATE POLICY "questoes: gestor gerencia" ON public.questoes
FOR ALL TO authenticated
USING (public.is_gestor())
WITH CHECK (public.is_gestor());

-- Alternativas: Permite ao gestor ler e gravar tudo (incluindo o gabarito)
GRANT ALL ON public.alternativas TO authenticated;

DROP POLICY IF EXISTS "alternativas: gestor gerencia tudo" ON public.alternativas;
CREATE POLICY "alternativas: gestor gerencia tudo" ON public.alternativas
FOR ALL TO authenticated
USING (public.is_gestor())
WITH CHECK (public.is_gestor());

-- Perfis: Gestor pode visualizar e gerenciar todos os perfis
DROP POLICY IF EXISTS "perfis: gestor le tudo" ON public.perfis;
CREATE POLICY "perfis: gestor le tudo" ON public.perfis
FOR SELECT TO authenticated
USING (public.is_gestor() OR id = auth.uid());

DROP POLICY IF EXISTS "perfis: gestor atualiza papel" ON public.perfis;
CREATE POLICY "perfis: gestor atualiza papel" ON public.perfis
FOR UPDATE TO authenticated
USING (public.is_gestor());

-- Tentativas: Gestor visualiza as tentativas de todos os alunos
DROP POLICY IF EXISTS "tentativas: gestor le tudo" ON public.tentativas;
CREATE POLICY "tentativas: gestor le tudo" ON public.tentativas
FOR SELECT TO authenticated
USING (public.is_gestor() OR usuario_id = auth.uid());

-- Respostas: Gestor visualiza as respostas de todas as tentativas
DROP POLICY IF EXISTS "respostas: gestor le tudo" ON public.respostas;
CREATE POLICY "respostas: gestor le tudo" ON public.respostas
FOR SELECT TO authenticated
USING (
  public.is_gestor() OR
  EXISTS (
    SELECT 1 FROM public.tentativas t
    WHERE t.id = tentativa_id AND t.usuario_id = auth.uid()
  )
);

-- Certificados: Gestor visualiza todos os certificados emitidos
DROP POLICY IF EXISTS "certificados: gestor le tudo" ON public.certificados;
CREATE POLICY "certificados: gestor le tudo" ON public.certificados
FOR SELECT TO authenticated
USING (public.is_gestor() OR usuario_id = auth.uid());


-- 6. FUNÇÃO RPC PARA ANALYTICS E INDICADORES DA GESTÃO ----------------
CREATE OR REPLACE FUNCTION public.obter_metricas_gestao()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_gestor boolean;
  v_total_alunos integer;
  v_alunos_iniciaram integer;
  v_alunos_certificados integer;
  v_alunos_inativos_15_dias integer;
  v_taxa_conclusao numeric(5,2);
  v_questoes_ranking jsonb;
  v_desempenho_questionarios jsonb;
  v_alunos_lista jsonb;
BEGIN
  SELECT public.is_gestor() INTO v_is_gestor;
  IF NOT v_is_gestor THEN
    RAISE EXCEPTION 'Acesso negado: apenas gestores podem acessar os indicadores.';
  END IF;

  -- 1. Total de alunos cadastrados
  SELECT count(*) INTO v_total_alunos FROM public.perfis WHERE papel = 'aluno';

  -- 2. Alunos que iniciaram o curso (ao menos 1 tentativa registrada)
  SELECT count(DISTINCT usuario_id) INTO v_alunos_iniciaram FROM public.tentativas;

  -- 3. Alunos certificados
  SELECT count(*) INTO v_alunos_certificados FROM public.certificados;

  -- 4. Alunos inativos nos últimos 15 dias
  SELECT count(*) INTO v_alunos_inativos_15_dias
  FROM public.perfis p
  WHERE p.papel = 'aluno'
    AND p.criado_em < (now() - interval '15 days')
    AND NOT EXISTS (
      SELECT 1 FROM public.tentativas t
      WHERE t.usuario_id = p.id
        AND t.enviada_em >= (now() - interval '15 days')
    );

  -- 5. Taxa de conclusão geral (%)
  IF v_total_alunos > 0 THEN
    v_taxa_conclusao := round((v_alunos_certificados::numeric / v_total_alunos::numeric) * 100, 2);
  ELSE
    v_taxa_conclusao := 0;
  END IF;

  -- 6. Ranking de Questões com Maior Taxa de Erro (Dificuldades do curso)
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_questoes_ranking
  FROM (
    SELECT
      q.id AS questao_id,
      q.enunciado,
      quest.titulo AS questionario_titulo,
      count(r.id) AS total_respostas,
      count(r.id) FILTER (WHERE NOT r.correta) AS total_erros,
      CASE
        WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE NOT r.correta)::numeric / count(r.id)::numeric) * 100, 1)
        ELSE 0
      END AS taxa_erro
    FROM public.questoes q
    JOIN public.questionarios quest ON quest.id = q.questionario_id
    LEFT JOIN public.respostas r ON r.questao_id = q.id
    GROUP BY q.id, q.enunciado, quest.titulo
    HAVING count(r.id) > 0
    ORDER BY taxa_erro DESC, total_erros DESC
    LIMIT 10
  ) sub;

  -- 7. Desempenho e Médias por Questionário
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_desempenho_questionarios
  FROM (
    SELECT
      q.id AS questionario_id,
      q.titulo,
      q.tipo,
      count(t.id) AS total_tentativas,
      round(coalesce(avg(t.percentual), 0), 1) AS media_percentual,
      CASE
        WHEN q.tipo = 'FINAL' AND count(t.id) > 0 THEN
          round((count(t.id) FILTER (WHERE t.aprovado)::numeric / count(t.id)::numeric) * 100, 1)
        ELSE null
      END AS taxa_aprovacao
    FROM public.questionarios q
    LEFT JOIN public.tentativas t ON t.questionario_id = q.id
    GROUP BY q.id, q.titulo, q.tipo
    ORDER BY q.tipo DESC, q.titulo ASC
  ) sub;

  -- 8. Lista Detalhada de Alunos e Evasão
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_alunos_lista
  FROM (
    SELECT
      p.id,
      p.nome,
      u.email,
      p.criado_em,
      count(t.id) AS total_tentativas,
      max(t.enviada_em) AS ultimo_acesso,
      CASE
        WHEN p.criado_em < (now() - interval '15 days')
             AND (max(t.enviada_em) IS NULL OR max(t.enviada_em) < (now() - interval '15 days'))
        THEN true
        ELSE false
      END AS inativo_15_dias,
      EXISTS(SELECT 1 FROM public.certificados c WHERE c.usuario_id = p.id) AS certificado
    FROM public.perfis p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.tentativas t ON t.usuario_id = p.id
    WHERE p.papel = 'aluno'
    GROUP BY p.id, p.nome, u.email, p.criado_em
    ORDER BY p.criado_em DESC
    LIMIT 100
  ) sub;

  RETURN jsonb_build_object(
    'total_alunos', v_total_alunos,
    'alunos_iniciaram', v_alunos_iniciaram,
    'alunos_certificados', v_alunos_certificados,
    'alunos_inativos_15_dias', v_alunos_inativos_15_dias,
    'taxa_conclusao', v_taxa_conclusao,
    'questoes_ranking', v_questoes_ranking,
    'desempenho_questionarios', v_desempenho_questionarios,
    'alunos_lista', v_alunos_lista
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_metricas_gestao() TO authenticated;

