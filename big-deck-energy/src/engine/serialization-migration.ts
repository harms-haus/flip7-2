import { SerializedGameState } from './serialization';

/**
 * Version information for serialization formats
 */
export interface VersionInfo {
  /** Version string (semantic versioning) */
  version: string;
  
  /** Human-readable description of changes */
  description: string;
  
  /** Whether this version is backward compatible */
  backwardCompatible: boolean;
  
  /** Minimum version that can be migrated to this version */
  minimumMigrationVersion?: string;
}

/**
 * Migration function signature
 */
export type MigrationFunction = (data: any) => any;

/**
 * Migration definition
 */
export interface Migration {
  /** Source version */
  from: string;
  
  /** Target version */
  to: string;
  
  /** Migration function */
  migrate: MigrationFunction;
  
  /** Description of what this migration does */
  description: string;
}

/**
 * Serialization version registry and migration system
 */
export class SerializationVersionManager {
  private static readonly versions: Map<string, VersionInfo> = new Map();
  public static readonly migrations: Map<string, Migration> = new Map();

  /**
   * Register a serialization version
   */
  public static registerVersion(info: VersionInfo): void {
    this.versions.set(info.version, info);
  }

  /**
   * Register a migration between versions
   */
  public static registerMigration(migration: Migration): void {
    const key = `${migration.from}->${migration.to}`;
    this.migrations.set(key, migration);
  }

  /**
   * Get version information
   */
  public static getVersion(version: string): VersionInfo | undefined {
    return this.versions.get(version);
  }

  /**
   * Get all registered versions
   */
  public static getAllVersions(): VersionInfo[] {
    return Array.from(this.versions.values()).sort((a, b) => 
      this.compareVersions(a.version, b.version)
    );
  }

  /**
   * Check if a version is supported
   */
  public static isVersionSupported(version: string): boolean {
    return this.versions.has(version);
  }

  /**
   * Check if migration is possible from one version to another
   */
  public static canMigrate(fromVersion: string, toVersion: string): boolean {
    if (fromVersion === toVersion) return true;
    
    const migrationPath = this.findMigrationPath(fromVersion, toVersion);
    return migrationPath.length > 0;
  }

