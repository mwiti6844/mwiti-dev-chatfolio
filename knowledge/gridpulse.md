---
slug: gridpulse
type: project
title: GridPulse Energy Supply Chain Optimization Agent
tags: gridpulse, google adk, supply chain, energy, forecasting, bigquery, weather risk, operations intelligence
source_url: /Users/mac/Desktop/adk-samples/python/agents/supply-chain
priority: 7
---

GridPulse is David's localized portfolio case study based on the Google ADK supply-chain sample. It reframes the sample as an energy operations intelligence system for utilities, mini-grid operators, renewable providers, fuel logistics teams, and industrial energy planners in Kenya or East Africa.

The original ADK supply-chain sample is a multi-agent power and energy workflow. It analyzes market signals, weather forecasts, internal consumption and generation capacity, demand forecasts, and chart outputs before recommending supply chain optimizations.

Localized product concept:

Energy planning depends on demand changes, weather, outages, supplier constraints, fuel costs, generation capacity, logistics delays, and customer growth. GridPulse acts as an AI operations analyst that coordinates these signals around a planning question.

Agent responsibilities:

The orchestrator receives the operational question and coordinates specialized sub-agents. MarketPulse scans public risks and market signals using search. OpsInsight queries internal capacity, inventory, supplier, or generation data through natural-language-to-SQL. DemandSense forecasts future consumption. The weather agent checks weather-related logistics and generation risk. The chart generator creates visual summaries through code execution.

Data strategy:

For a Kenya or East Africa deployment, GridPulse could use county or feeder-level demand, solar and hydro generation estimates, weather forecasts, fuel price signals, maintenance schedules, supplier data, inventory, contract data, and customer growth indicators.

Business value:

GridPulse helps operations teams move from fragmented monitoring to proactive recommendations. It can forecast demand, identify supply pressure, highlight weather or logistics risk, suggest procurement or routing changes, and produce charts that make the recommendation easier to inspect.

Recruiter framing:

GridPulse should be presented as an adapted and localized ADK case study. It demonstrates multi-source agentic synthesis, forecasting, natural-language data access, weather-aware risk analysis, and decision-support reporting.
