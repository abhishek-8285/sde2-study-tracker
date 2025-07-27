# ⚙️ Activity Diagrams - Workflow & Process Guide

## 🎯 **Overview**

Activity diagrams show workflow and business process flows, making them essential for documenting algorithms, business processes, and user journeys. They're particularly valuable for understanding complex decision-making processes and parallel activities.

## 🧩 **Key Components**

### **Essential Elements**

- **Start/End Nodes**: Black circles (●) and circles with rings (⊙)
- **Activities**: Rounded rectangles representing actions
- **Decision Points**: Diamonds (◆) for if/else logic
- **Forks/Joins**: Black bars (▬) for parallel processing
- **Swimlanes**: Vertical/horizontal partitions for responsibilities

## 💡 **Real-World Examples**

### **Example 1: E-commerce Order Processing**

```mermaid
flowchart TD
    A[Order Placed] --> B{Payment Valid?}
    B -->|Yes| C[Reserve Inventory]
    B -->|No| D[Decline Order]
    C --> E{Items Available?}
    E -->|Yes| F[Charge Payment]
    E -->|No| G[Backorder Items]
    F --> H[Generate Shipping Label]
    G --> I[Notify Customer]
    H --> J[Update Order Status]
    I --> K[Wait for Restock]
    J --> L[Send Confirmation Email]
    K --> M{Items Restocked?}
    M -->|Yes| F
    M -->|No| N[Cancel Order]
    L --> O[Order Complete]
    D --> P[Send Decline Notice]
    N --> P

    style A fill:#90EE90
    style O fill:#FFB6C1
    style P fill:#FFB6C1
```

### **Example 2: User Registration with Swimlanes**

```mermaid
flowchart TD
    subgraph Customer
        A[Fill Registration Form]
        B[Verify Email]
        M[Start Using System]
    end

    subgraph "Registration System"
        C[Validate Form Data]
        D[Check Email Uniqueness]
        E[Send Verification Email]
        F[Create User Account]
    end

    subgraph "Email Service"
        G[Generate Verification Link]
        H[Send Email]
        I[Track Email Delivery]
    end

    subgraph "Database"
        J[Store User Data]
        K[Log Registration Event]
    end

    A --> C
    C --> D
    D --> E
    E --> G
    G --> H
    H --> I
    B --> F
    F --> J
    J --> K
    K --> M
```

## 🛠️ **Best Practices**

### **1. Keep It Focused**

- One main process per diagram
- Maximum 15-20 activities
- Use sub-processes for complex flows

### **2. Clear Decision Points**

- Use yes/no questions
- Show all possible paths
- Include error conditions

### **3. Swimlane Organization**

- Group by responsibility/role
- Keep related activities together
- Show clear handoffs between lanes

## 🏋️ **Practice Exercises**

1. **Model your team's code review process**
2. **Document a CI/CD pipeline**
3. **Map customer onboarding flow**
4. **Design algorithm flowchart**

## 🚀 **Next Steps**

Master activity diagrams, then advance to [State Diagrams](./03-state-diagrams.md) for object lifecycle modeling.
