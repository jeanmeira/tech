# Bestiário Técnico

## A

**Acoplamento Elevado**: Sintoma técnico em que diferentes partes de um sistema são tão interdependentes que uma mudança em um componente exige mudanças em outros, muitas vezes de forma inesperada.

**ADR (Architecture Decision Record)**: Documento que registra uma decisão arquitetural importante, incluindo o contexto, as opções consideradas e as razões da escolha.

**API (Application Programming Interface)**: Interface que permite a comunicação entre diferentes sistemas ou componentes de software.

**Arquitetura Fantasma**: Conjunto de decisões técnicas invisíveis e não documentadas que ditam o comportamento e as fragilidades de um sistema.

## C

**Canary Release (Lançamento Canário)**: Estratégia de implantação de software na qual uma nova versão é liberada para um pequeno subconjunto de usuários antes de ser disponibilizada para todos. Isso ajuda a minimizar o impacto de possíveis problemas.

**CI/CD (Continuous Integration/Continuous Deployment)**: Práticas de integração contínua e entrega/deploy contínuo que automatizam o processo de construção, teste e implantação de software.

**Configuração Mágica**: Tipo de fantasma arquitetural caracterizado por um valor de configuração (número, string, etc.) cujo propósito original foi esquecido, mas que é mantido por medo de que sua alteração cause falhas no sistema.

**Conhecimento Tribal**: Informações críticas sobre um sistema que residem apenas na mente de algumas pessoas, em vez de em documentação acessível, tornando a equipe dependente de "heróis".

**CQRS (Command Query Responsibility Segregation)**: Padrão arquitetural que separa operações de leitura (queries) das operações de escrita (commands) em diferentes modelos.

**CRUD (Create, Read, Update, Delete)**: Quatro operações básicas de persistência de dados em sistemas de informação.

## D

**Deploy**: Processo de colocar uma nova versão do software em produção ou em ambiente de teste.

**Deploy Manual**: Tipo de fantasma arquitetural que se manifesta como um ritual complexo e não documentado de comandos necessários para implantar uma nova versão do sistema, conhecido por poucas pessoas.

**Dependência Órfã**: Componente ou configuração do sistema cuja razão de existir foi perdida, mas que continua sendo usado por outros componentes.

**Dívida Técnica**: Metáfora que descreve as consequências a longo prazo de escolhas de design ou implementação feitas para acelerar o desenvolvimento, que resultam em trabalho extra futuro (juros).

## F

**Feature Flag**: Técnica que permite ligar ou desligar funcionalidades de um sistema sem fazer um novo deploy, usando configurações.

**Fintech**: Empresa que oferece serviços financeiros usando tecnologia inovadora.

## G

**Git Blame**: Comando do Git que mostra quem modificou cada linha de um arquivo e quando, útil para rastrear a origem de mudanças.

## L

**Lei de Conway**: Princípio que afirma que a arquitetura de um sistema de software será um reflexo da estrutura de comunicação da organização que o construiu.

**Legacy Code**: Código legado, frequentemente definido como código sem testes ou código cujo contexto original foi perdido.

## M

**Microserviço**: Arquitetura que estrutura uma aplicação como uma coleção de serviços pequenos e independentes que se comunicam via rede.

**Microserviço Misterioso**: Tipo de fantasma arquitetural caracterizado por um serviço em produção cujas responsabilidades e dependências não são compreendidas pela equipe.

## O

**Ownership Técnico**: Responsabilidade clara de uma pessoa ou equipe sobre um componente específico do sistema.

## P

**Padrão Strangler Fig**: Técnica de refatoração que substitui gradualmente um sistema antigo por um novo, permitindo que ambos coexistam temporariamente.

**Proxy**: Servidor intermediário que atua como um ponto de controle entre clientes e outros servidores. No Padrão Strangler Fig, é usado para rotear o tráfego entre o sistema antigo e o novo.

**Pull Request**: Solicitação para integrar mudanças de código em um repositório, geralmente submetida à revisão por pares.

## R

**Redis**: Sistema de estrutura de dados em memória usado como banco de dados, cache e message broker.

**Refatoração**: Processo de reestruturar código existente sem alterar seu comportamento externo, com o objetivo de melhorar sua qualidade interna.

## S

**Segurança Psicológica**: Crença compartilhada por membros de uma equipe de que o ambiente é seguro para tomar riscos interpessoais, como fazer perguntas, admitir erros ou propor novas ideias sem medo de punição ou humilhação.

**SLA (Service Level Agreement)**: Acordo que define o nível de serviço esperado, incluindo métricas como disponibilidade e tempo de resposta.

**SRE (Site Reliability Engineering)**: Disciplina que aplica aspectos da engenharia de software às operações de infraestrutura e sistemas.

**Stack**: Conjunto de tecnologias usadas para desenvolver e executar uma aplicação.

## T

**Timeout**: Período máximo de espera por uma resposta antes que uma operação seja considerada falhada.

**TODO**: Comentário no código indicando uma tarefa que deve ser feita posteriormente, frequentemente esquecida e transformada em fantasma.

## Y

**YAML**: Formato de serialização de dados legível por humanos, comumente usado para arquivos de configuração.
