# Database Design: SQL vs NoSQL na Prática

A guerra entre SQL e NoSQL consumiu mais energia de engenheiros que qualquer outro debate técnico da última década. Cada lado tem seus evangelistas, cada tecnologia promete ser a "solução definitiva". 

Depois de arquitetar sistemas com PostgreSQL, MongoDB, Redis, Cassandra e DynamoDB em produção, posso dizer: **o debate está errado**. A pergunta não é "SQL ou NoSQL?", mas "qual ferramenta resolve meu problema específico?".

Vou compartilhar uma análise pragmática baseada em casos reais, métricas de produção e custos operacionais que raramente são discutidos.

![Database Design](assets/database-design.png)

## O Mito da Escolha Binária

### SQL vs NoSQL é Falsa Dicotomia

```
Realidade: PostgreSQL + Redis + S3 + Analytics Warehouse
Não: "Escolha UM database para tudo"
```

**Polyglot persistence** não é hype - é necessidade em sistemas complexos.

### CAP Theorem na Prática

**Consistency, Availability, Partition Tolerance**: escolha 2 de 3.

```
PostgreSQL: CP (Consistency + Partition tolerance)
MongoDB: AP (Availability + Partition tolerance) 
Redis: AP (com diferentes trade-offs)
```

**Realidade**: você precisa de diferentes garantias para diferentes dados.

## SQL: Quando e Por Quê

### Cenários Ideais

1. **ACID Transactions Obrigatórias**
   - Financial systems
   - Inventory management  
   - User account operations
   - Qualquer coisa onde consistency > availability

2. **Complex Queries e Reporting**
   - JOINs entre múltiplas entidades
   - Aggregations complexas
   - Ad-hoc analytics
   - Business intelligence

3. **Schema Bem Definido**
   - Domain models estáveis
   - Data integrity é crítica
   - Foreign key constraints fazem sentido

4. **Team Expertise**
   - SQL é conhecimento universal
   - Tooling maduro (pgAdmin, DataGrip)
   - Debugging familiar

### PostgreSQL: O Canivete Suíço

```sql
-- JSON support (NoSQL-like)
SELECT data->>'name' FROM users WHERE data @> '{"active": true}';

-- Full-text search
SELECT * FROM articles WHERE to_tsvector(content) @@ to_tsquery('microservices');

-- Arrays e ranges
SELECT * FROM events WHERE date_range @> '2025-01-01'::date;
```

**PostgreSQL hoje**: 90% dos casos de uso, performance excelente, feature-rich.

### Quando SQL Falha

**Scale-out horizontal é doloroso**:
- Sharding manual é complexo
- Cross-shard JOINs são caros
- Consistency entre shards é difícil

**Schema migrations em high-scale**:
- ALTER TABLE pode lockear tabela por horas
- Downtime para schema changes
- Backwards compatibility é essencial

## NoSQL: Casos de Uso Específicos

### Document Stores (MongoDB, CouchDB)

**Ideal para**:
```javascript
// Schema-less data
{
  "user_id": "123",
  "profile": {
    "name": "John",
    "preferences": {...}, // varies per user
    "custom_fields": {...} // customer-specific
  }
}
```

**Real benefits**:
- Rapid prototyping sem schema changes
- Nested data structures naturais  
- Horizontal scaling built-in
- Developer velocity para MVPs

**Hidden costs**:
- No schema = runtime errors inevitáveis
- JOIN operations são caras/limitadas
- Data consistency mais complexa
- Query optimization é mais difícil

### Key-Value Stores (Redis, DynamoDB)

**Performance cases**:
```python
# Session storage
redis.set(f"session:{token}", user_data, ex=3600)

# Real-time leaderboards  
redis.zadd("leaderboard", {user_id: score})

# Caching layer
redis.set(f"user:{id}", json.dumps(user), ex=300)
```

**Quando usar**:
- Sub-millisecond latency requirements
- Simple data models
- High read/write ratios
- Caching layers

### Column Stores (Cassandra, HBase)

**Analytics workloads**:
```sql
-- Time-series data
CREATE TABLE metrics (
    metric_name text,
    timestamp timestamp,
    value double,
    PRIMARY KEY (metric_name, timestamp)
);
```

