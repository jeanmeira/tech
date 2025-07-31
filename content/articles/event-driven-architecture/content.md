# Event-Driven Architecture: Além do Hype

Event-driven architecture (EDA) virou o buzzword favorito de arquitetos de software. Toda apresentação sobre microsserviços menciona eventos, todo sistema "moderno" precisa ser event-driven. Mas como alguém que implementou sistemas orientados a eventos em produção por anos, posso dizer: **nem sempre é a resposta**.

Vou compartilhar uma visão pragmática sobre quando eventos fazem sentido, os custos ocultos que ninguém menciona, e estratégias que realmente funcionam em produção.

![Event-Driven Architecture](assets/event-driven.png)

## O Que É Event-Driven Architecture (Realmente)

EDA não é apenas "pub/sub com extra steps". É uma abordagem arquitetural onde:

- **Componentes comunicam através de eventos**
- **Produtores não conhecem consumidores**
- **Estado é derivado de eventos**
- **Processamento pode ser assíncrono**

### Event vs. Message vs. Command

Confusão comum que gera arquiteturas ruins:

```
Event: "User registered" (algo que aconteceu)
Command: "Register user" (pedido para fazer algo)  
Message: "Here's user data" (transferência de informação)
```

**Events são imutáveis e representam fatos**. Commands podem falhar, events já aconteceram.

### O Espectro Event-Driven

```
Polling → Webhooks → Message Queues → Event Streams → Event Sourcing
```

Não é binário - você pode começar simples e evoluir conforme necessidade.

## Quando Eventos Fazem Sentido

### Cenários Ideais

1. **Integração entre sistemas independentes**
   - E-commerce: Order → Inventory → Shipping → Email
   - Cada sistema tem seu próprio domínio
   - Falha em um não para os outros

2. **Processamento em tempo real**
   - Fraud detection em transações
   - Real-time analytics e dashboards
   - IoT data processing

3. **Auditoria e compliance**
   - Event sourcing para trilha completa
   - Regulatory requirements
   - Debugging complexo de estados

4. **Scaling diferenciado**
   - Alguns eventos processados milhões de vezes
   - Outros uma vez por dia
   - Resource allocation otimizada

### Padrões que Funcionam

#### Fan-out Pattern
```
Order Created → [Inventory, Shipping, Email, Analytics, Fraud Detection]
```

Um evento dispara múltiplos processamentos independentes.

#### Event Choreography
```
User Signup → Email Service → Welcome Email Sent → Analytics Service
```

Cada serviço reage e produz novos eventos conforme necessário.

#### Event Orchestration
```
Saga Manager → Commands → Services → Events → Saga Manager
```

Coordenação centralizada para workflows complexos.

## Os Custos Ocultos

### Debugging Distribuído

**Requisição REST falha**:
- Status 500, stack trace, logs no mesmo lugar
- Reprodução local simples

**Event processing falha**:
- Evento processado 3 horas depois
- Falha pode estar em qualquer consumidor
- Dead letter queues cheias de eventos misteriosos
- Correlation IDs espalhados por 5+ sistemas

### Eventual Consistency

```sql
-- Monolito
BEGIN TRANSACTION;
UPDATE orders SET status = 'paid';
UPDATE inventory SET quantity = quantity - 1;
COMMIT;

-- Event-driven
Order Paid Event → Inventory Service (maybe in 5 minutes)
User sees "paid" but inventory not updated yet
```

**Realidade**: seus usuários vão reportar "bugs" de inconsistência.

### Message Ordering

```
Event 1: User updated name to "John"
Event 2: User updated name to "Jane"

Consumer receives: Event 2, Event 1
Final state: "John" (wrong!)
```

Ordering guarantees são caros e limitam paralelismo.

### Operational Complexity

**Single service deployment**: 1 artifact, 1 configuration
**Event-driven system**: N services + Message broker + Schema registry + Monitoring

## Quando NÃO Usar Eventos

### 1. Request-Response Natural

```python
# Simples e correto
def get_user_profile(user_id):
    return database.get_user(user_id)

# Complicação desnecessária
def get_user_profile(user_id):
    publish_event("GetUserProfile", {"user_id": user_id})
    # Como retornar resposta???
```

Se você precisa de resposta imediata, use API síncrona.

### 2. Strong Consistency Requirements

Banking transactions, inventory management crítico, payment processing - eventual consistency pode ser inaceitável.

### 3. Debugging Complexo

Se seu time ainda luta para debuggar APIs REST, eventos vão multiplicar a complexidade por 10.

### 4. Small Teams

5 pessoas mantendo 15 event consumers é receita para burnout operacional.

## Ferramentas e Tecnologias

### Message Brokers

**Apache Kafka**
- ✅ High throughput, durability, ordering
- ❌ Operational complexity, learning curve
- **Use quando**: millions of events/day

**RabbitMQ**
- ✅ Feature-rich, easier ops, good tooling
- ❌ Lower throughput que Kafka
- **Use quando**: complex routing needs

