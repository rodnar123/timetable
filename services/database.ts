export class TimetableDB {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'PNGUnitechTimetableDB';
  private readonly version = 3; // Incremented to ensure proper migration

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open database:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database opened successfully, version:', this.db.version);
        
        // Verify stores exist
        const expectedStores = [
          'departments', 'programs', 'courses', 'faculty', 'rooms',
          'timeSlots', 'students', 'substitutions', 'conflicts', 
          'academicCalendar', 'attendance', 'attendanceCodes'
        ];
        
        for (const store of expectedStores) {
          if (!this.db.objectStoreNames.contains(store)) {
            console.warn(`Store ${store} is missing!`);
          }
        }
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('Database upgrade needed from version', event.oldVersion, 'to', event.newVersion);
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;

        // Define all stores with their configurations
        const storeConfigs = {
          departments: { keyPath: 'id', indexes: ['createdAt', 'updatedAt'] },
          programs: { keyPath: 'id', indexes: ['createdAt', 'updatedAt', 'departmentId'] },
          courses: { 
            keyPath: 'id', 
            indexes: ['createdAt', 'updatedAt', 'departmentId', 'programId', 'semester', 'yearLevel'] 
          },
          faculty: { 
            keyPath: 'id', 
            indexes: ['createdAt', 'updatedAt', 'departmentId', { name: 'staffId', unique: true }] 
          },
          rooms: { 
            keyPath: 'id', 
            indexes: ['createdAt', 'updatedAt', 'departmentId', 'type', 'available'] 
          },
          timeSlots: { 
            keyPath: 'id', 
            indexes: [
              'createdAt', 'updatedAt', 'courseId', 'facultyId', 'roomId', 
              'dayOfWeek', 'academicYear', 'semester', 'yearLevel', 'departmentId',
              { name: 'composite', keyPath: ['academicYear', 'semester', 'dayOfWeek'] }
            ] 
          },
          students: { 
            keyPath: 'id', 
            indexes: [
              'createdAt', 'updatedAt', 'programId', 'currentYear',
              { name: 'studentId', unique: true }
            ] 
          },
          substitutions: { 
            keyPath: 'id', 
            indexes: ['createdAt', 'updatedAt', 'originalSlotId', 'date', 'status'] 
          },
          conflicts: { 
            keyPath: 'id', 
            indexes: ['createdAt', 'updatedAt', 'type', 'severity', 'resolved'] 
          },
          academicCalendar: { 
            keyPath: 'id', 
            indexes: ['createdAt', 'updatedAt', 'academicYear', 'semester'] 
          },
          attendance: { 
            keyPath: 'id', 
            indexes: [
              'createdAt', 'updatedAt', 'studentId', 'timeSlotId', 'courseId', 'date', 'status',
              { name: 'student_slot_date', keyPath: ['studentId', 'timeSlotId', 'date'], unique: true }
            ] 
          },
          attendanceCodes: { 
            keyPath: 'id', 
            indexes: ['createdAt', 'updatedAt', 'timeSlotId', 'courseId', 'date', 'code'] 
          }
        };

        // Create or update stores
        for (const [storeName, config] of Object.entries(storeConfigs)) {
          let store: IDBObjectStore;
          
          // Create store if it doesn't exist
          if (!db.objectStoreNames.contains(storeName)) {
            console.log('Creating store:', storeName);
            store = db.createObjectStore(storeName, { keyPath: config.keyPath });
          } else {
            // Get existing store
            store = transaction.objectStore(storeName);
          }

          // Create indexes
          for (const indexConfig of config.indexes) {
            if (typeof indexConfig === 'string') {
              // Simple index
              if (!store.indexNames.contains(indexConfig)) {
                console.log(`Creating index ${indexConfig} on ${storeName}`);
                store.createIndex(indexConfig, indexConfig, { unique: false });
              }
            } else {
              // Complex index with options
              if (!store.indexNames.contains(indexConfig.name)) {
                console.log(`Creating index ${indexConfig.name} on ${storeName}`);
                const keyPath = 'keyPath' in indexConfig ? indexConfig.keyPath : indexConfig.name;
                store.createIndex(indexConfig.name, keyPath, { 
                  unique: 'unique' in indexConfig ? indexConfig.unique : false 
                });
              }
            }
          }
        }

        // Special handling for data migration if upgrading from version 1 or 2
        if (event.oldVersion < 3) {
          console.log('Performing data migration for version 3...');
          
          // Ensure yearLevel exists on all timeslots
          if (db.objectStoreNames.contains('timeSlots')) {
            const timeSlotStore = transaction.objectStore('timeSlots');
            const cursorRequest = timeSlotStore.openCursor();
            
            cursorRequest.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest).result;
              if (cursor) {
                const timeSlot = cursor.value;
                if (timeSlot.yearLevel === undefined || timeSlot.yearLevel === null) {
                  timeSlot.yearLevel = 1; // Default to year 1
                  cursor.update(timeSlot);
                  console.log('Updated timeslot with yearLevel:', timeSlot.id);
                }
                cursor.continue();
              }
            };
          }
        }
      };
    });
  }

  // Check if a store exists
  hasStore(storeName: string): boolean {
    return this.db ? this.db.objectStoreNames.contains(storeName) : false;
  }

  // Generic CRUD operations with better error handling
  async create<T extends { id: string; createdAt: Date; updatedAt: Date }>(
    storeName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');
    
    const item = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as T;

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        // Ensure all date fields are Date objects
        const processedItem = this.ensureDates<T>(item);
        
        const request = store.add(processedItem);

        request.onsuccess = () => {
          console.log(`Successfully created item in ${storeName}:`, processedItem.id);
          resolve(processedItem as T);
        };
        
        request.onerror = () => {
          console.error(`Error creating item in ${storeName}:`, request.error);
          reject(request.error);
        };

        transaction.onerror = () => {
          console.error(`Transaction error in ${storeName}:`, transaction.error);
          reject(transaction.error);
        };

        transaction.oncomplete = () => {
          console.log(`Transaction completed for creating item in ${storeName}`);
        };
      } catch (error) {
        console.error(`Error creating item in ${storeName}:`, error);
        reject(error);
      }
    });
  }

  async update<T extends { id: string; updatedAt: Date }>(
    storeName: string,
    id: string,
    data: Partial<T>
  ): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const existing = getRequest.result;
          if (!existing) {
            console.warn(`Item with id ${id} not found in ${storeName}`);
            resolve(null);
            return;
          }

          const updated = {
            ...existing,
            ...data,
            id,
            updatedAt: new Date()
          };

          // Ensure all date fields are Date objects
          const processedItem = this.ensureDates(updated);

          const putRequest = store.put(processedItem);
          
          putRequest.onsuccess = () => {
            console.log(`Successfully updated item in ${storeName}:`, id);
            resolve(processedItem as T);
          };
          
          putRequest.onerror = () => {
            console.error(`Error updating item in ${storeName}:`, putRequest.error);
            reject(putRequest.error);
          };
        };

        getRequest.onerror = () => {
          console.error(`Error getting item for update in ${storeName}:`, getRequest.error);
          reject(getRequest.error);
        };

        transaction.onerror = () => {
          console.error(`Transaction error in ${storeName}:`, transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        console.error(`Error updating item in ${storeName}:`, error);
        reject(error);
      }
    });
  }

  async delete(storeName: string, id: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => {
          console.log(`Successfully deleted item from ${storeName}:`, id);
          resolve(true);
        };
        
        request.onerror = () => {
          console.error(`Error deleting item from ${storeName}:`, request.error);
          reject(request.error);
        };

        transaction.onerror = () => {
          console.error(`Transaction error in ${storeName}:`, transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        console.error(`Error deleting item from ${storeName}:`, error);
        reject(error);
      }
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            resolve(this.ensureDates(result));
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error(`Error getting item from ${storeName}:`, request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error(`Error getting item from ${storeName}:`, error);
        reject(error);
      }
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Check if store exists
    if (!this.hasStore(storeName)) {
      console.warn(`Store ${storeName} does not exist, returning empty array`);
      return [];
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const results = request.result || [];
          console.log(`Retrieved ${results.length} items from ${storeName}`);
          
          // Ensure all date fields are Date objects
          const processedResults = results.map(item => this.ensureDates(item)) as T[];
          resolve(processedResults as T[]);
        };
        
        request.onerror = () => {
          console.error(`Error getting all items from ${storeName}:`, request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error(`Error getting all items from ${storeName}:`, error);
        reject(error);
      }
    });
  }

  async query<T>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);

        request.onsuccess = () => {
          const results = request.result || [];
          // Ensure all date fields are Date objects
          const processedResults = results.map(item => this.ensureDates(item));
          resolve(processedResults as T[]);
        };
        
        request.onerror = () => {
          console.error(`Error querying ${storeName} by ${indexName}:`, request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error(`Error querying ${storeName} by ${indexName}:`, error);
        reject(error);
      }
    });
  }

  // Helper method to ensure date fields are Date objects
  private ensureDates<T>(item: any): T {
    const dateFields = ['createdAt', 'updatedAt', 'date', 'enrollmentDate', 'markedAt', 'expiresAt'];
    const processed = { ...item };
    
    for (const field of dateFields) {
      if (processed[field] && !(processed[field] instanceof Date)) {
        processed[field] = new Date(processed[field]);
      }
    }
    
    return processed as T;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Export data with better error handling
  async exportData(): Promise<string> {
    const stores = [
      'departments', 'programs', 'courses', 'faculty', 'rooms',
      'timeSlots', 'students', 'substitutions', 'academicCalendar', 
      'attendance', 'attendanceCodes'
    ];

    const data: any = {};

    for (const storeName of stores) {
      if (this.hasStore(storeName)) {
        try {
          data[storeName] = await this.getAll(storeName);
          console.log(`Exported ${data[storeName].length} items from ${storeName}`);
        } catch (error) {
          console.error(`Error exporting ${storeName}:`, error);
          data[storeName] = [];
        }
      }
    }

    return JSON.stringify(data, null, 2);
  }

  // Import data with better validation
  async importData(jsonData: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    let data: any;
    try {
      data = JSON.parse(jsonData);
    } catch (error) {
      throw new Error('Invalid JSON data');
    }

    const importResults: { store: string; imported: number; errors: number }[] = [];

    for (const [storeName, items] of Object.entries(data)) {
      if (!this.hasStore(storeName)) {
        console.warn(`Store ${storeName} does not exist, skipping import`);
        continue;
      }
      
      let imported = 0;
      let errors = 0;

      try {
        // Clear existing data
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        await new Promise<void>((resolve, reject) => {
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => resolve();
          clearRequest.onerror = () => reject(clearRequest.error);
        });

        // Add imported data
        for (const item of items as any[]) {
          try {
            // Ensure dates are properly formatted
            const processedItem = this.ensureDates(item);
            
            await new Promise<void>((resolve, reject) => {
              const addRequest = store.add(processedItem);
              addRequest.onsuccess = () => {
                imported++;
                resolve();
              };
              addRequest.onerror = () => {
                errors++;
                console.error(`Error importing item to ${storeName}:`, addRequest.error);
                reject(addRequest.error);
              };
            });
          } catch (error) {
            errors++;
            console.error(`Error importing item to ${storeName}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error importing to ${storeName}:`, error);
      }

      importResults.push({ store: storeName, imported, errors });
    }

    // Log import summary
    console.log('Import summary:');
    importResults.forEach(result => {
      console.log(`${result.store}: ${result.imported} imported, ${result.errors} errors`);
    });
  }

  // Verify database integrity
  async verifyIntegrity(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    if (!this.db) {
      issues.push('Database not initialized');
      return { isValid: false, issues };
    }

    const expectedStores = [
      'departments', 'programs', 'courses', 'faculty', 'rooms',
      'timeSlots', 'students', 'substitutions', 'conflicts', 
      'academicCalendar', 'attendance', 'attendanceCodes'
    ];

    // Check stores
    for (const store of expectedStores) {
      if (!this.hasStore(store)) {
        issues.push(`Missing store: ${store}`);
      }
    }

    // Check data integrity
    try {
      // Check timeslots have required fields
      const timeSlots = await this.getAll<any>('timeSlots');
      timeSlots.forEach((slot, index) => {
        if (!slot.yearLevel && slot.yearLevel !== 0) {
          issues.push(`TimeSlot at index ${index} missing yearLevel`);
        }
        if (!slot.academicYear) {
          issues.push(`TimeSlot at index ${index} missing academicYear`);
        }
        if (!slot.semester && slot.semester !== 0) {
          issues.push(`TimeSlot at index ${index} missing semester`);
        }
      });
    } catch (error) {
      issues.push(`Error checking timeslots: ${error}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // Clear database (use with caution!)
  async clearDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    return new Promise((resolve, reject) => {
      const deleteReq = indexedDB.deleteDatabase(this.dbName);
      
      deleteReq.onsuccess = () => {
        console.log('Database deleted successfully');
        resolve();
      };
      
      deleteReq.onerror = () => {
        console.error('Failed to delete database');
        reject(new Error('Failed to delete database'));
      };
      
      deleteReq.onblocked = () => {
        console.warn('Database deletion blocked');
        reject(new Error('Database deletion blocked - close all connections'));
      };
    });
  }
}