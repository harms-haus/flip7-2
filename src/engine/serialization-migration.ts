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
  private static readonly migrations: Map<string, Migration> = new Map();

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
  public static migrate(data: SerializedGameState, targetVersion: string): SerializedGameState {
    const currentVersion = data.version;
    
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
        migratedData.version = migration.to;
      } catch (error) {
        throw new MigrationError(
          `Migration failed from ${migration.from} to ${migration.to}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return migratedData as SerializedGameState;
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

    // For now, only support direct migrations
    // Future enhancement: implement graph traversal for multi-step migrations
    return [];
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

// Register the current version
SerializationVersionManager.registerVersion({
  version: '1.0.0',
  description: 'Initial serialization format with full game state support',
  backwardCompatible: true
});

// Example migration (for future versions)
// SerializationVersionManager.registerMigration({
//   from: '1.0.0',
//   to: '1.1.0',
//   description: 'Add new metadata fields',
//   migrate: (data: any) => {
//     // Migration logic here
//     return {
//       ...data,
//       // Add new fields or transform existing ones
//     };
//   }
// });