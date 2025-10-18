---
inclusion: always
---

# Code Integration Guidelines

## Core Philosophy

Write code that feels native to the existing codebase - as if it had always existed that way. Prioritize correctness and architectural consistency over backwards compatibility concerns.

## Integration Principles

### Code Consistency
- Match existing naming conventions, patterns, and architectural decisions
- Follow the established separation of concerns between core, models, engine, and API layers
- Maintain the plugin architecture for deck types and rulesets
- Preserve the immutable card design and event-driven state management

### Quality Over Compatibility
- Implement the most correct solution architecturally, even if it requires breaking changes
- Refactor existing code when necessary to maintain consistency
- Don't compromise on type safety or interface design for backwards compatibility
- Fix architectural debt when encountered rather than working around it

### TypeScript Excellence
- Leverage TypeScript's type system fully - use strict typing, generics, and union types appropriately
- Prefer compile-time safety over runtime checks where possible
- Use discriminated unions for game state variants
- Implement proper type guards for runtime type checking

### Domain-Driven Design
- Use card game terminology consistently (participants, hands, gameboards, deck types, rulesets)
- Model concepts as they exist in the real world of card games
- Maintain clear boundaries between game engine concerns and business logic
- Respect the access control model for face-down cards and participant visibility

## Implementation Standards

### Error Handling
- Use custom error classes from `core/errors/` for domain-specific failures
- Provide contextual error messages that help developers understand what went wrong
- Validate inputs at API boundaries but trust internal method contracts
- Fail fast with clear error messages rather than allowing invalid state

### Event System Integration
- Emit events for all state changes, following existing event patterns
- Use descriptive event names that clearly indicate what changed
- Include relevant context in event payloads for debugging and logging
- Maintain event ordering consistency for reproducible game states

### Testing Integration
- Write tests that validate behavior, not implementation details
- Use the existing test patterns and utilities
- Test edge cases specific to card games (empty hands, invalid moves, face-down cards)
- Ensure new features work with existing deck types and rulesets