**Redis Streams**
- ✅ Simple, familiar, good performance
- ❌ Limited durability guarantees
- **Use quando**: real-time processing

**Cloud Managed** (SQS, Cloud Pub/Sub, EventHub)
- ✅ Zero ops, good integrations
- ❌ Vendor lock-in, cost at scale
- **Use quando**: small-medium scale

### Event Sourcing

**EventStore**
- ✅ Purpose-built, good projections
- ❌ .NET focused, niche

**Apache Kafka + KSQL**
- ✅ Stream processing, good ecosystem
- ❌ Complex setup

**Custom Implementation**
- ✅ Fits exact needs
- ❌ Você vai reimplementar mal o que já existe

## Implementação Prática

### Schema Evolution

```json
// Version 1
{
  "event_type": "user_registered",
  "user_id": "123",
  "email": "user@example.com"
}

// Version 2 - Backward compatible
{
  "event_type": "user_registered", 
  "schema_version": "2.0",
  "user_id": "123",
  "email": "user@example.com",
  "registration_source": "web" // new field
}
```

**Schema registry é obrigatório** para evitar quebrar consumidores.

### Dead Letter Queues

```python
def process_event(event):
    try:
        handle_event(event)
    except RetryableError:
        retry_queue.send(event, delay=exponential_backoff())
    except FatalError:
        dead_letter_queue.send(event)
        alert_operations(f"Fatal error processing {event.id}")
```

**Monitoring DLQs é crítico** - eventos perdidos = bugs silenciosos.

### Idempotency

```python
@idempotent(key="event_id")
def handle_order_created(event):
    # Safe to process multiple times
    order = Order.create(event.data)
    send_confirmation_email(order.email)
```

**Duplicate events vão acontecer** - design para idempotência desde o início.

## Minha Experiência na Prática

### Case Study: E-commerce Platform

**Contexto**: 100k orders/day, 20+ microservices

**Event-driven wins**:
- **Resilience**: Payment failures não paravam inventory updates
- **Scalability**: Analytics processava events offline
- **Auditability**: Event sourcing salvou em auditorias

**Event-driven losses**:
- **Debugging nightmare**: "Why didn't email send?" = 3 hours investigation
- **Eventual consistency bugs**: Users complained sobre inventory discrepancies
- **Operational overhead**: Kafka cluster, schema registry, monitoring

### Lessons Learned

1. **Start with synchronous APIs**, add events para integration
2. **Invest heavily in observability** antes de ir all-in
3. **Dead letter queues são seus amigos** - monitor religiosamente
4. **Schema evolution strategy** desde o dia 1
5. **Correlation IDs em tudo** - debugging vai precisar

### O Que Eu Faria Diferente

1. **Hybrid approach**: Core business logic síncrono, integration assíncrona
2. **Fewer event types**: 5 well-designed events > 50 granular events
3. **Better tooling**: Custom dashboards para event flow tracing
4. **Circuit breakers**: Para quando event processing fica lento

## Estratégias de Implementação

### Pattern: API First, Events Second

1. **Core business operations** via REST/GraphQL
2. **Integration events** para side effects
3. **Analytics events** para reporting
4. **Migrate gradually** conforme ganha confiança

### Strangler Fig para Events

```
Legacy: Synchronous calls
New: Publish events + keep sync calls
Future: Pure event-driven (maybe)
```

### Event Storming

**Workshop com stakeholders**:
- Mapear domain events naturais
- Identificar bounded contexts
- Design event schemas collaboratively

## Ferramentas de Observabilidade

### Event Tracing

```python
# Correlate events across services
event = {
    "correlation_id": "req-123",
    "causation_id": "event-456", 
    "event_id": "event-789",
    "data": {...}
}
```

### Monitoring Essencial

- **Event lag**: Quanto tempo para processar
- **Dead letter queue size**: Eventos falhando
- **Consumer throughput**: Gargalos de processamento
- **Schema compatibility**: Breaking changes

### Tooling Stack

- **Kafka UI**: akhq, kafdrop para visualização
- **Jaeger/Zipkin**: Distributed tracing
- **Grafana**: Event flow dashboards
- **PagerDuty**: Alerting em DLQ buildup

## Conclusion

Event-driven architecture é poderosa, mas não é simples. É uma ferramenta para problemas específicos, não uma arquitetura padrão.

**Use eventos quando**:
- Integration entre sistemas independentes
- Auditability é crítica
- Scaling diferenciado é necessário
- Time tem experiência com sistemas distribuídos

**Evite quando**:
- Request-response é natural
- Strong consistency é obrigatória
- Time é pequeno sem experiência
- Debugging atual já é complexo

**Lembre-se**: você pode sempre adicionar eventos, mas removê-los de um sistema running é muito mais difícil.

### Próximos Passos

1. **Identifique integration points** no seu sistema atual
2. **Comece com eventos de notificação** simples
3. **Invista em observability** desde o início
4. **Meça impact**: latência, throughput, operability

Event-driven architecture é sobre trade-offs, não sobre ser "modern". Escolha conscientemente baseado em necessidades reais, não em hype.