  /**
   * Migrate serialized data from one version to another
   */
  public static migrate(data: any, targetVersion: string): any {
    // Handle different data formats
    let currentVersion: string;
    if (data.version) {
      currentVersion = data.version;
    } else if (data.metadata && data.metadata.version) {
      currentVersion = data.metadata.version;
    } else {
      // Very old format without version
      currentVersion = '0.9.0';
    }
    
    if (currentVersion === targetVersion) {
      return data;
    }

    const migrationPath = this.findMigrationPath(currentVersion, targetVersion);
    if (migrationPath.length === 0) {
      throw new MigrationError(
        `No migration path found from version ${currentVersion} to ${targetVersion}`
      );
    }

    let migratedData: any = data;
    
    for (const migration of migrationPath) {
      try {
        migratedData = migration.migrate(migratedData);
        // Update version in the appropriate location
        if (migratedData.metadata) {
          migratedData.metadata.version = migration.to;
        } else {
          migratedData.version = migration.to;
        }
      } catch (error) {
        throw new MigrationError(
          `Migration failed from ${migration.from} to ${migration.to}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return migratedData;
  }

  /**
   * Find migration path between two versions
   */
  private static findMigrationPath(fromVersion: string, toVersion: string): Migration[] {
    if (fromVersion === toVersion) return [];

    // Simple direct migration check first
    const directMigration = this.migrations.get(`${fromVersion}->${toVersion}`);
    if (directMigration) {
      return [directMigration];
    }

    // Multi-step migration using breadth-first search
    const visited = new Set<string>();
    const queue: { version: string; path: Migration[] }[] = [
      { version: fromVersion, path: [] }
    ];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current.version)) {
        continue;
      }
      
      visited.add(current.version);
      
      // Check all possible migrations from current version
      for (const [key, migration] of this.migrations.entries()) {
        if (migration.from === current.version) {
          const newPath = [...current.path, migration];
          
          if (migration.to === toVersion) {
            return newPath; // Found target
          }
          
          // Add to queue for further exploration
          if (!visited.has(migration.to) && newPath.length < 10) { // Prevent infinite loops
            queue.push({ version: migration.to, path: newPath });
          }
        }
      }
    }

    return []; // No path found
  }

  /**
   * Compare two version strings (basic semantic versioning)
   */
  private static compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }
    
    return 0;
  }

  /**
   * Get compatibility information between versions
   */
  public static getCompatibilityInfo(fromVersion: string, toVersion: string): CompatibilityInfo {
    const fromInfo = this.getVersion(fromVersion);
    const toInfo = this.getVersion(toVersion);
    
    if (!fromInfo || !toInfo) {
      return {
        compatible: false,
        canMigrate: false,
        reason: `Unknown version: ${!fromInfo ? fromVersion : toVersion}`
      };
    }

    if (fromVersion === toVersion) {
      return {
        compatible: true,
        canMigrate: true,
        reason: 'Same version'
      };
    }

    const canMigrate = this.canMigrate(fromVersion, toVersion);
    const isBackwardCompatible = toInfo.backwardCompatible && 
      this.compareVersions(fromVersion, toVersion) <= 0;

    return {
      compatible: isBackwardCompatible,
      canMigrate,
      reason: canMigrate 
        ? 'Migration available' 
        : 'No migration path available'
    };
  }

  /**
   * Reset all registered versions and migrations (for testing)
   */
  public static reset(): void {
    this.versions.clear();
    this.migrations.clear();
  }
}

/**
 * Compatibility information between versions
 */
export interface CompatibilityInfo {
  /** Whether versions are directly compatible */
  compatible: boolean;
  
  /** Whether migration is possible */
  canMigrate: boolean;
  
  /** Reason for compatibility status */
  reason: string;
}

/**
 * Error thrown during migration operations
 */
export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

// Register supported versions
SerializationVersionManager.registerVersion({
  version: '1.0.0',
  description: 'Initial serialization format with full game state support',
  backwardCompatible: true
});

SerializationVersionManager.registerVersion({
  version: '2.0.0',
  description: 'Modern serialization with history support and improved backwards compatibility',
  backwardCompatible: true,
  minimumMigrationVersion: '1.0.0'
});

// Register migration from 1.0.0 to 2.0.0
SerializationVersionManager.registerMigration({
  from: '1.0.0',
  to: '2.0.0',
  description: 'Upgrade to modern format with metadata support',
  migrate: (data: any) => {
    // If it's already modern format, return as-is
    if (data.metadata) {
      return data;
    }
    
    // Convert older format to modern format
    const metadata = {
      version: '2.0.0',
      timestamp: Date.now(),
      libraryVersion: '1.0.0',
      format: 'full' as const
    };
    
    // Ensure the data has the correct structure
    let gameStateData = data;
    if (!data.version) {
      // Very old format without version - assume basic structure
      gameStateData = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: data
      };
    }
    
    return {
      metadata,
      gameState: gameStateData
    };
  }
});

// Register migration for pre-1.0.0 formats (legacy support)
SerializationVersionManager.registerVersion({
  version: '0.9.0',
  description: 'Legacy format before formal versioning',
  backwardCompatible: false,
  minimumMigrationVersion: '0.9.0'
});

SerializationVersionManager.registerMigration({
  from: '0.9.0',
  to: '1.0.0',
  description: 'Upgrade legacy format to versioned format',
  migrate: (data: any) => {
    // Legacy data might not have version field
    if (data.version) {
      return data;
    }
    
    // Wrap legacy data in versioned structure
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      data: {
        gameId: data.gameId || `legacy_game_${Date.now()}`,
        phase: data.phase || 'setup',
        gameboard: data.gameboard || { piles: [], placements: [], status: {} },
        participants: data.participants || [],
        hands: data.hands || [],
        events: data.events || [],
        metadata: data.metadata || {}
      }
    };
  }
});

// Register migration from 0.9.0 directly to 2.0.0 (multi-step)
SerializationVersionManager.registerMigration({
  from: '0.9.0',
  to: '2.0.0',
  description: 'Direct upgrade from legacy to modern format',
  migrate: (data: any) => {
    // First migrate to 1.0.0
    const migration1 = SerializationVersionManager.migrations.get('0.9.0->1.0.0');
    if (!migration1) {
      throw new Error('Missing migration from 0.9.0 to 1.0.0');
    }
    const v1Data = migration1.migrate(data);
    v1Data.version = '1.0.0';
    
    // Then migrate to 2.0.0
    const migration2 = SerializationVersionManager.migrations.get('1.0.0->2.0.0');
    if (!migration2) {
      throw new Error('Missing migration from 1.0.0 to 2.0.0');
    }
    return migration2.migrate(v1Data);
  }
});