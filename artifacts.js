// Synthetic example artifacts shown in the "watch the handoff" panel.
// Every value here is invented for illustration: no real schemas, documents, users, traces or measurements.
// seed = what enters stage 1; steps[i] = what stage i+1 hands to the next stage.
export const artifacts = {
  home: {
    seed: '"what changed in the refund policy??"',
    steps: [
      '{ "query": "What changed in the refund policy?",\n  "intent": "policy_lookup",\n  "needs": "dated policy text" }',
      '[ { "id": "doc_12#p3", "score": 0.82, "date": "2026-03" },\n  { "id": "doc_07#p1", "score": 0.74, "date": "2025-11" } ]',
      'claim: "refund window is now 30 days"\n  supported_by: doc_12#p3  ✓\nunsupported_claims: 0',
      '{ "answer": "Refunds can now be requested within 30 days…",\n  "citations": ["doc_12#p3"] }',
      'faithfulness: pass\nrelevance: pass\ntrace_id: tr_8f2c  → added to regression set',
    ],
  },
  'credit-memo': {
    seed: 'bank_statement.pdf\nfinancials.xlsx\napplication_form.pdf',
    steps: [
      '{ "field": "avg_monthly_inflow",\n  "value": 412000,\n  "source": "bank_statement.pdf p2 L14" }',
      '"Applicant [NAME_1], account ****4821,\n based in [CITY_1]…"',
      '{ "metric": "dscr", "value": 1.42,\n  "formula": "net_operating_income / debt_service" }',
      '## Repayment capacity\nDebt service coverage of 1.42 (calc #3)\nsuggests …',
      'memo.dscr == calc.dscr        ✓\nsection totals reconcile      ✗  Δ 1,200\nverdict: ESCALATE to reviewer',
    ],
  },
  nl2sql: {
    seed: '"how many merchants in nairobi\n were active last quarter?"',
    steps: [
      '{ "metric": "active_merchants",\n  "period": "last_quarter",\n  "filters": { "region": "Nairobi" } }',
      'merchants(id, region, status)\ntransactions(merchant_id, created_at)\n-- only allow-listed tables shown',
      'SELECT COUNT(DISTINCT m.id)\nFROM merchants m\nJOIN transactions t ON t.merchant_id = m.id\nWHERE m.region = :region\n  AND t.created_at >= :q_start\n  AND t.created_at <  :q_end;',
      '{ "parsed": true, "statement": "SELECT",\n  "tables_allowed": true, "row_limit": 1000,\n  "status": "approved" }',
      'executed (read-only) → 1 row\nanswer: "1,284 merchants were active."\nrelevance: scored · latency: recorded · trace: tr_41a0',
    ],
  },
  anchor: {
    seed: '[live participant audio]',
    steps: [
      'segment: turn_07.wav\nspeaker: participant\n00:04:12 → 00:04:31',
      '{ "turn": 7, "start": "04:12",\n  "text": "Honestly the sign-up form felt rushed…" }',
      'next_question: "What made it feel rushed?"\nreason: open gap · non-leading',
      'theme: "onboarding friction"  (candidate)\nsupporting_turns: [7, 12]',
      'finding → turn 7, chars 9–37\n"the sign-up form felt rushed"',
    ],
  },
  'enterprise-agents': {
    seed: 'request: "prepare an offer\n for account A-102"',
    steps: [
      'sources: [policy_v3 §4.2, account#A-102]\naccess: role=analyst  ✓',
      'proposed_action: "draft_offer"\nstatus: pending · side_effects: none',
      'rule affordability_ratio <= 0.40 (rules v3.1)\ninput 0.31 → PASS',
      'approval: required (role: reviewer)\ndecision: approved · by u_481',
      '{ "sources": [...], "rule_version": "3.1",\n  "approver": "u_481", "trace_id": "tr_9b2e" }',
    ],
  },
  'production-ml': {
    seed: 'git push → main  (commit 3f9c1e)',
    steps: [
      'FROM python:3.12-slim\nCOPY requirements.lock .\nRUN pip install -r requirements.lock',
      'unit + integration tests: pass\neval gate: pass\nimage: api:sha-3f9c1e',
      'service: scoring-api\ntask definition: rev N+1\nrollout: healthy',
      '{ "level": "error", "route": "/score",\n  "error": "upstream_timeout", "trace": "tr_77d1" }',
      'root cause: slow upstream dependency\nfix: timeout + retry with idempotency key\nregression test added',
    ],
  },
};
