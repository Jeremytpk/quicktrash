// Firebase Database Schema for QuickTrash App
// This file documents the data structure used in Firestore

export const FirebaseSchema = {
  // Users Collection - stores all user data regardless of role
  users: {
    // Document ID: Firebase Auth UID
    example_user_id: {
      // Common fields for all users
      email: "user@example.com",
      displayName: "John Doe",
      phoneNumber: "+1234567890",
      role: "customer", // "customer", "contractor", "employee"
      createdAt: "timestamp",
      updatedAt: "timestamp",
      isActive: true,
      profilePicture: "url_to_image",
      
      // Customer-specific fields
      customerData: {
        addresses: [
          {
            id: "address_1",
            street: "123 Main St",
            city: "Atlanta",
            state: "GA",
            zipCode: "30309",
            coordinates: {
              latitude: 33.7490,
              longitude: -84.3880
            },
            isDefault: true,
            nickname: "Home"
          }
        ],
        paymentMethods: [
          {
            id: "payment_1",
            type: "card",
            last4: "1234",
            brand: "visa",
            isDefault: true
          }
        ],
        preferences: {
          notifications: true,
          preferredPickupTime: "morning", // "morning", "afternoon", "evening"
          autoRebook: false
        }
      },
      
      // Contractor-specific fields
      contractorData: {
        vehicleInfo: {
          type: "pickup_truck", // "pickup_truck", "van", "trailer"
          make: "Ford",
          model: "F-150",
          year: 2020,
          licensePlate: "ABC123",
          capacity: "1_ton"
        },
        bankAccount: {
          accountNumber: "****1234",
          routingNumber: "****5678",
          accountType: "checking"
        },
        verificationStatus: {
          backgroundCheck: "approved", // "pending", "approved", "rejected"
          driverLicense: "approved",
          insurance: "approved",
          vehicle: "approved"
        },
        availability: {
          isOnline: false,
          workingHours: {
            monday: { start: "08:00", end: "18:00", available: true },
            tuesday: { start: "08:00", end: "18:00", available: true },
            // ... other days
          },
          currentLocation: {
            latitude: 33.7490,
            longitude: -84.3880,
            timestamp: "timestamp"
          }
        },
        performance: {
          totalJobs: 25,
          rating: 4.8,
          completionRate: 98,
          totalEarnings: 1250.00
        }
      },
      
      // Employee-specific fields
      employeeData: {
        department: "operations", // "operations", "support", "admin"
        permissions: ["view_jobs", "manage_disputes", "approve_contractors"],
        employeeId: "EMP001"
      }
    }
  },
  
  // Jobs Collection - stores all pickup jobs
  jobs: {
    example_job_id: {
      // Basic job information
      customerId: "customer_user_id",
      contractorId: "contractor_user_id", // null if not assigned
      status: "pending", // "pending", "assigned", "in_progress", "completed", "cancelled"
      
      // Job details
      wasteType: "household", // "household", "bulk", "yard", "construction", "recyclables"
      volume: "3_bags", // "1-5_bags", "pickup_load", "trailer_load"
      description: "3 bags of household trash",
      
      // Location and timing
      pickupAddress: {
        street: "123 Main St",
        city: "Atlanta",
        state: "GA",
        zipCode: "30309",
        coordinates: {
          latitude: 33.7490,
          longitude: -84.3880
        },
        instructions: "Trash is by the garage door"
      },
      scheduledPickup: "timestamp", // null for ASAP
      isASAP: true,
      
      // Pricing
      pricing: {
        baseFee: 10.00,
        serviceFee: 3.00,
        disposalFee: 2.00,
        total: 15.00,
        contractorPayout: 12.00
      },
      
      // Photos and documentation
      photos: {
        beforePickup: [], // URLs to images
        afterPickup: [], // URLs to images
        disposalProof: [] // URLs to disposal receipts
      },
      
      // Timestamps
      createdAt: "timestamp",
      assignedAt: "timestamp",
      startedAt: "timestamp",
      completedAt: "timestamp",
      
      // Communication
      chatMessages: [], // Could be subcollection
      
      // Special services
      services: {
        weLoadService: false, // Premium service
        urgentPickup: false
      }
    }
  },
  
  // Chat Messages Subcollection (under jobs)
  chatMessages: {
    message_id: {
      senderId: "user_id",
      senderRole: "customer", // "customer", "contractor", "employee"
      message: "The trash is by the side door",
      timestamp: "timestamp",
      isRead: false,
      messageType: "text" // "text", "image", "location"
    }
  },
  
  // Disputes Collection
  disputes: {
    dispute_id: {
      jobId: "job_id",
      customerId: "customer_user_id",
      contractorId: "contractor_user_id",
      reportedBy: "customer", // "customer", "contractor"
      
      issue: "trash_more_than_described", // predefined categories
      description: "Customer had twice the amount described",
      priority: "medium", // "low", "medium", "high"
      status: "pending", // "pending", "investigating", "resolved"
      
      resolution: {
        resolvedBy: "employee_user_id",
        action: "refund_issued",
        notes: "Partial refund provided to customer",
        resolvedAt: "timestamp"
      },
      
      createdAt: "timestamp",
      updatedAt: "timestamp"
    }
  },
  
  // Ratings Collection
  ratings: {
    rating_id: {
      jobId: "job_id",
      raterId: "user_id",
      raterRole: "customer", // "customer", "contractor"
      ratedUserId: "user_id",
      
      rating: 5, // 1-5 stars
      review: "Great service, on time!",
      categories: {
        timeliness: 5,
        communication: 5,
        professionalism: 5
      },
      
      createdAt: "timestamp"
    }
  },
  
  // Notifications Collection
  notifications: {
    notification_id: {
      userId: "user_id",
      type: "job_assigned", // various types
      title: "New Job Assigned",
      message: "You have a new pickup job in your area",
      data: {
        jobId: "job_id",
        // other relevant data
      },
      isRead: false,
      createdAt: "timestamp"
    }
  },
  
  // App Configuration
  appConfig: {
    pricing: {
      baseFees: {
        household: 10.00,
        bulk: 25.00,
        yard: 15.00,
        construction: 35.00,
        recyclables: 8.00
      },
      serviceFeePercentage: 0.15, // 15%
      contractorPayoutPercentage: 0.80 // 80% to contractor
    },
    
    serviceAreas: [
      {
        city: "Atlanta",
        state: "GA",
        isActive: true,
        boundaries: {
          // Geofence coordinates
        }
      }
    ],
    
    disposalPartners: [
      {
        id: "partner_1",
        name: "Atlanta Waste Services",
        address: "456 Industrial Blvd",
        acceptedWasteTypes: ["household", "bulk"],
        hours: "6:00-18:00",
        isActive: true
      }
    ]
  }
};

// Firestore Security Rules Template
export const securityRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Jobs can be read by customer, assigned contractor, and employees
    match /jobs/{jobId} {
      allow read: if request.auth != null && (
        resource.data.customerId == request.auth.uid ||
        resource.data.contractorId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'employee'
      );
      
      allow create: if request.auth != null && request.auth.uid == request.resource.data.customerId;
      
      allow update: if request.auth != null && (
        request.auth.uid == resource.data.customerId ||
        request.auth.uid == resource.data.contractorId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'employee'
      );
    }
    
    // Chat messages within jobs
    match /jobs/{jobId}/chatMessages/{messageId} {
      allow read, create: if request.auth != null && (
        get(/databases/$(database)/documents/jobs/$(jobId)).data.customerId == request.auth.uid ||
        get(/databases/$(database)/documents/jobs/$(jobId)).data.contractorId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'employee'
      );
    }
    
    // Other collections with appropriate permissions...
  }
}
`;
