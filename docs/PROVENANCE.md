# Provenance and AI disclosure

## Original Phase 0 material

The starting workspace contained an original dependency-free TypeScript portfolio-policy function, one example and 11 Node tests. Before restructuring, that exact state passed 11/11 tests and was recorded in Git commit `18a37432ffa3b3f985133414ae5af15a104e2f82`.

Milestone 1 moved the policy and tests into `packages/domain`, preserved behavior, improved formatting and commentary, and added exact decimal-unit tests. Git history retains the original files and movement.

## Milestone 1 authorship

All application code, CSS, copy, adapters and tests in this repository were independently written for MonMix (formerly developed under the working name Monad Strategy Desk). No reference UI, branding, custom asset, source module, ABI file, or copyrighted copy was imported.

## AI-tool disclosure

OpenAI Codex assisted with codebase and reference-repository research; architecture and safety-boundary design; TypeScript, React, CSS, tests and documentation; and read-only RPC probes and build verification.

The tool did not receive or handle a private key, sign a message, send a transaction, deploy a contract, or spend funds. Maintainers reviewed observed data and remain responsible for correctness, licensing, security and submission claims.