**Strengths**:
- Massive write throughput
- Time-series data natural
- Linear scalability
- High availability

**Complexities**:
- Query patterns must be known upfront
- No JOINs, limited aggregations
- Eventual consistency model
- Operational complexity

## Performance: Números Reais

### Throughput Comparison

**PostgreSQL** (single node, optimized):
- Reads: ~10k QPS
- Writes: ~5k QPS  
- Complex queries: ~100 QPS

**MongoDB** (3-node replica set):
- Reads: ~15k QPS
- Writes: ~8k QPS
- Aggregations: ~500 QPS

**Redis** (single node):
- Simple operations: ~100k+ QPS
- Complex operations: ~10k QPS

**DynamoDB** (provisioned):
- Point reads: ~4k RCU = 4k QPS
- Writes: ~1k WCU = 1k QPS
- Scans: Very limited

### Latency Reality

```
PostgreSQL: p50=1ms, p99=10ms (local network)
MongoDB: p50=2ms, p99=50ms (replica set)
Redis: p50=0.1ms, p99=1ms (same machine)
DynamoDB: p50=10ms, p99=100ms (AWS network)
```

**Network latency dominates** em distributed systems.

## Operational Complexity

### PostgreSQL Operations

**Backup/Recovery**:
```bash
# Point-in-time recovery
pg_basebackup + WAL shipping
# Logical backups
pg_dump --jobs=4 large_db
```

**Monitoring essencial**:
- Connection pools
- Lock contention  
- Query performance
- Disk space/IO

**Skills needed**: 1-2 DBAs para production

### MongoDB Operations

**Replica set management**:
```javascript
// Primary failover
rs.stepDown()
// Add new secondary
rs.add("new-host:27017")
```

**Sharding complexity**:
- Shard key design é crítico
- Balancer operations
- Orphaned documents cleanup

**Skills needed**: MongoDB-specific expertise

### Redis Operations

**Persistence models**:
```
RDB: Point-in-time snapshots
AOF: Append-only file (every operation)
```

**Memory management**:
- Eviction policies (LRU, LFU)
- Memory fragmentation
- Swap usage = death

**Skills needed**: Caching expertise, memory optimization

## Cost Analysis: Hidden Factors

### Infrastructure Costs

**PostgreSQL**:
- Single powerful machine: $500-2000/month
- Read replicas: +$300/replica
- Managed (RDS): +30% markup

**MongoDB Atlas**:
- 3-node cluster: $600-3000/month
- Dedicated clusters only
- Bandwidth charges

**Redis**:
- Memory-optimized instances: $200-1000/month
- ElastiCache: +25% markup
- Clustering adds complexity/cost

### Operational Costs

**Learning curve**:
- SQL: 2-4 weeks for competency
- MongoDB: 2-3 months for production-ready
- Redis: 1-2 months for proper usage
- Cassandra: 6+ months expertise

**Tool ecosystem**:
- SQL: Rich tooling, ORMs, monitoring
- NoSQL: Fragmented ecosystem, vendor-specific tools

## Migration Strategies

### SQL to NoSQL

**Common reasons**:
- Scale-out requirements
- Schema flexibility needs
- Performance requirements

**Pattern: Dual-write**:
```python
def create_user(user_data):
    # Write to both systems
    postgres.create_user(user_data)
    mongodb.create_user(user_data)
    
    # Read from new system
    return mongodb.get_user(user_data['id'])
```

**Challenges**:
- Data consistency during migration
- Query pattern changes
- Application logic rewrite

### NoSQL to SQL

**Common reasons**:
- Query complexity growth
- Consistency requirements
- Operational simplicity

**Pattern: ETL approach**:
```python
# Extract from NoSQL
data = mongodb.find_all_users()

# Transform to relational
for user in data:
    normalized = normalize_user_data(user)
    postgres.insert_user(normalized)
```

## Hybrid Architectures

### Polyglot Persistence Patterns

**Command Query Responsibility Segregation (CQRS)**:
```
Commands → PostgreSQL (consistency)
Queries → Elasticsearch (performance)
Cache → Redis (speed)
Analytics → ClickHouse (aggregations)
```

