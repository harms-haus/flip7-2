# BigDeckEnergy Documentation

Welcome to the BigDeckEnergy documentation! This directory contains comprehensive guides and API references for using the BigDeckEnergy card game library.

## Getting Started

- [Main README](../README.md) - Overview, installation, and quick start guide
- [API Reference](api-reference.md) - Complete API documentation (if available)

## Party System Documentation

The party system enables team-based card games with shared resources and collaborative gameplay.

### Core Documentation

- **[Party System API](party-system-api.md)** - Complete API reference for party system methods
- **[Party System Examples](party-system-examples.md)** - Practical usage examples and patterns

### Key Features

- **Team Formation**: Group participants into parties (teams)
- **Shared Resources**: Parties have their own piles and placements
- **Team Status Tracking**: Monitor team scores, wins, and custom data
- **Access Control**: Party members share access to team resources
- **Team Communication**: Built-in support for information sharing

### Quick Reference

#### Basic Party Operations
```typescript
// Create a party
api.createParty('team1', 'Team Alpha');

// Add participants
api.addParticipantToParty('player1', 'team1');

// Create shared resources
api.createPartyPile('team1', 'shared_cards', true);

// Update team status
api.updatePartyStatus('team1', 'score', 100);
```

#### Access Control
```typescript
// Check access
const canAccess = api.canAccessPile('player1', 'party', 'shared_cards', 'team1');

// Get visible cards
const cards = api.getVisibleCards('player1', 'party', 'shared_cards', 'team1');
```

## Examples

### Complete Game Implementations

- **[Team Hearts Example](../examples/team-hearts-example.ts)** - Full team-based Hearts implementation
- **[Basic Usage Examples](party-system-examples.md)** - Various party system usage patterns

### Test Files

- **[Team Hearts Tests](../tests/rulesets/team-hearts-ruleset.test.ts)** - Comprehensive test suite
- **[Party System Tests](../tests/integration/party-system.test.ts)** - Integration tests

## Architecture

### Party System Design

The party system is built on these core principles:

1. **Optional Integration**: Games work normally without parties
2. **Shared Resources**: Teams have collective card storage
3. **Access Control**: Only team members can access team resources
4. **Event Integration**: All party operations generate events
5. **Serialization Support**: Full save/load compatibility

### Data Flow

```
Participants → Parties → Shared Resources
     ↓            ↓           ↓
   Individual   Team      Party Piles
    Hands      Status    & Placements
```

## Advanced Topics

### Custom Team Mechanics

- Team abilities and special powers
- Dynamic team formation
- Team-based win conditions
- Complex resource sharing

### Performance Considerations

- Batch party operations
- Efficient event filtering
- Optimized access control checks
- Memory management for large teams

### Integration Patterns

- Ruleset integration
- UI/UX considerations
- Network synchronization
- State management

## Contributing

When contributing to the party system:

1. Follow existing patterns and conventions
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Consider backwards compatibility
5. Test with multiple team configurations

## Support

For questions, issues, or contributions related to the party system:

1. Check the examples and documentation first
2. Review existing test cases for usage patterns
3. Create issues for bugs or feature requests
4. Submit pull requests with tests and documentation

---

*This documentation covers BigDeckEnergy v1.0.0 and later. For older versions, please refer to the appropriate version tags.*