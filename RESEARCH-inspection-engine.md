# Inspection Engine for Manufacturing Control Points: Technology Landscape & Architecture Research

**Date:** March 2026
**Scope:** Evaluate existing open-source libraries, platforms, and architectural approaches for building a rule-based inspection engine that processes manufacturing control point data (from SCADA/Ignition integrations or manual human observation) and evaluates pass/fail outcomes, derived calculations, and watchful expressions — with a UI layer for rule authoring.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Architecture Decomposition](#2-architecture-decomposition)
3. [JavaScript/TypeScript Rule Engines](#3-javascripttypescript-rule-engines)
4. [Expression Evaluation Libraries](#4-expression-evaluation-libraries)
5. [Decision Engines with Visual Editors](#5-decision-engines-with-visual-editors)
6. [Enterprise Rule Platforms (JVM-based)](#6-enterprise-rule-platforms-jvm-based)
7. [SCADA & Manufacturing Integration](#7-scada--manufacturing-integration)
8. [Open Source Quality/SPC Systems](#8-open-source-qualityspc-systems)
9. [Visual Rule Builder UI Components](#9-visual-rule-builder-ui-components)
10. [Apache Ecosystem Beyond NiFi](#10-apache-ecosystem-beyond-nifi)
11. [Approach Comparison: Code-First vs. Low-Code vs. No-Code](#11-approach-comparison-code-first-vs-low-code-vs-no-code)
12. [Recommendation & Proposed Architecture](#12-recommendation--proposed-architecture)

---

## 1. Problem Statement

Manufacturing inspection requires evaluating incoming data from control points against configurable rule sets. These inputs arrive via two paths:

1. **Automated integration** — SCADA systems (e.g., Ignition via OPC-UA), PLCs, sensors, IoT devices
2. **Manual observation** — Human inspectors recording visual or tactile measurements

Once captured, the system must:

- **Evaluate rules** — Run configurable pass/fail checks against captured inputs
- **Compute derived values** — Calculations that produce secondary metrics from raw inputs (e.g., Cpk, moving averages, tolerances)
- **Support watchful expressions** — Intuitive formulas or conditional expressions authored by domain experts
- **Present a UI** — Allow non-developers to model, configure, and maintain inspection rules
- **Support auditability** — Manufacturing requires traceability of what was checked, when, and by whom

The question: **What existing projects or libraries provide the best foundation — or does it make more sense to let people write TypeScript directly?**

---

## 2. Architecture Decomposition

Before evaluating solutions, it helps to decompose the problem into layers:

```
+----------------------------------------------------------+
|                     UI Layer                              |
|  Rule authoring, decision tables, expression editors      |
+----------------------------------------------------------+
|                  Rule Engine Core                         |
|  Condition evaluation, fact matching, rule chaining       |
+----------------------------------------------------------+
|              Expression Evaluator                         |
|  Math formulas, comparisons, derived calculations         |
+----------------------------------------------------------+
|                 Data Ingress                              |
|  OPC-UA adapters, manual entry forms, event streams       |
+----------------------------------------------------------+
|              Persistence & Audit                          |
|  Rule versioning, execution logs, traceability            |
+----------------------------------------------------------+
```

Each layer has different candidate technologies. The best overall solution likely composes libraries across layers rather than adopting a single monolithic platform.

---

## 3. JavaScript/TypeScript Rule Engines

### 3.1 json-rules-engine

| Attribute | Value |
|-----------|-------|
| GitHub | [CacheControl/json-rules-engine](https://github.com/CacheControl/json-rules-engine) |
| Stars | ~3,000+ |
| Weekly Downloads | ~311,000 |
| License | ISC |
| Language | JavaScript (TypeScript types available) |
| Last Active | Actively maintained |

**What it does:** Rules are defined as JSON structures with conditions (all/any nesting), operators, and event-based outcomes. Facts are resolved dynamically (supports async fact resolution). Conditions reference fact paths and apply operators like `greaterThan`, `equal`, `lessThan`, `contains`, etc.

**Architecture:** Forward-chaining engine. Rules fire events when conditions are met. Supports priority-based ordering and caching for performance.

**Example rule:**
```json
{
  "conditions": {
    "all": [
      { "fact": "temperature", "operator": "greaterThan", "value": 150 },
      { "fact": "pressure", "operator": "lessThan", "value": 30 }
    ]
  },
  "event": { "type": "inspection-fail", "params": { "reason": "temperature/pressure out of spec" } }
}
```

**Relevance to inspection engine:** HIGH. JSON-serializable rules are perfect for persistence, versioning, and UI-driven authoring. The fact-resolution pattern maps well to control point data. Custom operators can extend pass/fail logic. The event model fits inspection outcomes.

**Limitations:** No built-in UI. No expression language for derived calculations (you'd pair it with an expression evaluator). No decision table support.

---

### 3.2 Nools

| Attribute | Value |
|-----------|-------|
| GitHub | [noolsjs/nools](https://github.com/noolsjs/nools) |
| Stars | ~954 |
| License | MIT |
| Algorithm | Full RETE |

**What it does:** A Rete-based engine (JS port of Drools concepts). Supports its own DSL syntax, sessions, fact assertion/retraction, and agenda groups.

**Assessment:** Largely **unmaintained** (stuck at 0.4.4). The DSL is non-standard. Not recommended for new projects.

---

### 3.3 Rools

| Attribute | Value |
|-----------|-------|
| GitHub | [frankthelen/rools](https://github.com/frankthelen/rools) |
| License | MIT |
| Language | JavaScript with TypeScript types |

**What it does:** Rules defined as plain JS objects with `when`/`then` functions. Supports priority, final rules, and async actions. RETE-like optimization.

**Example:**
```javascript
{ name: 'temperature-check',
  priority: 10,
  when: (facts) => facts.temperature > 150,
  then: (facts) => { facts.result = 'FAIL'; } }
```

**Assessment:** Clean API, but rules are code — not JSON-serializable. Harder to persist or edit via UI. Better suited for code-first approaches.

---

### 3.4 rules-engine-ts

| Attribute | Value |
|-----------|-------|
| GitHub | [andrewvo89/rules-engine-ts](https://github.com/andrewvo89/rules-engine-ts) |
| Language | TypeScript-first |

**What it does:** Strongly typed rules using TypeScript discriminated unions. Uses Zod for validation. Supports deeply nested decision trees.

**Assessment:** Excellent TypeScript ergonomics. Small community. Rules are code objects — not easily serializable for UI editing. Good for code-first TypeScript teams.

---

### 3.5 Trool

| Attribute | Value |
|-----------|-------|
| GitHub | [seanpmaxwell/Trool](https://github.com/seanpmaxwell/Trool) |
| Language | TypeScript |

**What it does:** Rules defined in spreadsheet format (CSV). Non-engineers can edit business rules in a spreadsheet tool. Inspired by Java's KnowledgeBase.

**Assessment:** Interesting concept for manufacturing — operators are already comfortable with spreadsheet-like interfaces. However, limited expressiveness and small community.

---

### 3.6 json-logic-js

| Attribute | Value |
|-----------|-------|
| GitHub | [jwadhams/json-logic-js](https://github.com/jwadhams/json-logic-js) |
| License | MIT |
| Language | JavaScript |

**What it does:** Serializes logic rules as JSON — share between front-end and back-end regardless of language. Supports `var`, `if`, comparison, arithmetic, array, string, and logic operators. Language-agnostic spec at JsonLogic.com.

**Example:**
```json
{ "and": [
  { ">": [{ "var": "temperature" }, 150] },
  { "<": [{ "var": "pressure" }, 30] }
]}
```

**Notable variant:** [json-logic-engine](https://github.com/json-logic/json-logic-engine) — modern alternative with ~5x faster evaluation, logic compilation for 12.5-20x improvement, first-class async support.

**Assessment:** More primitive than json-rules-engine (no events, priorities, or fact resolution) but the JSON format is extremely portable and there are implementations in 15+ languages. Good if you need cross-platform rule evaluation (e.g., rules evaluated on both server and in-browser). The compilation-based variant is very fast.

---

### 3.7 JEXL (JavaScript Expression Language)

| Attribute | Value |
|-----------|-------|
| GitHub | [TomFrost/Jexl](https://github.com/TomFrost/Jexl) |
| npm | jexl (v2.3.0) |
| License | MIT |

**What it does:** Context-based expression parser with transforms (piped functions), custom binary/unary operators, sync and async evaluation. Used by Mozilla in SHIELD/Normandy.

**Example:**
```javascript
jexl.eval('temperature > 150 && pressure|classify == "critical"', context)
```

**Assessment:** Bridges the gap between a pure math evaluator and a full rule engine. The transform pipe syntax (`value|transform`) is intuitive for manufacturing — e.g., `reading|movingAverage > threshold`. Async evaluation is valuable for fetching reference data during rule evaluation. Worth considering as the expression layer if you want more than math.

---

### Summary Table: JS/TS Rule Engines

| Engine | Serializable Rules | TypeScript | Active | UI Possible | Expression Support | Best For |
|--------|-------------------|------------|--------|-------------|-------------------|----------|
| json-rules-engine | JSON | Types available | Yes | Yes (build your own) | No (pair with evaluator) | Production rule evaluation |
| json-logic-js | JSON | No (JS) | Yes | Yes (JSON format) | Built-in operators | Cross-platform portable rules |
| JEXL | String expressions | No (JS) | Yes | Possible | Rich expression lang | Expression-centric rules |
| Nools | DSL files | No | No | No | Limited | Legacy only |
| Rools | Code only | Types available | Yes | Difficult | Via functions | Code-first |
| rules-engine-ts | Code only | Native | Yes | Difficult | Via TypeScript | Type-safe code-first |
| Trool | Spreadsheet/CSV | Native | Low | Spreadsheet IS the UI | Limited | Non-technical authoring |

---

## 4. Expression Evaluation Libraries

For derived calculations and "watchful expressions," you need a safe expression evaluator — something that lets domain experts write formulas like `(temperature - baseline) / stddev > 3` without writing TypeScript.

### 4.1 expr-eval

| Attribute | Value |
|-----------|-------|
| GitHub | [silentmatt/expr-eval](https://github.com/silentmatt/expr-eval) |
| npm | [expr-eval](https://www.npmjs.com/package/expr-eval) |
| License | MIT |

**What it does:** Parses and evaluates mathematical expressions safely (no `eval()`). Supports variables, custom functions, and operator toggling.

**Example:**
```javascript
const parser = new Parser();
const expr = parser.parse('(temperature - baseline) / stddev');
const result = expr.evaluate({ temperature: 162, baseline: 150, stddev: 4 }); // 3.0
```

**Relevance:** HIGH. Perfect for user-authored expressions where variables are control point values. Can compile expressions to native JS functions for performance. Configurable operator set prevents abuse.

---

### 4.2 math.js

| Attribute | Value |
|-----------|-------|
| Website | [mathjs.org](https://mathjs.org/docs/expressions/parsing.html) |
| npm | mathjs |

**What it does:** Full-featured math library with expression parsing, evaluation, and a symbol table (scope). Supports units, matrices, complex numbers, and 200+ functions.

**Assessment:** More powerful than expr-eval but significantly larger bundle size. The expression parser is excellent — supports `math.evaluate('mean([t1, t2, t3])', scope)` which is useful for SPC calculations. Overkill if you only need simple comparisons, but valuable if you need statistical functions (mean, std, percentiles).

---

### 4.3 hot-formula-parser

| Attribute | Value |
|-----------|-------|
| GitHub | [handsontable/formula-parser](https://github.com/handsontable/formula-parser) |
| License | MIT |

**What it does:** Parses Excel-style formulas. Supports string operations, custom functions, and dynamic variable resolution via events.

**Assessment:** MEDIUM relevance. The Excel formula syntax is familiar to manufacturing engineers who use spreadsheets. The `callVariable` event hook allows dynamic binding to control point values. However, the library is Excel-focused and may not map perfectly to inspection semantics.

---

### 4.4 Filtrex

| Attribute | Value |
|-----------|-------|
| GitHub | [joewalnes/filtrex](https://github.com/joewalnes/filtrex) (original, ~1,100 stars); [cshaa/filtrex](https://github.com/cshaa/filtrex) (active fork) |
| Weekly Downloads | ~319,400 |
| License | MIT |

**What it does:** Compiles user-provided expressions to JavaScript functions without `eval()`. Sandboxed — developer controls accessible data and callable functions. No loops or recursion possible (predictable execution time). Uses Jison parser. Spreadsheet-like expression syntax. Never throws during execution (returns errors instead).

**Assessment:** Surprisingly popular (~319K weekly downloads). The safety guarantees are valuable for manufacturing — expressions can't hang or access unauthorized data. The spreadsheet-like syntax is familiar to quality engineers. The "never throws" behavior is ideal for production rule evaluation. Strong contender for the expression layer if safety is a priority.

---

### 4.5 fparser

| Attribute | Value |
|-----------|-------|
| GitHub | [bylexus/fparse](https://github.com/bylexus/fparse) |

**What it does:** Parses mathematical formula strings (e.g., `x*sin(PI*x/2)`) into evaluable objects. Supports custom functions and variables.

**Assessment:** Clean, lightweight. Good middle ground between expr-eval and math.js.

---

### Recommendation for Expression Layer

**Primary:** `expr-eval` — lightweight, safe, configurable, compiles to functions.
**If statistical functions needed:** `math.js` — heavier but includes mean, std, percentile, etc.
**If Excel familiarity desired:** `hot-formula-parser` — Excel syntax operators already know.

These pair naturally with json-rules-engine: use the rule engine for condition orchestration and the expression evaluator for computed values within those conditions.

---

## 5. Decision Engines with Visual Editors

This category is the most directly relevant to the stated need — engines that ship with or support visual rule modeling.

### 5.1 GoRules ZEN Engine

| Attribute | Value |
|-----------|-------|
| GitHub | [gorules/zen](https://github.com/gorules/zen) |
| Website | [gorules.io](https://gorules.io/) |
| Core Language | Rust (with NodeJS, Python, Go, Java, C#, Kotlin, Swift bindings) |
| License | MIT |
| UI | Yes — JDM Editor (React-based) |

**What it does:** A cross-platform decision engine that evaluates JSON Decision Models (JDM). Models consist of:

- **Decision Tables** — Rows of input conditions mapped to output values (classic decision table semantics)
- **Expression Nodes** — Custom ZEN Expression Language for conditions and calculations
- **Rule Graphs** — Visual directed graphs connecting decision nodes

**Key features:**
- Sub-millisecond evaluation latency (Rust core)
- Visual canvas editor — drag components, connect them, watch data flow
- Rules stored as portable JSON files
- AI copilot for rule generation
- Embeddable — runs inside your application (no separate server)
- React-based JDM Editor component available open source

**ZEN Expression Language supports:** equality, numeric comparisons, boolean logic, date/time functions, array functions, and more.

**Relevance to inspection engine:** **VERY HIGH.** This is the closest existing solution to what's described:
- Decision tables map directly to inspection rule sets
- Expression nodes handle derived calculations
- The visual editor provides the UI layer
- JSON portability enables versioning and audit
- The Rust core with Node bindings fits a TypeScript architecture
- Embeddable means it runs alongside your application, not as a separate service

**This is the strongest candidate for a foundation to build on or fork.**

---

### 5.2 Camunda (DMN)

| Attribute | Value |
|-----------|-------|
| Website | [camunda.com](https://camunda.com/) |
| License | Community Edition (Apache 2.0), Enterprise (commercial) |
| Language | Java (JVM) |

**What it does:** Full process automation platform with BPMN workflow engine and DMN decision engine. DMN (Decision Model and Notation) is an OMG standard for modeling decisions as tables.

**Assessment:** Very powerful but **heavy**. Requires JVM deployment. The DMN standard itself is interesting — it's an industry-standard way to represent decision tables. Camunda's modeler is excellent for visual rule authoring. However, integrating Camunda into a TypeScript stack adds significant operational complexity. Better suited if you already have a Java backend.

---

### 5.3 DMN-js (by bpmn.io / Camunda)

| Attribute | Value |
|-----------|-------|
| GitHub | Part of [bpmn-io](https://github.com/bpmn-io) ecosystem |
| Language | JavaScript |
| License | Custom (check bpmn.io) |

**What it does:** A JavaScript library for rendering and editing DMN decision tables in the browser. This is the frontend component that Camunda uses.

**Assessment:** If you want DMN-standard decision tables without the full Camunda platform, dmn-js gives you the editor component. You'd need to build your own evaluation engine or use a lightweight DMN evaluator.

---

## 6. Enterprise Rule Platforms (JVM-based)

These are included for completeness. They represent the mature end of the spectrum but require JVM infrastructure.

### 6.1 Drools

| Attribute | Value |
|-----------|-------|
| GitHub | [apache/incubator-kie-drools](https://github.com/apache/incubator-kie-drools) |
| License | Apache 2.0 |
| Language | Java |
| Stars | ~5,000+ |

**What it does:** The gold standard for open-source rule engines. Full BRMS with RETE/PHREAK algorithm, DRL rule language, DMN Conformance Level 3, complex event processing (CEP), and Drools Workbench for visual authoring.

**Assessment:** If you were building in Java, Drools would be the obvious choice. For a TypeScript stack, it's not practical to embed. Could be used as a microservice behind an API, but that adds latency and operational complexity.

### 6.2 Easy Rules

| Attribute | Value |
|-----------|-------|
| Language | Java |
| License | MIT |

**What it does:** Lightweight Java rule engine. Rules are simple POJOs with conditions and actions.

**Assessment:** Too simple for this use case and wrong language ecosystem.

### 6.3 OpenRules

| Attribute | Value |
|-----------|-------|
| License | Open source + commercial |
| Language | Java |

**What it does:** Decision modeling via Excel spreadsheets with a Java execution engine. Decision intelligence platform combining business rules + ML + optimization. Deploys as REST services, serverless, or containers.

**Assessment:** The spreadsheet approach is interesting for manufacturing, but locked to JVM.

### 6.4 OpenL Tablets

| Attribute | Value |
|-----------|-------|
| GitHub | [openl-tablets/openl-tablets](https://github.com/openl-tablets/openl-tablets) |
| Stars | ~190 |
| License | LGPL |
| Language | Java |

**What it does:** Excel-based rule authoring with WebStudio for web-based editing. Deploys as REST/Kafka services. Compile-time validation and AI-assisted integration.

**Assessment:** Similar to OpenRules — Excel as the rule authoring interface. The Kafka integration is notable for stream-based rule evaluation. JVM dependency is the blocker for TypeScript stacks.

---

## 7. SCADA & Manufacturing Integration

### 7.1 node-opcua

| Attribute | Value |
|-----------|-------|
| GitHub | [node-opcua/node-opcua](https://github.com/node-opcua/node-opcua) |
| Website | [node-opcua.github.io](https://node-opcua.github.io/) |
| License | MIT |
| Language | TypeScript |
| Testing | 3,500+ unit tests, 93% code coverage |
| Release Cadence | New version every ~2 weeks |

**What it does:** Full OPC-UA stack for Node.js and browser. Provides both client and server implementations. Can subscribe to data changes and events from SCADA systems.

**Key capabilities:**
- Connect to Ignition, Siemens, Allen-Bradley, and any OPC-UA compliant system
- Subscribe to real-time data changes (push model)
- Browse server address spaces to discover available tags
- Full security support (certificates, encryption, authentication)
- PubSub support over MQTT (Part 14)
- ISA-95 extension available

**Relevance:** CRITICAL for the automated data ingress path. This is how you'd receive control point data from Ignition or other SCADA systems. The subscription model means control point values push into your inspection engine in real-time.

**Integration pattern:**
```
Ignition/PLC → OPC-UA Server → node-opcua client → Inspection Engine → Pass/Fail
```

### 7.2 Node-RED

| Attribute | Value |
|-----------|-------|
| Website | [nodered.org](https://nodered.org/) |
| GitHub Stars | ~20,000+ |
| License | Apache 2.0 |

**What it does:** Flow-based programming tool for wiring together hardware devices, APIs, and online services. Visual browser-based editor. 4,000+ community nodes including Modbus, OPC-UA, Siemens S7, MQTT, BACnet. Central component of the MING stack.

**Assessment:** Conceptually similar to Apache NiFi but lighter weight. Could serve as the data ingress orchestration layer. However, embedding rule evaluation logic in Node-RED flows mixes concerns. Better as a complement to (not replacement for) a dedicated inspection engine.

### 7.3 MING Stack (MQTT + InfluxDB + Node-RED + Grafana)

An emerging open-source reference architecture for manufacturing data pipelines:

- **MQTT** (via MQTT.js or Mosquitto) — Lightweight pub-sub messaging from devices
- **InfluxDB** — Time-series storage for sensor/control point data
- **Node-RED** — Data routing, transformation, protocol bridging
- **Grafana** — Dashboarding, alerting, visualization

**Assessment:** Proven pattern for IIoT data collection and monitoring. The inspection engine would sit between the ingress layer (Node-RED/MQTT) and the storage/visualization layer (InfluxDB/Grafana), consuming control point data and producing pass/fail results that flow downstream into dashboards and alerts.

---

## 8. Open Source Quality/SPC Systems

### 8.1 Existing QMS & MES Platforms

| Platform | Focus | Stack | Assessment |
|----------|-------|-------|------------|
| **Carbon** ([crbnos/carbon](https://github.com/crbnos/carbon)) | Combined ERP + MES + QMS | TypeScript / Supabase (AGPL) | Most interesting for TypeScript teams. Targets complex assembly, contract mfg, configure-to-order. Extensible via API. Web UI included. |
| **Open EQMS** ([dromation/open-eqms](https://github.com/dromation/open-eqms)) | Full quality system | Web-based | Includes SPC, measurement system analysis, calibration, CAPA, training. Most comprehensive open-source QMS found. |
| **OpenQMS.net** ([C-realize/OpenQMS](https://github.com/C-realize/OpenQMS)) | Life science QMS | AGPL + commercial | Cloud-native, GxP/Part 11 compliant. Lightweight. Niche for regulated industries. |
| **Libre MES** ([Spruik/Libre](https://github.com/Spruik/Libre)) | MES + performance monitoring | Grafana + InfluxDB + Postgres | Good for OEE dashboarding. Built on proven time-series infrastructure. |
| **FlinkISO** ([flinkiso.com](https://www.flinkiso.com/)) | ISO compliance QMS | LAMP stack | Document control, approval workflows. ISO 9001/14001/45001/13485. |
| **QDMS** | Document management, audits | Various | Too focused on document control, not real-time inspection |
| **Senaite (Bika LIMS)** | Laboratory information management | Python/Plone | Lab-focused, not manufacturing floor inspection |
| **qmsWrapper** | Medical device QMS | Commercial core | Too specialized for medical device compliance |

**Assessment:** **Carbon** is the most notable find — it's a TypeScript-based combined ERP/MES/QMS built on Supabase. While it doesn't provide a configurable rule engine, its data model and UI patterns for manufacturing operations could inform or accelerate the inspection engine's UI layer. **Open EQMS** is the most feature-complete QMS and includes SPC, but its rule evaluation is not externally configurable. No existing open-source QMS provides the real-time, configurable rule evaluation engine needed — they focus on document control, audit management, and compliance tracking.

### 8.2 SPC Libraries

Most SPC libraries are Python-based:

- **PySpc** — 18 chart types, pandas/numpy integration
- **spcchart** — Pure Python, Plotly web charts, Flask interface, automatic violation detection
- **pyshewhart** — Western Electric rules implementation
- **statprocon** — Lightweight, minimal dependencies

**For JavaScript/TypeScript**, the landscape is thinner but viable options exist:

- **QCSPCChart** ([quinn-curtis.com](http://quinn-curtis.com/index.php/qcspcchartjsts/)) — The most comprehensive JS/TS SPC library. Supports X-Bar R, X-Bar Sigma, Individual Range, Median Range, EWMA, MA, CuSum, p, np, c, u, DPMO charts. Built-in rule sets: WECO, Nelson, Juran, Hughes, Gitlow, AAIG, Westgard, Duncan (all customizable, mix-and-match). Process capability (Cp, Cpl, Cpu, Cpk, Cpm) and process performance (Pp, Ppl, Ppu, Ppk). Zero dependencies. **Commercial license.**
- **nelsonrules-js** ([michiel/nelsonrules-js](https://github.com/michiel/nelsonrules-js)) — Open-source implementation of all 8 Nelson rules for detecting special-cause variation. Computation-only (no charts). Pair with Plotly.js or D3 for visualization.
- **Plotly.js** ([plotly.com/javascript/spc-control-charts/](https://plotly.com/javascript/spc-control-charts/)) — General charting library with SPC control chart examples including control limits, zones, annotations. Interactive. MIT license. You'd implement rule detection (Nelson, WECO) separately.
- **process-control-charts** (npm) — Methods for p/np/c/u chart calculations. Unmaintained — reference only.

**FlowFuse + Node-RED** offers a guide for building real-time SPC dashboards, but it's a tutorial approach, not a library.

---

## 9. Visual Rule Builder UI Components

### 9.1 GoRules JDM Editor

The most complete open-source option. A React component that provides:
- Decision table editor (rows/columns for conditions/outputs)
- Expression node editor
- Graph-based rule flow visualization
- Import/export of JSON Decision Models

### 9.2 react-querybuilder

| Attribute | Value |
|-----------|-------|
| GitHub | [react-querybuilder/react-querybuilder](https://github.com/react-querybuilder/react-querybuilder) |
| npm | react-querybuilder (v8.14.0) |
| License | MIT |

Mature, well-documented query/rule builder. Supports drag-and-drop, nested boolean logic (AND/OR), export to SQL/MongoDB/JsonLogic/CEL/SpEL/JSONata. Has a dedicated `@react-querybuilder/rules-engine` package for if-then-else logic. Compatible with Ant Design, Material UI, Bootstrap, Fluent UI. 66 dependent npm packages.

**Manufacturing relevance:** Ideal for building condition editors — e.g., "IF temperature > 150 AND pressure < 30 THEN reject". Export formats allow rules to be stored and evaluated server-side.

### 9.3 react-awesome-query-builder

| Attribute | Value |
|-----------|-------|
| GitHub | [ukrbublik/react-awesome-query-builder](https://github.com/ukrbublik/react-awesome-query-builder) |
| Stars | ~2,200 |
| Weekly Downloads | ~22,000 |
| License | MIT |

Highly configurable query builder supporting complex types (structs, arrays), aggregation, proximity operators, custom functions. Exports to MongoDB, SQL, JsonLogic, ElasticSearch. Supports Ant Design, Material UI, Bootstrap, Fluent UI.

**Manufacturing relevance:** Strong for rules referencing complex nested data structures from sensors or measurement systems.

### 9.4 React Flow

| Attribute | Value |
|-----------|-------|
| GitHub | [xyflow/xyflow](https://github.com/xyflow/xyflow) |
| License | MIT |

The most popular React library for building node-based editors and interactive diagrams. Supports custom nodes, edges, drag-and-drop, minimap, controls. Not a rule engine itself — it's the canvas for building one. Also available for Svelte.

### 9.5 Flume

| Attribute | Value |
|-----------|-------|
| Website | [flume.dev](https://flume.dev/) |
| GitHub | [chrisjpatty/flume](https://github.com/chrisjpatty/flume) (original); [Seiko-Labs/flume](https://github.com/Seiko-Labs/flume) (maintained fork) |

**What it does:** Purpose-built node editor for modeling AND executing business logic. Key differentiator: **ships with a runtime engine** that executes the visual logic graphs as JSON. Designed to be end-user friendly, not just developer-facing. Logic graphs are portable JSON, executable in browser or server.

**Manufacturing relevance:** Directly applicable — inspection rules could be modeled as node graphs (e.g., "read sensor" -> "check threshold" -> "flag defect" -> "route to rework"). Non-technical quality engineers could author inspection flows. JSON portability means the same logic runs on edge devices or servers.

### 9.6 react-jsonschema-form (RJSF) / Form.io

For the **input capture** side (manual observation forms):

- **RJSF** ([react-jsonschema-form](https://github.com/rjsf-team/react-jsonschema-form)) — Generates React forms from JSON Schema. Supports conditional fields, validation via AJV, custom widgets. Theme support for Material UI, Ant Design, Chakra, Bootstrap. The most popular React form-from-schema library.
- **React JSON Schema Form Builder** ([ginkgobioworks](https://github.com/ginkgobioworks/react-json-schema-form-builder)) — Visual drag-and-drop editor for creating the JSON Schemas that RJSF consumes. Enables quality managers to design inspection forms without developers.
- **Form.io** ([formio/formio](https://github.com/formio/formio)) — Combined form builder + API platform. Drag-and-drop builder creates JSON schemas with conditional field visibility, calculations, dynamic branching, file uploads. Self-hostable via Docker. **File upload supports photo documentation of defects.**

### 9.7 dmn-js + dmn-eval-js

- **dmn-js** ([bpmn.io](https://bpmn.io/toolkit/dmn-js/)) — The Camunda-originated DMN table editor for the browser. Standards-compliant DMN 1.3 editor/viewer. Embeddable. Note: editor only, not execution engine.
- **dmn-eval-js** ([HBTGmbH/dmn-eval-js](https://github.com/HBTGmbH/dmn-eval-js)) — Evaluates DMN 1.1 decision tables from XML using S-FEEL expressions. Supports hit policies: FIRST, UNIQUE, RULE ORDER, COLLECT. Pair with dmn-js for a complete author-and-evaluate DMN solution in JavaScript.

**Assessment:** The dmn-js + dmn-eval-js combination gives you a standards-compliant (OMG DMN) inspection rule authoring and evaluation stack in pure JavaScript. Valuable in regulated environments where standards compliance matters for audit.

---

## 10. Apache Ecosystem Beyond NiFi

Since you mentioned NiFi as a reference point:

### 10.1 Apache NiFi
Already in use on your team. Good for routing data from devices to the inspection engine. Not a rule engine itself — it's the plumbing.

### 10.2 Apache Kafka / Kafka Streams

Event streaming platform + stream processing library. **Documented manufacturing pattern:** sensor ID as key, sensor reading as value, aggregated via Processor API with state stores, Punctuator checks thresholds periodically and emits alerts. Can integrate with Drools for rule evaluation — the CEP engine reads from Kafka streams and gets rules from Drools Workbench, separating rule authoring from stream processing infrastructure.

A [Kafka Streams CEP library](https://github.com/fhussonnois/kafkastreams-cep) adds a Pattern API for defining complex event sequences on top of Kafka Streams.

**Assessment:** The backbone for high-throughput inspection data pipelines. Adds significant infrastructure complexity. Best when you need to process millions of inspection events/second or integrate with other Kafka-based systems.

### 10.3 Apache Flink (FlinkCEP)

True streaming engine with the **FlinkCEP library** — a Pattern API for detecting complex event sequences in real-time streams. Supports:
- Strict/relaxed contiguity (must events be consecutive?)
- Temporal constraints (e.g., "pattern must occur within 10 seconds")
- Quantifiers and conditions
- Dynamic rule updates without restarting the pipeline

**Manufacturing examples:**
- Detecting 3 consecutive readings above upper control limit within 60 seconds
- Correlating defect events across multiple production stations within a time window
- Predicting equipment failure from degradation patterns

**Assessment:** Superior to Kafka Streams for **complex temporal pattern detection**. The temporal constraint features map directly to manufacturing inspection scenarios. Heavy infrastructure, but if you need real-time multi-station correlation or time-windowed pattern detection, Flink CEP is the right tool.

### 10.4 Apache Camel

Integration framework with 300+ connectors. Implements Enterprise Integration Patterns (routing, transformation, mediation, filtering). Has a Karavan visual designer for YAML-based route definitions.

**Assessment:** Could replace NiFi for lighter-weight routing. Excels at connecting inspection stations, MES, ERP, and quality databases. Not a rule engine.

### 10.5 Apache Druid

Real-time OLAP database with sub-second query latency on billions of rows. Ingests millions of events/second from Kafka. Column-oriented storage with automatic data rollup.

**Assessment:** The analytics layer for inspection data — trending defect rates, identifying shifts with anomalous quality metrics, drill-down by product/line/station/shift. Not a rule engine, but the right tool for historical inspection analytics dashboards.

**Assessment:** These are complementary infrastructure, not alternatives to the inspection engine itself. NiFi/Camel handle data routing. Kafka handles event streaming. Flink handles complex temporal patterns. Druid handles analytics. None of them solve the core rule authoring + evaluation problem.

---

## 11. Approach Comparison: Code-First vs. Low-Code vs. No-Code

### Option A: "Just Write TypeScript"

**How it works:** Inspection rules are TypeScript functions. Engineers write and deploy code.

```typescript
function checkTemperature(input: ControlPoint): InspectionResult {
  if (input.temperature > 150) return { status: 'FAIL', reason: 'Over temp limit' };
  if (input.temperature > 140) return { status: 'WARN', reason: 'Approaching limit' };
  return { status: 'PASS' };
}
```

| Pro | Con |
|-----|-----|
| Maximum flexibility | Every rule change requires a code deploy |
| Full TypeScript tooling (types, tests, IDE) | Only developers can author/modify rules |
| No new abstractions to learn | Rules buried in application code |
| Easy to debug | Hard to audit what rules were active at a point in time |
| Zero dependency overhead | No visual representation for non-technical stakeholders |

**Best when:** Small team, all technical, rules rarely change, < 50 rules.

---

### Option B: JSON Rule Engine (json-rules-engine + expr-eval)

**How it works:** Rules defined as JSON. Expression evaluator handles formulas. Custom UI for authoring.

| Pro | Con |
|-----|-----|
| Rules are data — persist, version, audit easily | Must build your own authoring UI |
| Non-developers can author (with UI) | JSON can become verbose for complex rules |
| No deploy needed for rule changes | Two libraries to integrate and maintain |
| Well-tested, production-proven libraries | Custom operators need code for complex logic |

**Best when:** Medium complexity, need to separate rules from code, willing to invest in UI.

---

### Option C: GoRules ZEN Engine

**How it works:** Rules modeled as JSON Decision Models. Visual editor provided. Expression language built in.

| Pro | Con |
|-----|-----|
| Visual editor included (React component) | Newer project, smaller community |
| Decision tables + expressions + rule graphs | Rust core may complicate debugging |
| Sub-millisecond performance | ZEN Expression Language is proprietary (not TypeScript) |
| Embeddable — no separate service | Customizing the editor requires understanding their React component |
| JSON-portable rules with versioning | |

**Best when:** Need visual authoring. Decision table model fits your inspection patterns. Want a complete solution with less custom development.

---

### Option D: Hybrid — TypeScript Core + Expression Engine + UI Shell

**How it works:** Build a thin inspection engine in TypeScript that:
1. Loads rule definitions from JSON/DB
2. Uses expr-eval or math.js for expression evaluation
3. Provides a React UI for rule authoring (using react-querybuilder or custom)
4. Exposes an API for integration with NiFi/OPC-UA data ingress

| Pro | Con |
|-----|-----|
| Full control over every layer | Most development effort |
| TypeScript throughout (your team's strength) | Must design the rule model yourself |
| Can evolve expression language over time | UI development is significant effort |
| Integrates perfectly with ts-utils ecosystem | |

**Best when:** Your domain has unique requirements that don't fit standard decision table models. You want maximum control and have the team to build it.

---

## 12. Recommendation & Proposed Architecture

### Short Answer

**GoRules ZEN Engine is the strongest existing foundation** for this use case. It provides the three critical pieces — rule engine, expression language, and visual editor — in a single coherent package with Node.js bindings.

### If GoRules doesn't fit

The next best approach is **Option B/D Hybrid:**
- **json-rules-engine** for condition evaluation
- **expr-eval** (or math.js if you need statistics) for expressions and derived calculations
- **react-querybuilder** or custom React UI for rule authoring
- **node-opcua** for SCADA/Ignition integration
- **Your own thin orchestration layer** in TypeScript connecting these pieces

### Proposed Architecture (Hybrid)

```
                         +---------------------------+
                         |      React Frontend       |
                         |  GoRules JDM Editor  OR   |
                         |  Custom Rule Builder UI   |
                         +---------------------------+
                                     |
                              Rule Definitions (JSON)
                                     |
                         +---------------------------+
                         |   Inspection Engine API   |
                         |      (TypeScript/Deno)    |
                         +---------------------------+
                          /            |            \
              +-----------+  +---------+--------+  +------------+
              | Rule       |  | Expression      |  | SPC /      |
              | Evaluator  |  | Evaluator       |  | Statistics |
              | (ZEN or    |  | (expr-eval or   |  | (math.js   |
              |  json-     |  |  ZEN expr)      |  |  or custom)|
              |  rules)    |  |                 |  |            |
              +-----------+  +-----------------+  +------------+
                                     |
                         +---------------------------+
                         |     Data Ingress Layer    |
                         +---------------------------+
                        /                             \
           +-----------+---+                  +-------+--------+
           | node-opcua    |                  | Manual Entry   |
           | OPC-UA Client |                  | REST API /     |
           | (Ignition,    |                  | Forms (Formio  |
           |  PLCs, etc.)  |                  |  or custom)    |
           +---------------+                  +----------------+
```

### Key Design Decisions

1. **Rule storage:** JSON in a database with version history. Every rule change is a new version. Auditors can query "what rules were active on date X."

2. **Expression language:** Start with expr-eval for simplicity. If you need Excel-style familiarity, switch to hot-formula-parser. If you need statistics, add math.js.

3. **Rule evaluation model:** Event-driven. When a control point value arrives (via OPC-UA subscription or manual entry), the engine:
   - Resolves which rules apply to that control point
   - Evaluates expressions to compute derived values
   - Runs rule conditions against raw + derived values
   - Emits pass/fail/warn events
   - Logs everything for audit

4. **UI strategy:** If adopting GoRules, use their JDM Editor React component. If building custom, use react-querybuilder for conditions + a custom expression editor with syntax highlighting (CodeMirror or Monaco with a custom language mode).

5. **Integration with ts-utils:** The existing `Flowable` reactive streams system could serve as the backbone for the data pipeline — control point values flow through a `FlowPublisher`, get transformed by rule evaluation processors, and produce inspection results downstream.

### What NOT to do

- **Don't deploy Drools/Camunda** just for the rule engine — the JVM operational overhead isn't worth it when good JS/TS alternatives exist
- **Don't build a rule engine from scratch** when json-rules-engine or ZEN engine already solve the core evaluation problem
- **Don't conflate NiFi's role with the rule engine** — NiFi routes data, it doesn't evaluate inspection rules
- **Don't let users write raw TypeScript** as rules unless your user base is exclusively developers — the deployment and safety implications aren't worth it for manufacturing operations

---

## Appendix: Key Project Links

### Rule Engines
- [json-rules-engine](https://github.com/CacheControl/json-rules-engine) — JSON-based rule engine for Node.js (~3K stars, ~311K weekly downloads)
- [GoRules ZEN Engine](https://github.com/gorules/zen) — Cross-platform decision engine with visual editor (Rust + Node.js bindings)
- [json-logic-js](https://github.com/jwadhams/json-logic-js) — Language-agnostic JSON logic rules
- [json-logic-engine](https://github.com/json-logic/json-logic-engine) — Modern json-logic with 5-20x faster compilation
- [JEXL](https://github.com/TomFrost/Jexl) — JavaScript Expression Language with transforms (used by Mozilla)
- [Rools](https://github.com/frankthelen/rools) — ES6 rule engine for Node.js
- [rules-engine-ts](https://github.com/andrewvo89/rules-engine-ts) — Strongly typed TypeScript rule engine
- [Trool](https://github.com/seanpmaxwell/Trool) — Spreadsheet-based rule engine for Node.js
- [Node-Rules](https://github.com/mithunsatheesh/node-rules) — Forward chaining rule engine

### Expression Evaluators
- [expr-eval](https://github.com/silentmatt/expr-eval) — Safe mathematical expression evaluator
- [Filtrex](https://github.com/cshaa/filtrex) — Sandboxed expression compiler (~319K weekly downloads)
- [math.js](https://mathjs.org/) — Extensive math library with expression parsing (~15K stars, ~2.3M weekly downloads)
- [hot-formula-parser](https://github.com/handsontable/formula-parser) — Excel formula parser
- [fparser](https://github.com/bylexus/fparse) — Mathematical formula parser

### Decision Engines
- [GoRules](https://gorules.io/) — Open source business rules engine (Rust + bindings)
- [Drools](https://github.com/apache/incubator-kie-drools) — Enterprise BRMS (Java)
- [Camunda](https://camunda.com/) — Process and decision automation
- [OpenL Tablets](https://github.com/openl-tablets/openl-tablets) — Excel-based rules with web studio (Java)

### Manufacturing Integration
- [node-opcua](https://github.com/node-opcua/node-opcua) — OPC-UA stack for Node.js/TypeScript (~1.6K stars)
- [Node-RED](https://nodered.org/) — Flow-based programming for IoT (~20K stars)
- [Apache NiFi](https://nifi.apache.org/) — Data routing and transformation

### Manufacturing QMS/MES
- [Carbon](https://github.com/crbnos/carbon) — TypeScript ERP/MES/QMS on Supabase (AGPL)
- [Open EQMS](https://github.com/dromation/open-eqms) — Full QMS with SPC, calibration, CAPA
- [Libre MES](https://github.com/Spruik/Libre) — MES on Grafana + InfluxDB + Postgres

### UI Components
- [GoRules JDM Editor](https://github.com/gorules/zen) — React-based decision model editor
- [react-querybuilder](https://github.com/react-querybuilder/react-querybuilder) — React query/filter builder (v8.14, MIT)
- [react-awesome-query-builder](https://github.com/ukrbublik/react-awesome-query-builder) — Advanced query builder (~2.2K stars)
- [React Flow](https://reactflow.dev/) — Node-based graph editor (xyflow)
- [Flume](https://flume.dev/) — Node editor with built-in runtime execution engine
- [dmn-js](https://github.com/bpmn-io/dmn-js) — DMN decision table editor (Camunda/bpmn.io)
- [dmn-eval-js](https://github.com/HBTGmbH/dmn-eval-js) — DMN 1.1 decision table evaluator for JS
- [react-jsonschema-form](https://github.com/rjsf-team/react-jsonschema-form) — Forms from JSON Schema
- [React JSON Schema Form Builder](https://github.com/ginkgobioworks/react-json-schema-form-builder) — Visual form schema designer
- [Formio](https://github.com/formio/formio) — Dynamic form builder + API platform

### SPC / Quality
- [QCSPCChart](http://quinn-curtis.com/index.php/qcspcchartjsts/) — Comprehensive JS/TS SPC charts (commercial)
- [nelsonrules-js](https://github.com/michiel/nelsonrules-js) — All 8 Nelson rules in JavaScript (open source)
- [Plotly.js SPC Charts](https://plotly.com/javascript/spc-control-charts/) — Interactive SPC control charts (MIT)
- [PySpc](https://github.com/carlosqsilva/pyspc) — Python SPC charts (reference)
- [spcchart](https://github.com/bwghughes/spc) — Python SPC with Plotly/Flask
- [pyshewhart](https://github.com/huft-jonathan/pyshewhart) — Western Electric rules implementation