**Event sourcing + projections**:
```
Events → Event store (Kafka/EventStore)
Read models → Multiple databases optimized per use case
```

### Real Example: E-commerce

```
User accounts → PostgreSQL (ACID requirements)
Product catalog → Elasticsearch (search + filtering)  
Session data → Redis (speed + TTL)
Order events → Kafka (audit trail)
Analytics → ClickHouse (reporting)
Images → S3 (blob storage)
```

**Each database optimized for specific access patterns**.

## Decision Framework

### Choose SQL When:

1. **ACID transactions são obrigatórias**
2. **Complex relationships** entre dados
3. **Ad-hoc queries** são necessárias
4. **Team tem SQL expertise**
5. **Data integrity > availability**

### Choose NoSQL When:

1. **Scale-out horizontal** é obrigatório
2. **Schema evolution** é frequente
3. **Simple access patterns** bem definidos
4. **Specific performance requirements** (latency, throughput)
5. **Availability > consistency**

### Decision Tree

```
Need ACID transactions? → SQL
Need complex queries? → SQL
Need horizontal scale? → NoSQL
Schema changes frequently? → NoSQL
Team expertise? → Matches current skills
Performance requirements? → Benchmark specifically
```

## Minha Experiência na Prática

### Case Study 1: Analytics Platform

**Initial choice**: MongoDB (document flexibility)
**Reality**: Complex aggregations killed performance
**Solution**: Migrated to PostgreSQL + TimescaleDB
**Result**: 10x query performance, simpler operations

### Case Study 2: Real-time Gaming

**Initial choice**: PostgreSQL (familiar)
**Reality**: Latency requirements impossible
**Solution**: Redis for game state, PostgreSQL for persistence
**Result**: <1ms latency, eventual consistency acceptable

### Case Study 3: E-commerce Platform

**Final architecture**:
- **PostgreSQL**: Orders, users, inventory
- **Elasticsearch**: Product search, recommendations
- **Redis**: Sessions, caching, real-time features
- **S3**: Images, documents
- **ClickHouse**: Analytics, reporting

**Lessons**: No single database fits all use cases.

## Tools e Ecosystem

### SQL Ecosystem

**ORMs**: Django ORM, SQLAlchemy, Hibernate
**Migration tools**: Flyway, Liquibase, Alembic
**Monitoring**: pg_stat_statements, DataDog, New Relic
**Backup**: WAL-E, Barman, cloud-native solutions

### NoSQL Ecosystem

**MongoDB**: Mongoose, Motor, MongoDB Compass
**Redis**: RedisInsight, Redis Sentinel, Redis Cluster
**DynamoDB**: AWS SDK, DynamoDB Streams, DAX

**Reality**: SQL ecosystem is more mature and standardized.

## Future Considerations

### NewSQL Databases

**CockroachDB, TiDB, Spanner**:
- SQL interface + horizontal scale
- Distributed ACID transactions
- Higher operational complexity
- Still maturing ecosystem

### Serverless Databases

**Aurora Serverless, CosmosDB Serverless**:
- Pay-per-use pricing
- Auto-scaling
- Cold start latency
- Good for variable workloads

## Conclusion

SQL vs NoSQL é uma pergunta mal formulada. A pergunta certa é: **qual combinação de ferramentas resolve meus problemas específicos?**

**Start with PostgreSQL** para maioria dos casos:
- Covers 90% das necessidades
- Mature ecosystem
- Team expertise disponível
- Easy operational model

**Add NoSQL quando necessário**:
- Specific performance requirements
- Scale-out horizontal obrigatório
- Schema flexibility crítica

**Avoid premature optimization**:
- Measure before migrating
- Understand operational costs
- Consider team expertise

### Próximos Passos

1. **Audit current database usage** - where are the pain points?
2. **Benchmark specific workloads** - don't trust generic benchmarks
3. **Consider hybrid approaches** - polyglot persistence
4. **Invest in monitoring** - você precisa de dados para decidir

Database choice é sobre trade-offs, não sobre trends. Escolha baseado em necessidades reais, não em hype de conferências.
