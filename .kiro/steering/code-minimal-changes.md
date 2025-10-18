---
inclusion: manual
---

# Code Change Guidelines

## Core Principles

- **Minimal Changes**: Make the smallest possible changes to achieve the goal
- **Interface Stability**: Never break existing interfaces without explicit approval
- **Type Safety**: Maintain strict TypeScript typing throughout all changes
- **Immutability**: Preserve immutable patterns, especially for Card objects
- **Access Control**: Respect participant-based visibility rules

## Code Style & Formatting

- Follow existing code patterns and conventions in the file being modified
- Ignore style errors in code you're not directly working on
- Run `npm run lint` and `npm run format` after completing changes
- Prefer readability over performance optimizations unless explicitly requested
- Use descriptive variable names that match the domain (cards, participants, hands, etc.)

## Architecture Compliance

- **Plugin Pattern**: New deck types and rulesets must implement required interfaces
- **Event System**: All state changes must emit appropriate events
- **Serialization**: Ensure new properties are JSON-serializable
- **Compatibility**: Validate deck type and ruleset compatibility requirements

## Testing Requirements

- Add unit tests for new public methods and interfaces
- Update integration tests when modifying game flow logic
- Ensure existing tests pass before submitting changes
- Test edge cases for card visibility and access control

## Import Organization

- Group imports: core interfaces, models, utilities, external packages
- Use barrel exports from `index.ts` for public API access
- Avoid circular dependencies between modules
- Import only what's needed to minimize bundle size

## Error Handling

- Use custom error classes from `core/errors/`
- Provide descriptive error messages with context
- Validate inputs at API boundaries
- Handle edge cases gracefully (empty hands, invalid participants)

## Documentation

- Update JSDoc comments for modified public methods
- Include usage examples for new interfaces
- Document breaking changes in commit messages
- Update README.md if public API changes