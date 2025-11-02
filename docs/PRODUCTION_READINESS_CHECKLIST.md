# Phase 1 Production Readiness Checklist

**Version**: 1.0
**Target Launch**: January 20, 2026
**Last Updated**: November 2, 2025

Use this checklist to verify Phase 1 is production-ready before deploying.

---

## ✅ Pre-Deployment Checklist

### 1. Code & Build

- [ ] All Phase 1 code merged to main branch
- [ ] TypeScript compiles without errors (`npm run check`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No critical security vulnerabilities (`npm audit`)
- [ ] Dependencies up to date (no outdated critical packages)
- [ ] Git repository clean (no uncommitted changes)
- [ ] Version tag created (e.g., `v1.1.0-phase1`)

**Validation Command**:
```bash
npm run check && npm run build && npm audit --production
```

---

### 2. Database

- [ ] pgvector extension installed on production database
- [ ] Migration `001_add_pgvector.sql` applied successfully
- [ ] Vector columns exist on `timeline_entries` and `timeline_sources`
- [ ] IVFFlat indexes created (verify with `\d timeline_entries`)
- [ ] `embedding_coverage` view exists and queryable
- [ ] `find_similar_entries()` function exists
- [ ] Database backup completed before migration
- [ ] Rollback plan documented

**Validation Command**:
```bash
psql $DATABASE_URL -c "\d timeline_entries" | grep embedding
psql $DATABASE_URL -c "SELECT * FROM embedding_coverage;"
```

---

### 3. Environment Variables

**Production Environment** (`.env.production` or equivalent):

- [ ] `DATABASE_URL` - PostgreSQL connection string (with pgvector)
- [ ] `OPENAI_API_KEY` - Valid OpenAI API key
- [ ] `ANTHROPIC_API_KEY` - Valid Anthropic API key
- [ ] `EMBEDDING_MODEL=text-embedding-3-small`
- [ ] `EMBEDDING_DIMENSIONS=1536`
- [ ] `ENABLE_HYBRID_SEARCH=true`
- [ ] `ENABLE_RAG=true`
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000` (or your production port)

**Security Check**:
- [ ] No `.env` files committed to git
- [ ] API keys rotated from staging keys
- [ ] Secrets stored in secure vault (not plaintext)

**Validation Command**:
```bash
./scripts/validate-deployment.sh production
```

---

### 4. Embeddings

- [ ] Embedding generation tested on staging
- [ ] Initial embedding job completed for production data
- [ ] Embedding coverage ≥95% of active timeline entries
- [ ] No failures in embedding generation logs
- [ ] Cost per 1000 documents validated (~$0.01)
- [ ] Monthly cost projection within budget ($250-500)

**Validation Commands**:
```bash
# Check coverage
curl http://localhost:5000/api/admin/embeddings/coverage

# Or via npm script
npm run embeddings:coverage

# Generate if needed
npm run embeddings:generate
```

**Coverage Target**: ≥95% of timeline entries should have embeddings

---

### 5. API Testing

All endpoints tested and passing:

- [ ] `GET /api/timeline/search/hybrid` - Hybrid search works
- [ ] `GET /api/timeline/search/keyword` - Keyword fallback works
- [ ] `GET /api/timeline/search/semantic` - Semantic search works
- [ ] `POST /api/timeline/ask` - RAG Q&A works
- [ ] `POST /api/timeline/ask/batch` - Batch queries work
- [ ] `GET /api/timeline/summary/:caseId` - Summary generation works
- [ ] `GET /api/timeline/analyze/gaps/:caseId` - Gap analysis works
- [ ] `POST /api/admin/embeddings/generate` - Embedding job starts
- [ ] `GET /api/admin/embeddings/coverage` - Coverage stats work
- [ ] `POST /api/admin/embeddings/estimate-cost` - Cost estimation works

**Validation Command**:
```bash
TEST_CASE_ID=<uuid> npm test
```

---

### 6. Performance

- [ ] Hybrid search p95 latency <1000ms
- [ ] Keyword search p95 latency <500ms
- [ ] RAG Q&A p95 latency <3000ms
- [ ] Embedding generation handles batch of 100 without timeout
- [ ] Database query performance acceptable (pgvector indexes working)
- [ ] Load testing completed (if expected high traffic)

**Performance Targets**:
- Hybrid search: <1000ms p95
- Keyword search: <500ms p95
- RAG Q&A: <3000ms p95

**Load Test** (optional):
```bash
# Use Apache Bench or similar
ab -n 100 -c 10 "http://localhost:5000/api/timeline/search/hybrid?caseId=<uuid>&query=test"
```

---

### 7. Error Handling

- [ ] Graceful fallback when embeddings unavailable (uses keyword search)
- [ ] Graceful fallback when OpenAI API fails
- [ ] Graceful fallback when Anthropic API fails
- [ ] Proper error messages returned to client (no stack traces)
- [ ] Error logging configured
- [ ] Sentry/error tracking integrated (optional but recommended)

**Test Scenarios**:
- Invalid case ID → 400 error with clear message
- Empty query → 400 error
- API key revoked → Falls back to keyword search
- Database down → Returns 500 with generic message

---

### 8. Monitoring & Observability

- [ ] Application logs configured (stdout/file)
- [ ] Log rotation configured (if file-based)
- [ ] Error alerting configured (email/Slack/PagerDuty)
- [ ] Performance metrics dashboard (optional)
- [ ] API usage tracking (OpenAI + Anthropic)
- [ ] Cost monitoring dashboard
- [ ] Uptime monitoring configured

**Recommended Metrics**:
- Request latency (p50, p95, p99)
- Error rate (5xx responses)
- API call count (OpenAI, Anthropic)
- Monthly API cost ($)
- Embedding coverage (%)
- Search result quality (click-through rate)

**Tools** (choose one or more):
- Datadog
- New Relic
- Prometheus + Grafana
- CloudWatch (if on AWS)
- Simple logs + cron email

---

### 9. Backup & Recovery

- [ ] Database backup strategy documented
- [ ] Database backup tested and verified
- [ ] Application backup (code + config) to Google Drive via rclone
- [ ] Rollback procedure documented
- [ ] Restore procedure tested
- [ ] Disaster recovery runbook created

**Backup Frequency**:
- Database: Daily (automated)
- Code: On every deployment (git tag)
- Google Drive: Daily (via rclone script)

**Recovery Time Objective**: <4 hours

---

### 10. Documentation

- [ ] `PHASE1_DEPLOYMENT_GUIDE.md` reviewed and accurate
- [ ] API documentation updated (OpenAPI spec or equivalent)
- [ ] User-facing documentation created ("How to use semantic search")
- [ ] Internal runbook created (operations team)
- [ ] Troubleshooting guide created
- [ ] Known issues documented

**Required Docs**:
- Deployment guide (for engineers)
- User guide (for end users)
- Operations runbook (for on-call team)
- Troubleshooting FAQ

---

### 11. Security

- [ ] API keys stored securely (vault/secrets manager)
- [ ] Database credentials rotated
- [ ] HTTPS enabled (TLS/SSL certificate valid)
- [ ] Authentication required for all endpoints
- [ ] Rate limiting configured (prevent abuse)
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (using parameterized queries)
- [ ] No sensitive data in logs (API keys, user data)
- [ ] CORS configured appropriately
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)

**Security Scan**:
```bash
npm audit --production
# Review and fix any high/critical vulnerabilities
```

---

### 12. Cost Management

- [ ] Monthly budget approved ($250-500 for Phase 1)
- [ ] Cost alerts configured (notify if >$500/month)
- [ ] API usage limits set (prevent runaway costs)
- [ ] Cost tracking dashboard created
- [ ] Cost optimization reviewed (batching, caching, etc.)

**Cost Breakdown** (monthly estimate):
- OpenAI embeddings: $50-150
- Anthropic RAG: $100-200
- Compute/hosting: $100-150
- **Total**: $250-500/month

**Budget Alerts**:
- Warning at $400/month
- Critical at $600/month

---

### 13. User Acceptance Testing

- [ ] Beta users identified and invited
- [ ] User feedback mechanism in place
- [ ] User satisfaction survey prepared
- [ ] Success metrics defined (search relevance, time saved)
- [ ] A/B testing configured (new vs old search) - optional
- [ ] Feedback loop documented

**UAT Checklist**:
- 5-10 beta users
- 2 weeks testing period
- Daily feedback collection
- Success criteria: ≥80% satisfaction

---

### 14. Rollout Plan

- [ ] Gradual rollout strategy defined (10% → 25% → 50% → 100%)
- [ ] Feature flag configured (`ENABLE_HYBRID_SEARCH`)
- [ ] Rollout schedule created
- [ ] Rollback criteria defined
- [ ] Communication plan created (announce to users)

**Rollout Schedule** (recommended):
- Week 1: 10% of users
- Week 2: 25% of users (if no issues)
- Week 3: 50% of users
- Week 4: 100% rollout

**Rollback Triggers**:
- Error rate >5%
- Latency p95 >2000ms
- User complaints >10%
- API costs >$1000/month

---

### 15. Team Readiness

- [ ] Engineering team trained on Phase 1 architecture
- [ ] Operations team trained on deployment procedure
- [ ] Support team trained on new features
- [ ] On-call rotation scheduled
- [ ] Escalation path documented
- [ ] Post-deployment support plan

**Training Materials**:
- Architecture diagram
- Deployment runbook
- Troubleshooting guide
- FAQ document

---

## 🚀 Pre-Launch Validation

**Final Validation** (run this 24 hours before launch):

```bash
# 1. Run deployment validation script
./scripts/validate-deployment.sh production

# 2. Run integration tests
TEST_CASE_ID=<production-case-id> npm test

# 3. Check embedding coverage
npm run embeddings:coverage

# 4. Verify API keys
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# 5. Database health check
psql $DATABASE_URL -c "SELECT * FROM embedding_coverage;"

# 6. Performance spot check
time curl "http://localhost:5000/api/timeline/search/hybrid?caseId=<uuid>&query=test"
```

**All checks must pass before proceeding with launch.**

---

## 📊 Success Criteria

Phase 1 is successful if after 30 days:

- [ ] **Search recall improved 50-70%** vs keyword-only baseline
- [ ] **User satisfaction ≥85%** ("found what I was looking for")
- [ ] **p95 response time <1000ms** for hybrid search
- [ ] **RAG accuracy ≥80%** on evaluation dataset
- [ ] **Monthly costs <$500** (within budget)
- [ ] **Zero critical production incidents**
- [ ] **Uptime ≥99.5%**

---

## 🚨 Go/No-Go Decision

**Go** if:
- ✅ All checklist items completed
- ✅ Validation script passes without errors
- ✅ Integration tests pass
- ✅ Performance meets targets
- ✅ Team trained and ready

**No-Go** if:
- ❌ Critical checklist items incomplete
- ❌ Validation script has errors
- ❌ Performance below targets
- ❌ Team not ready
- ❌ Budget not approved

---

## 📝 Sign-Off

**Required Approvals** before production deployment:

- [ ] **Engineering Lead**: Code quality, architecture, tests
- [ ] **DevOps Lead**: Infrastructure, deployment, monitoring
- [ ] **Product Manager**: Features complete, user impact understood
- [ ] **Security Team**: Security review passed
- [ ] **Finance**: Budget approved

**Signatures**:

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | __________ | ______ | _________ |
| DevOps Lead | __________ | ______ | _________ |
| Product Manager | __________ | ______ | _________ |
| Security Team | __________ | ______ | _________ |
| Finance | __________ | ______ | _________ |

---

## 📅 Launch Timeline

**T-7 days**: Final code freeze, begin final testing
**T-3 days**: Complete all checklist items
**T-1 day**: Run final validation, get approvals
**T-0 (Launch Day)**: Deploy to production (10% rollout)
**T+1 day**: Monitor closely, increase to 25% if stable
**T+7 days**: 100% rollout if metrics good
**T+30 days**: Measure success criteria, decide on Phase 2

---

**Document Version**: 1.0
**Last Review**: November 2, 2025
**Next Review**: Before production deployment
